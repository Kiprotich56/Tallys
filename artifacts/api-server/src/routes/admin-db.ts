import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  customersTable,
  servicesTable,
  staffTable,
  appointmentsTable,
  reviewsTable,
  usersTable,
} from "@workspace/db";

const router: IRouter = Router();

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId || req.session?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

const TABLES = {
  customers: customersTable,
  services: servicesTable,
  staff: staffTable,
  appointments: appointmentsTable,
  reviews: reviewsTable,
  users: usersTable,
} as const;

type TableName = keyof typeof TABLES;

function isTableName(name: string): name is TableName {
  return name in TABLES;
}

router.get("/admin/db/overview", requireAdmin, async (_req, res): Promise<void> => {
  const counts = await Promise.all(
    Object.entries(TABLES).map(async ([name, table]) => {
      const rows = await db.select().from(table as any);
      return { table: name, count: rows.length };
    })
  );
  res.json(counts);
});

router.get("/admin/db/:table", requireAdmin, async (req, res): Promise<void> => {
  const { table } = req.params;
  if (!isTableName(table)) {
    res.status(404).json({ error: `Unknown table: ${table}` });
    return;
  }
  const rows = await db.select().from(TABLES[table] as any);
  res.json(rows);
});

router.delete("/admin/db/:table/:id", requireAdmin, async (req, res): Promise<void> => {
  const { table, id } = req.params;
  if (!isTableName(table)) {
    res.status(404).json({ error: `Unknown table: ${table}` });
    return;
  }
  const numId = Number(id);
  if (Number.isNaN(numId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const t = TABLES[table] as any;
  await db.delete(t).where(eq(t.id, numId));
  res.json({ ok: true });
});

router.patch("/admin/db/:table/:id", requireAdmin, async (req, res): Promise<void> => {
  const { table, id } = req.params;
  if (!isTableName(table)) {
    res.status(404).json({ error: `Unknown table: ${table}` });
    return;
  }
  const numId = Number(id);
  if (Number.isNaN(numId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const t = TABLES[table] as any;
  const updated = await db.update(t).set(req.body).where(eq(t.id, numId)).returning();
  res.json(updated[0] ?? {});
});

export default router;
