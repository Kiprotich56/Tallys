import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  db, appointmentsTable, customersTable, servicesTable, staffTable,
  commissionsTable, serviceCommissionsTable,
} from "@workspace/db";
import {
  ListAppointmentsQueryParams,
  ListAppointmentsResponse,
  CreateAppointmentBody,
  CreateAppointmentResponse,
  GetAppointmentParams,
  GetAppointmentResponse,
  UpdateAppointmentParams,
  UpdateAppointmentBody,
  UpdateAppointmentResponse,
  CancelAppointmentParams,
  ConfirmAppointmentParams,
  ConfirmAppointmentResponse,
  CompleteAppointmentParams,
  CompleteAppointmentResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { bookingLimiter } from "../lib/rate-limit";
import { sendEmail, bookingConfirmationEmail, bookingCancellationEmail } from "../lib/email";

const router: IRouter = Router();

async function enrichAppointment(appt: typeof appointmentsTable.$inferSelect) {
  const [service] = await db.select({ name: servicesTable.name }).from(servicesTable).where(eq(servicesTable.id, appt.serviceId));
  const [staff] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, appt.staffId));
  const [customer] = await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, appt.customerId));
  return {
    id: appt.id,
    customerId: appt.customerId,
    serviceId: appt.serviceId,
    staffId: appt.staffId,
    date: appt.date,
    timeSlot: appt.timeSlot,
    status: appt.status,
    notes: appt.notes ?? null,
    totalKes: appt.totalKes,
    customerName: customer?.name ?? null,
    serviceName: service?.name ?? null,
    staffName: staff?.name ?? null,
    createdAt: appt.createdAt.toISOString(),
  };
}

router.get("/appointments", async (req, res): Promise<void> => {
  const parsed = ListAppointmentsQueryParams.safeParse(req.query);
  const filters = parsed.success ? parsed.data : {};

  const rows = await db
    .select({
      id: appointmentsTable.id,
      customerId: appointmentsTable.customerId,
      serviceId: appointmentsTable.serviceId,
      staffId: appointmentsTable.staffId,
      date: appointmentsTable.date,
      timeSlot: appointmentsTable.timeSlot,
      status: appointmentsTable.status,
      notes: appointmentsTable.notes,
      totalKes: appointmentsTable.totalKes,
      createdAt: appointmentsTable.createdAt,
      serviceName: servicesTable.name,
      staffName: staffTable.name,
      customerName: customersTable.name,
    })
    .from(appointmentsTable)
    .leftJoin(servicesTable, eq(appointmentsTable.serviceId, servicesTable.id))
    .leftJoin(staffTable, eq(appointmentsTable.staffId, staffTable.id))
    .leftJoin(customersTable, eq(appointmentsTable.customerId, customersTable.id))
    .orderBy(appointmentsTable.date);

  let filtered = rows;
  if (filters.status) filtered = filtered.filter(r => r.status === filters.status);
  if (filters.date) filtered = filtered.filter(r => r.date === filters.date);
  if (filters.staffId) filtered = filtered.filter(r => r.staffId === Number(filters.staffId));

  res.json(ListAppointmentsResponse.parse(filtered.map(r => ({
    ...r,
    notes: r.notes ?? null,
    serviceName: r.serviceName ?? null,
    staffName: r.staffName ?? null,
    customerName: r.customerName ?? null,
    createdAt: r.createdAt.toISOString(),
  }))));
});

router.post("/appointments", requireAuth, bookingLimiter, async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, parsed.data.serviceId));
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  const totalKes = service.priceKes ?? 0;

  // Check for double booking
  const existing = await db.select({ id: appointmentsTable.id })
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.staffId, parsed.data.staffId),
        eq(appointmentsTable.date, parsed.data.date),
        eq(appointmentsTable.timeSlot, parsed.data.timeSlot),
      )
    ).limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "This time slot is already booked. Please choose another time." });
    return;
  }

  const [appt] = await db.insert(appointmentsTable).values({
    customerId: parsed.data.customerId,
    serviceId: parsed.data.serviceId,
    staffId: parsed.data.staffId,
    date: parsed.data.date,
    timeSlot: parsed.data.timeSlot,
    notes: parsed.data.notes ?? null,
    totalKes,
    status: "pending",
  }).returning();

  // Update customer last interaction
  db.update(customersTable).set({ lastInteraction: new Date() }).where(eq(customersTable.id, parsed.data.customerId)).catch(() => {});

  // Send confirmation email asynchronously
  const [customer] = await db.select({ email: customersTable.email, name: customersTable.name }).from(customersTable).where(eq(customersTable.id, parsed.data.customerId));
  const [staffRow] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, parsed.data.staffId));

  if (customer?.email) {
    const emailContent = bookingConfirmationEmail({
      customerName: customer.name,
      serviceName: service.name,
      staffName: staffRow?.name ?? "Our team",
      date: parsed.data.date,
      timeSlot: parsed.data.timeSlot,
      totalKes,
    });
    sendEmail({ to: customer.email, ...emailContent }).catch(() => {});
  }

  res.status(201).json(CreateAppointmentResponse.parse(await enrichAppointment(appt)));
});

router.get("/appointments/:id", async (req, res): Promise<void> => {
  const params = GetAppointmentParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(GetAppointmentResponse.parse(await enrichAppointment(appt)));
});

router.patch("/appointments/:id", async (req, res): Promise<void> => {
  const params = UpdateAppointmentParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [appt] = await db.update(appointmentsTable).set(parsed.data).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(UpdateAppointmentResponse.parse(await enrichAppointment(appt)));
});

router.delete("/appointments/:id", async (req, res): Promise<void> => {
  const params = CancelAppointmentParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

  const [appt] = await db.select().from(appointmentsTable).where(eq(appointmentsTable.id, params.data.id));
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }

  await db.update(appointmentsTable).set({ status: "cancelled" }).where(eq(appointmentsTable.id, params.data.id));

  // Send cancellation email
  const [customer] = await db.select({ email: customersTable.email, name: customersTable.name }).from(customersTable).where(eq(customersTable.id, appt.customerId));
  const [service] = await db.select({ name: servicesTable.name }).from(servicesTable).where(eq(servicesTable.id, appt.serviceId));
  if (customer?.email) {
    const emailContent = bookingCancellationEmail({
      customerName: customer.name,
      serviceName: service?.name ?? "Service",
      date: appt.date,
      timeSlot: appt.timeSlot,
    });
    sendEmail({ to: customer.email, ...emailContent }).catch(() => {});
  }

  res.sendStatus(204);
});

router.patch("/appointments/:id/confirm", async (req, res): Promise<void> => {
  const params = ConfirmAppointmentParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [appt] = await db.update(appointmentsTable).set({ status: "confirmed" }).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }
  res.json(ConfirmAppointmentResponse.parse(await enrichAppointment(appt)));
});

router.patch("/appointments/:id/complete", async (req, res): Promise<void> => {
  const params = CompleteAppointmentParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [appt] = await db.update(appointmentsTable).set({ status: "completed" }).where(eq(appointmentsTable.id, params.data.id)).returning();
  if (!appt) { res.status(404).json({ error: "Appointment not found" }); return; }

  // Update customer stats
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, appt.customerId));
  if (customer) {
    const newVisits = customer.totalVisits + 1;
    const newSpent = customer.totalSpentKes + appt.totalKes;
    const tier = newVisits >= 30 ? "Platinum" : newVisits >= 15 ? "Gold" : newVisits >= 5 ? "Silver" : "Bronze";
    await db.update(customersTable).set({
      totalVisits: newVisits,
      totalSpentKes: newSpent,
      loyaltyTier: tier,
      loyaltyPoints: customer.loyaltyPoints + Math.floor(appt.totalKes / 100),
      lastInteraction: new Date(),
    }).where(eq(customersTable.id, appt.customerId));
  }

  // Update staff stats
  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, appt.staffId));
  if (staffRow) {
    await db.update(staffTable).set({
      completedServices: (staffRow.completedServices ?? 0) + 1,
      revenueGenerated: (staffRow.revenueGenerated ?? 0) + appt.totalKes,
    }).where(eq(staffTable.id, appt.staffId));
  }

  // Calculate and record commission
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, appt.serviceId));
  if (service && staffRow) {
    // Priority: service-specific > barber-specific > default (30%)
    let commissionPct = staffRow.commissionPct ?? 30;
    const [serviceRate] = await db.select().from(serviceCommissionsTable)
      .where(eq(serviceCommissionsTable.serviceId, appt.serviceId)).limit(1);
    if (serviceRate) commissionPct = serviceRate.commissionPct;

    const commissionAmountKes = Math.round(appt.totalKes * commissionPct / 100);
    const salonAmountKes = appt.totalKes - commissionAmountKes;

    await db.insert(commissionsTable).values({
      appointmentId: appt.id,
      staffId: appt.staffId,
      customerId: appt.customerId,
      serviceId: appt.serviceId,
      servicePriceKes: appt.totalKes,
      commissionPct,
      commissionAmountKes,
      salonAmountKes,
      paymentStatus: "pending",
      completedAt: new Date(),
    });
  }

  res.json(CompleteAppointmentResponse.parse(await enrichAppointment(appt)));
});

export default router;
