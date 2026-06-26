import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, customersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !password || !name || !phone) {
      res.status(400).json({ error: "email, password, name and phone are required" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const [customer] = await db.insert(customersTable).values({ name, phone }).returning();
    const [user] = await db.insert(usersTable).values({
      email,
      passwordHash,
      role: "customer",
      customerId: customer.id,
    }).returning();

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.customerId = customer.id;

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: customer.id,
      name: customer.name,
    });
  } catch (err) {
    req.log.error(err, "register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    let customerName: string | null = null;
    if (user.customerId) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, user.customerId)).limit(1);
      customerName = customer?.name ?? null;
    }

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.customerId = user.customerId ?? undefined;

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      name: customerName ?? user.email,
    });
  } catch (err) {
    req.log.error(err, "login error");
    res.status(500).json({ error: "Login failed" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    let customerName: string | null = null;
    if (user.customerId) {
      const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, user.customerId)).limit(1);
      customerName = customer?.name ?? null;
    }

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: user.customerId,
      name: customerName ?? user.email,
    });
  } catch (err) {
    req.log.error(err, "me error");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
