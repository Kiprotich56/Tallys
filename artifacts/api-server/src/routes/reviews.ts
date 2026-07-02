import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, reviewsTable, customersTable, servicesTable } from "@workspace/db";
import {
  ListReviewsQueryParams,
  ListReviewsResponse,
  ApproveReviewParams,
  ApproveReviewResponse,
  HideReviewParams,
  HideReviewResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";
import { z } from "zod/v4";

const router: IRouter = Router();

async function enrichReview(r: typeof reviewsTable.$inferSelect) {
  const [customer] = r.customerId
    ? await db.select({ name: customersTable.name }).from(customersTable).where(eq(customersTable.id, r.customerId))
    : [null];
  const [service] = r.serviceId
    ? await db.select({ name: servicesTable.name }).from(servicesTable).where(eq(servicesTable.id, r.serviceId))
    : [null];
  return {
    id: r.id,
    customerId: r.customerId ?? null,
<<<<<<< HEAD
    guestName: r.guestName ?? null,
=======
>>>>>>> 1783acb (Complete commission and review management features)
    serviceId: r.serviceId ?? null,
    staffId: r.staffId ?? null,
    rating: r.rating,
    comment: r.comment ?? null,
    status: r.status,
<<<<<<< HEAD
    customerName: customer?.name ?? r.guestName ?? null,
=======
    customerName: customer?.name ?? r.reviewerName ?? null,
>>>>>>> 1783acb (Complete commission and review management features)
    serviceName: service?.name ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/reviews", async (req, res): Promise<void> => {
  const parsed = ListReviewsQueryParams.safeParse(req.query);
  const filters = parsed.success ? parsed.data : {};

<<<<<<< HEAD
  let reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.status, "approved")).orderBy(desc(reviewsTable.createdAt));
=======
  let reviews = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.status, "approved"))
    .orderBy(desc(reviewsTable.createdAt));
>>>>>>> 1783acb (Complete commission and review management features)

  if (filters.serviceId) reviews = reviews.filter(r => r.serviceId === Number(filters.serviceId));
  if (filters.staffId) reviews = reviews.filter(r => r.staffId === Number(filters.staffId));

  res.json(ListReviewsResponse.parse(await Promise.all(reviews.map(enrichReview))));
});

<<<<<<< HEAD
router.post("/reviews", async (req, res): Promise<void> => {
  const { customerId, guestName, serviceId, staffId, rating, comment } = req.body;

  if (!customerId && !guestName) {
    res.status(400).json({ error: "Either customerId or guestName is required" });
    return;
  }
  if (!rating || typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "Rating must be a number between 1 and 5" });
    return;
  }

  const [review] = await db.insert(reviewsTable).values({
    customerId: customerId ?? null,
    guestName: guestName ?? null,
    serviceId: serviceId ?? null,
    staffId: staffId ?? null,
    rating,
    comment: comment ?? null,
    status: "pending",
  }).returning();

=======
const PublicReviewBody = z.object({
  name: z.string().min(1).max(100),
  serviceId: z.number().int().positive().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

router.post("/reviews/public", async (req, res): Promise<void> => {
  const parsed = PublicReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid review data. Name and rating (1-5) are required." });
    return;
  }
  const { name, serviceId, rating, comment } = parsed.data;
  const [review] = await db.insert(reviewsTable).values({
    reviewerName: name.trim(),
    serviceId: serviceId ?? null,
    rating,
    comment: comment?.trim() ?? null,
    status: "pending",
  }).returning();
  res.status(201).json(await enrichReview(review));
});

router.post("/reviews", async (req, res): Promise<void> => {
  const { customerId, serviceId, staffId, rating, comment } = req.body;
  if (!customerId || !rating) {
    res.status(400).json({ error: "customerId and rating are required" });
    return;
  }
  const [review] = await db.insert(reviewsTable).values({
    customerId: Number(customerId),
    serviceId: serviceId ? Number(serviceId) : null,
    staffId: staffId ? Number(staffId) : null,
    rating: Number(rating),
    comment: comment ?? null,
    status: "pending",
  }).returning();
>>>>>>> 1783acb (Complete commission and review management features)
  res.status(201).json(await enrichReview(review));
});

router.patch("/reviews/:id/approve", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [review] = await db.update(reviewsTable).set({ status: "approved" }).where(eq(reviewsTable.id, id)).returning();
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(ApproveReviewResponse.parse(await enrichReview(review)));
});

router.patch("/reviews/:id/hide", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const [review] = await db.update(reviewsTable).set({ status: "hidden" }).where(eq(reviewsTable.id, id)).returning();
  if (!review) { res.status(404).json({ error: "Review not found" }); return; }
  res.json(HideReviewResponse.parse(await enrichReview(review)));
});

router.get("/admin/reviews", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(reviewsTable).orderBy(desc(reviewsTable.createdAt));
  const enriched = await Promise.all(rows.map(enrichReview));
  res.json(enriched);
});

export default router;
