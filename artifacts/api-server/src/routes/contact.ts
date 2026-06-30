import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, contactSubmissionsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";
import { contactLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

function sanitize(str: string, maxLen = 500) {
  return String(str).trim().slice(0, maxLen).replace(/[<>]/g, "");
}

router.post("/contact", contactLimiter, async (req, res): Promise<void> => {
  const { name, email, phone, subject, message } = req.body;
  if (!name || !email || !message) {
    res.status(400).json({ error: "name, email and message are required" });
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email))) {
    res.status(400).json({ error: "Invalid email address" });
    return;
  }
  try {
    const [submission] = await db.insert(contactSubmissionsTable).values({
      name: sanitize(name, 100),
      email: sanitize(email, 100),
      phone: phone ? sanitize(phone, 20) : null,
      subject: subject ? sanitize(subject, 200) : null,
      message: sanitize(message, 2000),
    }).returning();
    res.status(201).json({ ok: true, id: submission.id });
  } catch (err) {
    req.log.error(err, "contact submission error");
    res.status(500).json({ error: "Failed to submit contact form" });
  }
});

router.get("/contact", requireAdmin, async (req, res): Promise<void> => {
  try {
    const submissions = await db.select().from(contactSubmissionsTable)
      .orderBy(desc(contactSubmissionsTable.createdAt));
    res.json(submissions.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone ?? null,
      subject: s.subject ?? null,
      message: s.message,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "list contact submissions error");
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.patch("/contact/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body;
  if (!["unread", "read", "replied"].includes(status)) {
    res.status(400).json({ error: "status must be unread, read, or replied" });
    return;
  }
  try {
    const [updated] = await db.update(contactSubmissionsTable).set({ status })
      .where(eq(contactSubmissionsTable.id, id)).returning();
    if (!updated) { res.status(404).json({ error: "Submission not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "update contact status error");
    res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;
