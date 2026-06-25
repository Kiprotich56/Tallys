import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import { db, servicesTable } from "@workspace/db";
import {
  ListServicesQueryParams,
  ListServicesResponse,
  CreateServiceBody,
  CreateServiceResponse,
  GetServiceParams,
  GetServiceResponse,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/services", async (req, res): Promise<void> => {
  const parsed = ListServicesQueryParams.safeParse(req.query);
  const category = parsed.success ? parsed.data.category : undefined;

  const services = category
    ? await db.select().from(servicesTable).where(eq(servicesTable.category, category))
    : await db.select().from(servicesTable).orderBy(servicesTable.category, servicesTable.name);

  res.json(ListServicesResponse.parse(services.map(s => ({
    ...s,
    description: s.description ?? null,
    createdAt: s.createdAt.toISOString(),
  }))));
});

router.post("/services", async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db.insert(servicesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    priceKes: parsed.data.priceKes,
    durationMinutes: parsed.data.durationMinutes,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(CreateServiceResponse.parse({
    ...service,
    description: service.description ?? null,
    createdAt: service.createdAt.toISOString(),
  }));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(GetServiceResponse.parse({ ...service, description: service.description ?? null, createdAt: service.createdAt.toISOString() }));
});

router.patch("/services/:id", async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [service] = await db.update(servicesTable).set(parsed.data).where(eq(servicesTable.id, params.data.id)).returning();
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(UpdateServiceResponse.parse({ ...service, description: service.description ?? null, createdAt: service.createdAt.toISOString() }));
});

router.delete("/services/:id", async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
