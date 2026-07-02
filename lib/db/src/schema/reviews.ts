import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"),
<<<<<<< HEAD
  guestName: text("guest_name"),
=======
  reviewerName: text("reviewer_name"),
>>>>>>> 1783acb (Complete commission and review management features)
  serviceId: integer("service_id"),
  staffId: integer("staff_id"),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true, status: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
