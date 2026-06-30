import { Router, type IRouter } from "express";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { db, commissionsTable, staffTable, customersTable, servicesTable, serviceCommissionsTable, appointmentsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function mapCommission(c: any) {
  return {
    id: c.id,
    appointmentId: c.appointmentId,
    staffId: c.staffId,
    staffName: c.staffName ?? null,
    customerId: c.customerId,
    customerName: c.customerName ?? null,
    serviceId: c.serviceId,
    serviceName: c.serviceName ?? null,
    servicePriceKes: c.servicePriceKes,
    commissionPct: c.commissionPct,
    commissionAmountKes: c.commissionAmountKes,
    salonAmountKes: c.salonAmountKes,
    paymentStatus: c.paymentStatus,
    paymentDate: c.paymentDate ? new Date(c.paymentDate).toISOString() : null,
    paymentNotes: c.paymentNotes ?? null,
    completedAt: new Date(c.completedAt).toISOString(),
    createdAt: new Date(c.createdAt).toISOString(),
  };
}

// List commissions with filters
router.get("/commissions", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { staffId, startDate, endDate, paymentStatus } = req.query as Record<string, string>;

    const rows = await db
      .select({
        id: commissionsTable.id,
        appointmentId: commissionsTable.appointmentId,
        staffId: commissionsTable.staffId,
        customerId: commissionsTable.customerId,
        serviceId: commissionsTable.serviceId,
        servicePriceKes: commissionsTable.servicePriceKes,
        commissionPct: commissionsTable.commissionPct,
        commissionAmountKes: commissionsTable.commissionAmountKes,
        salonAmountKes: commissionsTable.salonAmountKes,
        paymentStatus: commissionsTable.paymentStatus,
        paymentDate: commissionsTable.paymentDate,
        paymentNotes: commissionsTable.paymentNotes,
        completedAt: commissionsTable.completedAt,
        createdAt: commissionsTable.createdAt,
        staffName: staffTable.name,
        customerName: customersTable.name,
        serviceName: servicesTable.name,
      })
      .from(commissionsTable)
      .leftJoin(staffTable, eq(commissionsTable.staffId, staffTable.id))
      .leftJoin(customersTable, eq(commissionsTable.customerId, customersTable.id))
      .leftJoin(servicesTable, eq(commissionsTable.serviceId, servicesTable.id))
      .orderBy(desc(commissionsTable.completedAt));

    let filtered = rows;
    if (staffId) filtered = filtered.filter(r => r.staffId === Number(staffId));
    if (paymentStatus) filtered = filtered.filter(r => r.paymentStatus === paymentStatus);
    if (startDate) filtered = filtered.filter(r => r.completedAt >= new Date(startDate));
    if (endDate) filtered = filtered.filter(r => r.completedAt <= new Date(endDate));

    res.json(filtered.map(mapCommission));
  } catch (err) {
    req.log.error(err, "list commissions error");
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

// Commission dashboard/summary
router.get("/commissions/summary", requireAdmin, async (req, res): Promise<void> => {
  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const all = await db
      .select({
        commissionAmountKes: commissionsTable.commissionAmountKes,
        salonAmountKes: commissionsTable.salonAmountKes,
        servicePriceKes: commissionsTable.servicePriceKes,
        completedAt: commissionsTable.completedAt,
        paymentStatus: commissionsTable.paymentStatus,
        staffId: commissionsTable.staffId,
        staffName: staffTable.name,
        serviceId: commissionsTable.serviceId,
        serviceName: servicesTable.name,
      })
      .from(commissionsTable)
      .leftJoin(staffTable, eq(commissionsTable.staffId, staffTable.id))
      .leftJoin(servicesTable, eq(commissionsTable.serviceId, servicesTable.id));

    const today = all.filter(r => r.completedAt >= todayStart);
    const week = all.filter(r => r.completedAt >= weekStart);
    const month = all.filter(r => r.completedAt >= monthStart);

    const sum = (arr: typeof all, key: "commissionAmountKes" | "salonAmountKes" | "servicePriceKes") =>
      arr.reduce((acc, r) => acc + (r[key] ?? 0), 0);

    // Revenue by barber
    const byBarber: Record<number, { name: string; total: number; commission: number; salon: number }> = {};
    for (const r of all) {
      if (!r.staffId) continue;
      if (!byBarber[r.staffId]) byBarber[r.staffId] = { name: r.staffName ?? "Unknown", total: 0, commission: 0, salon: 0 };
      byBarber[r.staffId].total += r.servicePriceKes ?? 0;
      byBarber[r.staffId].commission += r.commissionAmountKes ?? 0;
      byBarber[r.staffId].salon += r.salonAmountKes ?? 0;
    }

    // Revenue by service
    const byService: Record<number, { name: string; total: number; count: number }> = {};
    for (const r of all) {
      if (!r.serviceId) continue;
      if (!byService[r.serviceId]) byService[r.serviceId] = { name: r.serviceName ?? "Unknown", total: 0, count: 0 };
      byService[r.serviceId].total += r.servicePriceKes ?? 0;
      byService[r.serviceId].count += 1;
    }

    // Monthly trend (last 6 months)
    const trendMap: Record<string, { revenue: number; commission: number; salon: number }> = {};
    for (const r of all) {
      const key = `${r.completedAt.getFullYear()}-${String(r.completedAt.getMonth() + 1).padStart(2, "0")}`;
      if (!trendMap[key]) trendMap[key] = { revenue: 0, commission: 0, salon: 0 };
      trendMap[key].revenue += r.servicePriceKes ?? 0;
      trendMap[key].commission += r.commissionAmountKes ?? 0;
      trendMap[key].salon += r.salonAmountKes ?? 0;
    }

    res.json({
      today: {
        revenue: sum(today, "servicePriceKes"),
        commission: sum(today, "commissionAmountKes"),
        salon: sum(today, "salonAmountKes"),
        count: today.length,
      },
      week: {
        revenue: sum(week, "servicePriceKes"),
        commission: sum(week, "commissionAmountKes"),
        salon: sum(week, "salonAmountKes"),
        count: week.length,
      },
      month: {
        revenue: sum(month, "servicePriceKes"),
        commission: sum(month, "commissionAmountKes"),
        salon: sum(month, "salonAmountKes"),
        count: month.length,
      },
      total: {
        revenue: sum(all, "servicePriceKes"),
        commission: sum(all, "commissionAmountKes"),
        salon: sum(all, "salonAmountKes"),
        count: all.length,
        pending: all.filter(r => r.paymentStatus === "pending").reduce((acc, r) => acc + r.commissionAmountKes, 0),
        paid: all.filter(r => r.paymentStatus === "paid").reduce((acc, r) => acc + r.commissionAmountKes, 0),
      },
      byBarber: Object.entries(byBarber).map(([id, data]) => ({ staffId: Number(id), ...data })),
      byService: Object.entries(byService).map(([id, data]) => ({ serviceId: Number(id), ...data })),
      monthlyTrend: Object.entries(trendMap).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, data]) => ({ month, ...data })),
    });
  } catch (err) {
    req.log.error(err, "commission summary error");
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

// Barber's own commission view
router.get("/commissions/my", async (req, res): Promise<void> => {
  if (!req.session?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    // Find staff record linked to this user — by email matching or by session staffId
    const { staffId } = req.query as { staffId?: string };
    if (!staffId) { res.json([]); return; }

    const rows = await db
      .select({
        id: commissionsTable.id,
        appointmentId: commissionsTable.appointmentId,
        staffId: commissionsTable.staffId,
        customerId: commissionsTable.customerId,
        serviceId: commissionsTable.serviceId,
        servicePriceKes: commissionsTable.servicePriceKes,
        commissionPct: commissionsTable.commissionPct,
        commissionAmountKes: commissionsTable.commissionAmountKes,
        salonAmountKes: commissionsTable.salonAmountKes,
        paymentStatus: commissionsTable.paymentStatus,
        paymentDate: commissionsTable.paymentDate,
        paymentNotes: commissionsTable.paymentNotes,
        completedAt: commissionsTable.completedAt,
        createdAt: commissionsTable.createdAt,
        staffName: staffTable.name,
        customerName: customersTable.name,
        serviceName: servicesTable.name,
      })
      .from(commissionsTable)
      .leftJoin(staffTable, eq(commissionsTable.staffId, staffTable.id))
      .leftJoin(customersTable, eq(commissionsTable.customerId, customersTable.id))
      .leftJoin(servicesTable, eq(commissionsTable.serviceId, servicesTable.id))
      .where(eq(commissionsTable.staffId, Number(staffId)))
      .orderBy(desc(commissionsTable.completedAt));

    res.json(rows.map(mapCommission));
  } catch (err) {
    req.log.error(err, "my commissions error");
    res.status(500).json({ error: "Failed to fetch commissions" });
  }
});

// Update commission payment status
router.patch("/commissions/:id/payment", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { paymentStatus, paymentNotes } = req.body;
  if (!paymentStatus || !["pending", "paid"].includes(paymentStatus)) {
    res.status(400).json({ error: "paymentStatus must be 'pending' or 'paid'" });
    return;
  }
  try {
    const [updated] = await db.update(commissionsTable).set({
      paymentStatus,
      paymentNotes: paymentNotes ?? null,
      paymentDate: paymentStatus === "paid" ? new Date() : null,
    }).where(eq(commissionsTable.id, id)).returning();

    if (!updated) { res.status(404).json({ error: "Commission not found" }); return; }

    const [staffRow] = await db.select({ name: staffTable.name }).from(staffTable).where(eq(staffTable.id, updated.staffId));
    res.json(mapCommission({ ...updated, staffName: staffRow?.name }));
  } catch (err) {
    req.log.error(err, "update commission payment error");
    res.status(500).json({ error: "Failed to update commission" });
  }
});

// Service-specific commission rates
router.get("/commissions/service-rates", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: serviceCommissionsTable.id,
        serviceId: serviceCommissionsTable.serviceId,
        commissionPct: serviceCommissionsTable.commissionPct,
        serviceName: servicesTable.name,
      })
      .from(serviceCommissionsTable)
      .leftJoin(servicesTable, eq(serviceCommissionsTable.serviceId, servicesTable.id));
    res.json(rows);
  } catch (err) {
    req.log.error(err, "service rates error");
    res.status(500).json({ error: "Failed to fetch service commission rates" });
  }
});

router.post("/commissions/service-rates", requireAdmin, async (req, res): Promise<void> => {
  const { serviceId, commissionPct } = req.body;
  if (!serviceId || commissionPct === undefined) {
    res.status(400).json({ error: "serviceId and commissionPct are required" });
    return;
  }
  try {
    // Upsert
    const existing = await db.select().from(serviceCommissionsTable).where(eq(serviceCommissionsTable.serviceId, Number(serviceId))).limit(1);
    if (existing.length > 0) {
      const [updated] = await db.update(serviceCommissionsTable).set({ commissionPct: Number(commissionPct) }).where(eq(serviceCommissionsTable.serviceId, Number(serviceId))).returning();
      res.json(updated);
    } else {
      const [created] = await db.insert(serviceCommissionsTable).values({ serviceId: Number(serviceId), commissionPct: Number(commissionPct) }).returning();
      res.status(201).json(created);
    }
  } catch (err) {
    req.log.error(err, "set service rate error");
    res.status(500).json({ error: "Failed to set service commission rate" });
  }
});

// CSV export
router.get("/commissions/export/csv", requireAdmin, async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        id: commissionsTable.id,
        appointmentId: commissionsTable.appointmentId,
        staffName: staffTable.name,
        customerName: customersTable.name,
        serviceName: servicesTable.name,
        servicePriceKes: commissionsTable.servicePriceKes,
        commissionPct: commissionsTable.commissionPct,
        commissionAmountKes: commissionsTable.commissionAmountKes,
        salonAmountKes: commissionsTable.salonAmountKes,
        paymentStatus: commissionsTable.paymentStatus,
        paymentDate: commissionsTable.paymentDate,
        completedAt: commissionsTable.completedAt,
      })
      .from(commissionsTable)
      .leftJoin(staffTable, eq(commissionsTable.staffId, staffTable.id))
      .leftJoin(customersTable, eq(commissionsTable.customerId, customersTable.id))
      .leftJoin(servicesTable, eq(commissionsTable.serviceId, servicesTable.id))
      .orderBy(desc(commissionsTable.completedAt));

    const header = "ID,Appointment,Staff,Customer,Service,Price (KES),Commission %,Commission (KES),Salon (KES),Payment Status,Payment Date,Completed At\n";
    const csv = rows.map(r =>
      `${r.id},${r.appointmentId},"${r.staffName ?? ""}","${r.customerName ?? ""}","${r.serviceName ?? ""}",${r.servicePriceKes},${r.commissionPct},${r.commissionAmountKes},${r.salonAmountKes},${r.paymentStatus},${r.paymentDate ? new Date(r.paymentDate).toISOString() : ""},${new Date(r.completedAt).toISOString()}`
    ).join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="commissions-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(header + csv);
  } catch (err) {
    req.log.error(err, "export csv error");
    res.status(500).json({ error: "Failed to export CSV" });
  }
});

export default router;
