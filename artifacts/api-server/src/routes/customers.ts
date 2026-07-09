import { Router, type IRouter } from "express";
import { eq, ilike, or } from "drizzle-orm";
import { db, customersTable, appointmentsTable, servicesTable, staffTable } from "@workspace/db";
import {
  ListCustomersQueryParams,
  ListCustomersResponse,
  CreateCustomerBody,
  CreateCustomerResponse,
  GetCustomerParams,
  GetCustomerResponse,
  UpdateCustomerParams,
  UpdateCustomerBody,
  UpdateCustomerResponse,
  GetCustomerAppointmentsParams,
  GetCustomerAppointmentsResponse,
} from "@workspace/api-zod";
import { requireAdmin, requireAuth, requireOwnerOrAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function ownCustomerId(req: { params: { id?: string } }): number | null {
  const id = Number(req.params.id);
  return isNaN(id) ? null : id;
}

function mapCustomer(c: typeof customersTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email ?? null,
    gender: c.gender ?? null,
    birthday: c.birthday ?? null,
    loyaltyTier: c.loyaltyTier,
    loyaltyPoints: c.loyaltyPoints,
    totalVisits: c.totalVisits,
    totalSpentKes: c.totalSpentKes,
    adminNotes: c.adminNotes ?? null,
    lastInteraction: c.lastInteraction ? c.lastInteraction.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
  };
}

router.get("/customers", requireAdmin, async (req, res): Promise<void> => {
  const parsed = ListCustomersQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search : undefined;

  const customers = search
    ? await db.select().from(customersTable).where(
        or(
          ilike(customersTable.name, `%${search}%`),
          ilike(customersTable.phone, `%${search}%`),
          ilike(customersTable.email, `%${search}%`),
        )
      )
    : await db.select().from(customersTable).orderBy(customersTable.name);

  res.json(ListCustomersResponse.parse(customers.map(mapCustomer)));
});

router.post("/customers", requireAuth, async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  // Any authenticated user already has a customerId from registration, so this
  // path only serves callers without one yet (should not normally happen). To
  // prevent unauthorized profile tampering via a phone-based upsert, non-admin
  // callers may never mutate an existing customer record here — they only get
  // matched to it (or a fresh one is created).
  const existing = await db.select().from(customersTable).where(eq(customersTable.phone, parsed.data.phone)).limit(1);
  if (existing.length > 0) {
    if (req.session.role !== "admin" && req.session.customerId && req.session.customerId !== existing[0].id) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    if (req.session.role === "admin") {
      const updates: Partial<typeof customersTable.$inferInsert> = {};
      if (parsed.data.name && parsed.data.name !== existing[0].name) updates.name = parsed.data.name;
      if (parsed.data.email && parsed.data.email !== existing[0].email) updates.email = parsed.data.email;
      if (Object.keys(updates).length > 0) {
        const [updated] = await db.update(customersTable).set(updates).where(eq(customersTable.id, existing[0].id)).returning();
        res.status(200).json(CreateCustomerResponse.parse(mapCustomer(updated)));
        return;
      }
    }
    res.status(200).json(CreateCustomerResponse.parse(mapCustomer(existing[0])));
    return;
  }

  const [customer] = await db.insert(customersTable).values({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email ?? null,
    gender: parsed.data.gender ?? null,
    birthday: parsed.data.birthday ?? null,
  }).returning();
  res.status(201).json(CreateCustomerResponse.parse(mapCustomer(customer)));
});

router.get("/customers/:id", requireOwnerOrAdmin(ownCustomerId), async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(GetCustomerResponse.parse(mapCustomer(customer)));
});

router.patch("/customers/:id", requireOwnerOrAdmin(ownCustomerId), async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [customer] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, params.data.id)).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(UpdateCustomerResponse.parse(mapCustomer(customer)));
});

// Admin-only: update notes
router.patch("/customers/:id/notes", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { adminNotes } = req.body;
  try {
    const [customer] = await db.update(customersTable).set({ adminNotes: adminNotes ?? null }).where(eq(customersTable.id, id)).returning();
    if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
    res.json({ ok: true, adminNotes: customer.adminNotes ?? null });
  } catch (err) {
    req.log.error(err, "update notes error");
    res.status(500).json({ error: "Failed to update notes" });
  }
});

router.get("/customers/:id/appointments", requireOwnerOrAdmin(ownCustomerId), async (req, res): Promise<void> => {
  const params = GetCustomerAppointmentsParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }

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
    .where(eq(appointmentsTable.customerId, params.data.id))
    .orderBy(appointmentsTable.date);

  res.json(GetCustomerAppointmentsResponse.parse(rows.map(r => ({
    ...r,
    notes: r.notes ?? null,
    serviceName: r.serviceName ?? null,
    staffName: r.staffName ?? null,
    customerName: r.customerName ?? null,
    createdAt: r.createdAt.toISOString(),
  }))));
});

export default router;
