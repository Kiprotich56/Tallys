import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { db } from "@workspace/db";
import { usersTable, customersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { loginLimiter, authLimiter, passwordResetLimiter } from "../lib/rate-limit";
import { sendVerificationEmail, sendPasswordResetEmail } from "../lib/email";

const router = Router();

// CLIENT_URL = the frontend (browser-facing domain)
// API_URL    = this Express server's own public URL (used in email links that call /api/*)
// On Replit, both the frontend and API are served on the same domain via the proxy.
const CLIENT_URL = process.env.CLIENT_URL ?? process.env.APP_URL ?? (
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : "http://localhost:3000"
);
const API_URL = process.env.API_URL ?? process.env.APP_URL ?? (
  process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : `http://localhost:${process.env.PORT ?? 8080}`
);

function generateToken() {
  return crypto.randomBytes(32).toString("hex");
}

router.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const { email, password, name, phone, gender } = req.body;
    if (!email || !password || !name || !phone || !gender) {
      res.status(400).json({ error: "email, password, name, phone and gender are required" });
      return;
    }

    const emailLower = String(email).toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLower)) {
      res.status(400).json({ error: "Invalid email address" });
      return;
    }
    if (String(password).length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(String(password), 12);
    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const [customer] = await db.insert(customersTable).values({
      name: String(name).trim().slice(0, 100),
      phone: String(phone).trim().slice(0, 20),
      email: emailLower,
      gender: gender ? String(gender).trim().slice(0, 20) : null,
    }).returning();

    const [user] = await db.insert(usersTable).values({
      email: emailLower,
      passwordHash,
      role: "customer",
      customerId: customer.id,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: verificationExpires,
    }).returning();

    // Send verification email (non-blocking)
    const verificationUrl = `${API_URL}/api/auth/verify-email?token=${verificationToken}`;
    sendVerificationEmail(emailLower, { name: customer.name, verificationUrl }).catch(() => {});

    req.session.userId = user.id;
    req.session.role = user.role;
    req.session.customerId = customer.id;

    res.status(201).json({
      id: user.id,
      email: user.email,
      role: user.role,
      customerId: customer.id,
      name: customer.name,
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    req.log.error(err, "register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const emailLower = String(email).toLowerCase().trim();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(String(password), user.passwordHash);
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
      emailVerified: user.emailVerified,
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
      emailVerified: user.emailVerified,
    });
  } catch (err) {
    req.log.error(err, "me error");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

router.get("/auth/verify-email", async (req, res) => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "Invalid verification token" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.emailVerificationToken, token)).limit(1);

    if (!user || !user.emailVerificationExpires || user.emailVerificationExpires < new Date()) {
      res.redirect(`${CLIENT_URL}/login?verified=expired`);
      return;
    }

    await db.update(usersTable).set({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    }).where(eq(usersTable.id, user.id));

    res.redirect(`${CLIENT_URL}/login?verified=success`);
  } catch (err) {
    req.log.error(err, "verify-email error");
    res.status(500).json({ error: "Verification failed" });
  }
});

router.post("/auth/resend-verification", authLimiter, async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    if (user.emailVerified) { res.json({ ok: true, message: "Email already verified" }); return; }

    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.update(usersTable).set({ emailVerificationToken: verificationToken, emailVerificationExpires: verificationExpires })
      .where(eq(usersTable.id, user.id));

    const [customer] = user.customerId
      ? await db.select().from(customersTable).where(eq(customersTable.id, user.customerId)).limit(1)
      : [null];

    const verificationUrl = `${API_URL}/api/auth/verify-email?token=${verificationToken}`;
    const emailSent = await sendVerificationEmail(user.email, { name: customer?.name ?? user.email, verificationUrl });

    res.json({ ok: true, emailSent, verificationUrl: emailSent ? undefined : verificationUrl });
  } catch (err) {
    req.log.error(err, "resend-verification error");
    res.status(500).json({ error: "Failed to resend verification email" });
  }
});

router.post("/auth/forgot-password", passwordResetLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) { res.status(400).json({ error: "Email is required" }); return; }
  try {
    const emailLower = String(email).toLowerCase().trim();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, emailLower)).limit(1);
    // Always return success to prevent email enumeration
    if (user) {
      const resetToken = generateToken();
      const resetExpires = new Date(Date.now() + 60 * 60 * 1000);
      await db.update(usersTable).set({ passwordResetToken: resetToken, passwordResetExpires: resetExpires })
        .where(eq(usersTable.id, user.id));

      const [customer] = user.customerId
        ? await db.select().from(customersTable).where(eq(customersTable.id, user.customerId)).limit(1)
        : [null];

      const resetUrl = `${CLIENT_URL}/reset-password?token=${resetToken}`;
      sendPasswordResetEmail(user.email, { name: customer?.name ?? user.email, resetUrl }).catch(() => {});
    }
    res.json({ ok: true, message: "If an account with that email exists, a reset link has been sent." });
  } catch (err) {
    req.log.error(err, "forgot-password error");
    res.status(500).json({ error: "Failed to process request" });
  }
});

router.post("/auth/change-password", authLimiter, async (req, res) => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 12);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "change-password error");
    res.status(500).json({ error: "Failed to change password" });
  }
});

router.post("/auth/reset-password", passwordResetLimiter, async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) { res.status(400).json({ error: "Token and password are required" }); return; }
  if (String(password).length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
  try {
    const [user] = await db.select().from(usersTable)
      .where(eq(usersTable.passwordResetToken, String(token))).limit(1);
    if (!user || !user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }
    const passwordHash = await bcrypt.hash(String(password), 12);
    await db.update(usersTable).set({ passwordHash, passwordResetToken: null, passwordResetExpires: null })
      .where(eq(usersTable.id, user.id));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err, "reset-password error");
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
