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

const router: IRouter = Router();

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
    createdAt: c.createdAt.toISOString(),
  };
}

function getTier(visits: number): string {
  if (visits >= 30) return "Platinum";
  if (visits >= 15) return "Gold";
  if (visits >= 5) return "Silver";
  return "Bronze";
}

router.get("/customers", async (req, res): Promise<void> => {
  const parsed = ListCustomersQueryParams.safeParse(req.query);
  const search = parsed.success ? parsed.data.search : undefined;

  const customers = search
    ? await db.select().from(customersTable).where(
        or(ilike(customersTable.name, `%${search}%`), ilike(customersTable.phone, `%${search}%`))
      )
    : await db.select().from(customersTable).orderBy(customersTable.name);

  res.json(ListCustomersResponse.parse(customers.map(mapCustomer)));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [customer] = await db.insert(customersTable).values({
    name: parsed.data.name,
    phone: parsed.data.phone,
    email: parsed.data.email ?? null,
    gender: parsed.data.gender ?? null,
    birthday: parsed.data.birthday ?? null,
  }).returning();
  res.status(201).json(CreateCustomerResponse.parse(mapCustomer(customer)));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.id));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(GetCustomerResponse.parse(mapCustomer(customer)));
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = UpdateCustomerParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateCustomerBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [customer] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, params.data.id)).returning();
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(UpdateCustomerResponse.parse(mapCustomer(customer)));
});

router.get("/customers/:id/appointments", async (req, res): Promise<void> => {
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
