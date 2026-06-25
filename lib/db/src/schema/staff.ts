import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const staffTable = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role").notNull().default("Barber"),
  bio: text("bio"),
  photoUrl: text("photo_url"),
  specializations: text("specializations").array().notNull().default([]),
  rating: real("rating"),
  commissionPct: integer("commission_pct").notNull().default(30),
  isActive: boolean("is_active").notNull().default(true),
  completedServices: integer("completed_services").notNull().default(0),
  revenueGenerated: integer("revenue_generated").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStaffSchema = createInsertSchema(staffTable).omit({ id: true, createdAt: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staffTable.$inferSelect;
