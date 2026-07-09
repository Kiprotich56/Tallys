import { Router, type IRouter } from "express";
import { eq, and, ne } from "drizzle-orm";
import { db, staffTable, appointmentsTable } from "@workspace/db";
import {
  ListStaffResponse,
  CreateStaffBody,
  CreateStaffResponse,
  GetStaffMemberParams,
  GetStaffMemberResponse,
  UpdateStaffParams,
  UpdateStaffBody,
  UpdateStaffResponse,
  GetStaffAvailabilityQueryParams,
  GetStaffAvailabilityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapStaff(s: typeof staffTable.$inferSelect) {
  return {
    id: s.id,
    name: s.name,
    role: s.role,
    bio: s.bio ?? null,
    photoUrl: s.photoUrl ?? null,
    specializations: s.specializations ?? [],
    rating: s.rating ?? null,
    commissionPct: s.commissionPct,
    isActive: s.isActive,
    completedServices: s.completedServices,
    revenueGenerated: s.revenueGenerated,
    socialLinks: s.socialLinks ?? null,
  };
}

router.get("/staff/availability", async (req, res): Promise<void> => {
  const parsed = GetStaffAvailabilityQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { staffId, date } = parsed.data;

  // Only staffId + date matter — previously this queried ALL of a staffer's
  // appointments (any date) and then tried to filter client-side with
  // `timeSlot.startsWith(date)`, which can never match because timeSlot is
  // stored as "HH:MM" with no date prefix. That made every slot look free
  // even when already booked, so a user could pick a taken slot and only
  // find out it was rejected after submitting (see appointments.ts 409).
  const bookedSlots = await db.select({ timeSlot: appointmentsTable.timeSlot })
    .from(appointmentsTable)
    .where(
      and(
        eq(appointmentsTable.staffId, staffId),
        eq(appointmentsTable.date, date),
        ne(appointmentsTable.status, "cancelled"),
      )
    );

  const bookedTimes = new Set(bookedSlots.map(b => b.timeSlot));

  const allSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
    "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30"];

  // Also drop slots that have already passed today, so a customer can't
  // pick e.g. 9am when it's already 2pm.
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isToday = date === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const available = allSlots.filter(s => {
    if (bookedTimes.has(s)) return false;
    if (isToday) {
      const [h, m] = s.split(":").map(Number);
      if (h * 60 + m <= currentMinutes) return false;
    }
    return true;
  });

  res.json(GetStaffAvailabilityResponse.parse({ staffId, date, slots: available }));
});

router.get("/staff", async (_req, res): Promise<void> => {
  const staff = await db.select().from(staffTable).orderBy(staffTable.name);
  res.json(ListStaffResponse.parse(staff.map(mapStaff)));
});

router.post("/staff", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [member] = await db.insert(staffTable).values({
    name: parsed.data.name,
    role: parsed.data.role ?? "Barber",
    bio: parsed.data.bio ?? null,
    photoUrl: parsed.data.photoUrl ?? null,
    specializations: parsed.data.specializations ?? [],
    commissionPct: parsed.data.commissionPct ?? 30,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(CreateStaffResponse.parse(mapStaff(member)));
});

router.get("/staff/:id", async (req, res): Promise<void> => {
  const params = GetStaffMemberParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [member] = await db.select().from(staffTable).where(eq(staffTable.id, params.data.id));
  if (!member) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json(GetStaffMemberResponse.parse(mapStaff(member)));
});

router.patch("/staff/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateStaffParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateStaffBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [member] = await db.update(staffTable).set(parsed.data).where(eq(staffTable.id, params.data.id)).returning();
  if (!member) { res.status(404).json({ error: "Staff not found" }); return; }
  res.json(UpdateStaffResponse.parse(mapStaff(member)));
});

router.delete("/staff/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(staffTable).where(eq(staffTable.id, id));
  res.status(204).send();
});

export default router;
