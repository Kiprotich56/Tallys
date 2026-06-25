import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, reviewsTable, customersTable, servicesTable } from "@workspace/db";
import {
  ListReviewsQueryParams,
  ListReviewsResponse,
  CreateReviewBody,
  CreateReviewResponse,
  ApproveReviewParams,
  ApproveReviewResponse,
  HideReviewParams,
  HideReviewResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function enrichReview(r: typeof reviewsTable.$inferSelect) {
  const [customer] = r.customerId ? await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, r.customerId)) : [null];
  const [service] = r.serviceId ? await db.select({ name: servicesTable.name }).from(servicesTable).where(eq(servicesTable.id, r.serviceId)) : [null];
  return {
    id: r.id,
    customerId: r.customerId,
    serviceId: r.serviceId ?? null,
    staffId: r.staffId ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
    customerName: customer?.name ?? null,
    serviceName: service?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  const filters = parsed.success ? parsed.data : {};

  let reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.status, "approved")).orderBy(reviewsTable.createdAt);

  if (filters.serviceId) reviews = reviews.filter(r => r.serviceId === Number(filters.serviceId));
  if (filters.staffId) reviews = reviews.filter(r => r.staffId === Number(filters.staffId));

  res.json(ListReviewsResponse.parse(await Promise.all(reviews.map(enrichReview))));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [review] = await db.insert(reviewsTable).values({
    customerId: parsed.data.customerId,
    serviceId: parsed.data.serviceId ?? null,
    staffId: parsed.data.staffId ?? null,
    rating: parsed.data.rating,
    comment: parsed.data.comment ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(CreateReviewResponse.parse(await enrichReview(review)));
});

router.patch("/reviews/:id/approve", async (req, res): Promise<void> => {
  const params = ApproveReviewParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [review] = await db.update(reviewsTable).set({ status: "approved" }).where(eq(reviewsTable.id, params.data.id)).returning();
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(ApproveReviewResponse.parse(await enrichReview(review)));
});

router.patch("/reviews/:id/hide", async (req, res): Promise<void> => {
  const params = HideReviewParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [review] = await db.update(reviewsTable).set({ status: "hidden" }).where(eq(reviewsTable.id, params.data.id)).returning();
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(HideReviewResponse.parse(await enrichReview(review)));
});

export default router;
