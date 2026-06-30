import { pgTable, text, serial, timestamp, integer, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { appointmentsTable } from "./appointments";
import { staffTable } from "./staff";
import { customersTable } from "./customers";
import { servicesTable } from "./services";

export const commissionsTable = pgTable("commissions", {
  id: serial("id").primaryKey(),
  appointmentId: integer("appointment_id").notNull().references(() => appointmentsTable.id),
  staffId: integer("staff_id").notNull().references(() => staffTable.id),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id),
  servicePriceKes: integer("service_price_kes").notNull(),
  commissionPct: real("commission_pct").notNull(),
  commissionAmountKes: integer("commission_amount_kes").notNull(),
  salonAmountKes: integer("salon_amount_kes").notNull(),
  paymentStatus: text("payment_status").notNull().default("pending"),
  paymentDate: timestamp("payment_date", { withTimezone: true }),
  paymentNotes: text("payment_notes"),
  completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const serviceCommissionsTable = pgTable("service_commissions", {
  id: serial("id").primaryKey(),
  serviceId: integer("service_id").notNull().references(() => servicesTable.id, { onDelete: "cascade" }),
  commissionPct: real("commission_pct").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCommissionSchema = createInsertSchema(commissionsTable).omit({ id: true, createdAt: true });
export type InsertCommission = z.infer<typeof insertCommissionSchema>;
export type Commission = typeof commissionsTable.$inferSelect;
