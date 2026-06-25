import { Router, type IRouter } from "express";
import { eq, gte, and, sql } from "drizzle-orm";
import { db, appointmentsTable, customersTable, servicesTable, staffTable, reviewsTable } from "@workspace/db";
import {
  GetDashboardSummaryResponse,
  GetRevenueTrendResponse,
  GetServicePopularityResponse,
  GetStaffPerformanceResponse,
  GetTodayAppointmentsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toDateString(d: Date): string {
  return d.toISOString().split("T")[0];
}

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  const today = toDateString(new Date());
  const weekAgo = toDateString(new Date(Date.now() - 7 * 86400000));
  const monthAgo = toDateString(new Date(Date.now() - 30 * 86400000));

  const allAppts = await db.select().from(appointmentsTable);
  const allCustomers = await db.select({ id: customersTable.id, totalVisits: customersTable.totalVisits }).from(customersTable);

  const todayAppts = allAppts.filter(a => a.date === today);
  const completedAppts = allAppts.filter(a => a.status === "completed");
  const pendingAppts = allAppts.filter(a => a.status === "pending");
  const confirmedAppts = allAppts.filter(a => a.status === "confirmed");

  const dailyRevenue = todayAppts.filter(a => a.status === "completed").reduce((s, a) => s + a.totalKes, 0);
  const weeklyRevenue = completedAppts.filter(a => a.date >= weekAgo).reduce((s, a) => s + a.totalKes, 0);
  const monthlyRevenue = completedAppts.filter(a => a.date >= monthAgo).reduce((s, a) => s + a.totalKes, 0);
  const repeatCustomers = allCustomers.filter(c => c.totalVisits > 1).length;
  const repeatCustomerRate = allCustomers.length > 0 ? (repeatCustomers / allCustomers.length) * 100 : 0;

  res.json(GetDashboardSummaryResponse.parse({
    dailyRevenue,
    weeklyRevenue,
    monthlyRevenue,
    totalCustomers: allCustomers.length,
    todayAppointments: todayAppts.length,
    activeAppointments: confirmedAppts.length,
    pendingAppointments: pendingAppts.length,
    completedToday: todayAppts.filter(a => a.status === "completed").length,
    repeatCustomerRate: Math.round(repeatCustomerRate * 10) / 10,
  }));
});

router.get("/dashboard/revenue", async (_req, res): Promise<void> => {
  const allAppts = await db.select({ date: appointmentsTable.date, totalKes: appointmentsTable.totalKes, status: appointmentsTable.status }).from(appointmentsTable);
  const byDate: Record<string, { revenue: number; appointments: number }> = {};

  for (let i = 29; i >= 0; i--) {
    const d = toDateString(new Date(Date.now() - i * 86400000));
    byDate[d] = { revenue: 0, appointments: 0 };
  }

  for (const a of allAppts) {
    if (byDate[a.date]) {
      byDate[a.date].appointments++;
      if (a.status === "completed") byDate[a.date].revenue += a.totalKes;
    }
  }

  const points = Object.entries(byDate).map(([date, v]) => ({ date, revenue: v.revenue, appointments: v.appointments }));
  res.json(GetRevenueTrendResponse.parse(points));
});

router.get("/dashboard/services/popularity", async (_req, res): Promise<void> => {
  const allAppts = await db.select().from(appointmentsTable);
  const allServices = await db.select().from(servicesTable);

  const serviceMap = new Map(allServices.map(s => [s.id, s]));
  const counts: Record<number, { bookings: number; revenueKes: number }> = {};

  for (const a of allAppts) {
    if (!counts[a.serviceId]) counts[a.serviceId] = { bookings: 0, revenueKes: 0 };
    counts[a.serviceId].bookings++;
    if (a.status === "completed") counts[a.serviceId].revenueKes += a.totalKes;
  }

  const popularity = Object.entries(counts)
    .map(([id, v]) => {
      const service = serviceMap.get(Number(id));
      return service ? {
        serviceId: service.id,
        serviceName: service.name,
        category: service.category,
        bookings: v.bookings,
        revenueKes: v.revenueKes,
      } : null;
    })
    .filter(Boolean)
    .sort((a, b) => b!.bookings - a!.bookings)
    .slice(0, 10);

  res.json(GetServicePopularityResponse.parse(popularity));
});

router.get("/dashboard/staff/performance", async (_req, res): Promise<void> => {
  const staff = await db.select().from(staffTable).where(eq(staffTable.isActive, true));
  const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.status, "approved"));

  const ratingsByStaff: Record<number, number[]> = {};
  for (const r of reviews) {
    if (r.staffId) {
      if (!ratingsByStaff[r.staffId]) ratingsByStaff[r.staffId] = [];
      ratingsByStaff[r.staffId].push(r.rating);
    }
  }

  const performance = staff.map(s => {
    const ratings = ratingsByStaff[s.id] ?? [];
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : s.rating ?? 4.5;
    return {
      staffId: s.id,
      name: s.name,
      completedServices: s.completedServices,
      revenueKes: s.revenueGenerated,
      avgRating: Math.round(avgRating * 10) / 10,
    };
  });

  res.json(GetStaffPerformanceResponse.parse(performance));
});

router.get("/dashboard/appointments/today", async (_req, res): Promise<void> => {
  const today = toDateString(new Date());
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
    .where(eq(appointmentsTable.date, today))
    .orderBy(appointmentsTable.timeSlot);

  res.json(GetTodayAppointmentsResponse.parse(rows.map(r => ({
    ...r,
    notes: r.notes ?? null,
    serviceName: r.serviceName ?? null,
    staffName: r.staffName ?? null,
    customerName: r.customerName ?? null,
    createdAt: r.createdAt.toISOString(),
  }))));
});

export default router;
