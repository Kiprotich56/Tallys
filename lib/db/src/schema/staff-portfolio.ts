import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { staffTable } from "./staff";

export const staffPortfolioTable = pgTable("staff_portfolio", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().references(() => staffTable.id, { onDelete: "cascade" }),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertStaffPortfolioSchema = createInsertSchema(staffPortfolioTable).omit({ id: true, createdAt: true });
export type InsertStaffPortfolio = z.infer<typeof insertStaffPortfolioSchema>;
export type StaffPortfolio = typeof staffPortfolioTable.$inferSelect;
