import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, appointmentsTable, customersTable, servicesTable, staffTable } from "@workspace/db";
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

router.post("/appointments", async (req, res): Promise<void> => {
  const parsed = CreateAppointmentBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [service] = await db.select({ priceKes: servicesTable.priceKes }).from(servicesTable).where(eq(servicesTable.id, parsed.data.serviceId));
  const totalKes = service?.priceKes ?? 0;

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
  await db.update(appointmentsTable).set({ status: "cancelled" }).where(eq(appointmentsTable.id, params.data.id));
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
    }).where(eq(customersTable.id, appt.customerId));
  }

  // Update staff stats
  const [staffRow] = await db.select().from(staffTable).where(eq(staffTable.id, appt.staffId));
  await db.update(staffTable).set({
    completedServices: (staffRow?.completedServices ?? 0) + 1,
    revenueGenerated: (staffRow?.revenueGenerated ?? 0) + appt.totalKes,
  }).where(eq(staffTable.id, appt.staffId));

  res.json(CompleteAppointmentResponse.parse(await enrichAppointment(appt)));
});

export default router;
