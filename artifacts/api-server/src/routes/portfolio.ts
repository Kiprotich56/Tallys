import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db, staffPortfolioTable, staffTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads", "portfolio");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [".jpg", ".jpeg", ".png", ".webp", ".gif"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error("Only image files are allowed"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Get portfolio for a staff member (public)
router.get("/staff/:id/portfolio", async (req, res): Promise<void> => {
  const staffId = Number(req.params.id);
  if (isNaN(staffId)) { res.status(400).json({ error: "Invalid staff id" }); return; }
  try {
    const images = await db.select().from(staffPortfolioTable)
      .where(eq(staffPortfolioTable.staffId, staffId))
      .orderBy(staffPortfolioTable.sortOrder);
    res.json(images.map(img => ({
      id: img.id,
      staffId: img.staffId,
      imageUrl: img.imageUrl,
      caption: img.caption ?? null,
      sortOrder: img.sortOrder,
      createdAt: img.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error(err, "get portfolio error");
    res.status(500).json({ error: "Failed to fetch portfolio" });
  }
});

// Upload portfolio image (admin only)
router.post("/staff/:id/portfolio", requireAdmin, upload.single("image"), async (req, res): Promise<void> => {
  const staffId = Number(req.params.id);
  if (isNaN(staffId)) { res.status(400).json({ error: "Invalid staff id" }); return; }

  try {
    const [staff] = await db.select().from(staffTable).where(eq(staffTable.id, staffId)).limit(1);
    if (!staff) { res.status(404).json({ error: "Staff not found" }); return; }

    let imageUrl: string;
    if (req.file) {
      imageUrl = `/api/uploads/portfolio/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = String(req.body.imageUrl).trim();
    } else {
      res.status(400).json({ error: "Either upload an image file or provide imageUrl" });
      return;
    }

    const caption = req.body.caption ? String(req.body.caption).trim().slice(0, 200) : null;
    const existingCount = await db.select({ id: staffPortfolioTable.id }).from(staffPortfolioTable).where(eq(staffPortfolioTable.staffId, staffId));
    const sortOrder = existingCount.length;

    const [image] = await db.insert(staffPortfolioTable).values({
      staffId,
      imageUrl,
      caption,
      sortOrder,
    }).returning();

    res.status(201).json({
      id: image.id,
      staffId: image.staffId,
      imageUrl: image.imageUrl,
      caption: image.caption ?? null,
      sortOrder: image.sortOrder,
      createdAt: image.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err, "upload portfolio error");
    res.status(500).json({ error: "Failed to upload portfolio image" });
  }
});

// Update portfolio image caption/order
router.patch("/staff/:staffId/portfolio/:imageId", requireAdmin, async (req, res): Promise<void> => {
  const staffId = Number(req.params.staffId);
  const imageId = Number(req.params.imageId);
  if (isNaN(staffId) || isNaN(imageId)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const updates: Partial<{ caption: string | null; sortOrder: number }> = {};
    if (req.body.caption !== undefined) updates.caption = req.body.caption ? String(req.body.caption).slice(0, 200) : null;
    if (req.body.sortOrder !== undefined) updates.sortOrder = Number(req.body.sortOrder);

    const [updated] = await db.update(staffPortfolioTable).set(updates)
      .where(eq(staffPortfolioTable.id, imageId)).returning();
    if (!updated) { res.status(404).json({ error: "Image not found" }); return; }
    res.json({ id: updated.id, staffId: updated.staffId, imageUrl: updated.imageUrl, caption: updated.caption ?? null, sortOrder: updated.sortOrder, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err, "update portfolio error");
    res.status(500).json({ error: "Failed to update portfolio image" });
  }
});

// Delete portfolio image
router.delete("/staff/:staffId/portfolio/:imageId", requireAdmin, async (req, res): Promise<void> => {
  const staffId = Number(req.params.staffId);
  const imageId = Number(req.params.imageId);
  if (isNaN(staffId) || isNaN(imageId)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [img] = await db.select().from(staffPortfolioTable).where(eq(staffPortfolioTable.id, imageId)).limit(1);
    if (!img) { res.status(404).json({ error: "Image not found" }); return; }

    // Delete local file if it's an uploaded file
    if (img.imageUrl.startsWith("/api/uploads/")) {
      const filename = path.basename(img.imageUrl);
      const filePath = path.join(uploadDir, filename);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.delete(staffPortfolioTable).where(eq(staffPortfolioTable.id, imageId));
    res.status(204).send();
  } catch (err) {
    req.log.error(err, "delete portfolio error");
    res.status(500).json({ error: "Failed to delete portfolio image" });
  }
});

// Serve uploaded files
router.get("/uploads/portfolio/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }
  res.sendFile(filePath);
});

export default router;
