import { Router, type IRouter } from "express";
import { eq, ilike } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, servicesTable } from "@workspace/db";
import {
  ListServicesQueryParams,
  ListServicesResponse,
  CreateServiceBody,
  CreateServiceResponse,
  GetServiceParams,
  GetServiceResponse,
  UpdateServiceParams,
  UpdateServiceBody,
  UpdateServiceResponse,
  DeleteServiceParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

const uploadDir = path.join(process.cwd(), "uploads", "services");
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

router.get("/services", async (req, res): Promise<void> => {
  const parsed = ListServicesQueryParams.safeParse(req.query);
  const category = parsed.success ? parsed.data.category : undefined;

  const services = category
    ? await db.select().from(servicesTable).where(eq(servicesTable.category, category))
    : await db.select().from(servicesTable).orderBy(servicesTable.category, servicesTable.name);

  res.json(ListServicesResponse.parse(services.map(s => ({
    ...s,
    description: s.description ?? null,
    createdAt: s.createdAt.toISOString(),
  }))));
});

router.post("/services", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateServiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [service] = await db.insert(servicesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    priceKes: parsed.data.priceKes,
    durationMinutes: parsed.data.durationMinutes,
    isActive: parsed.data.isActive ?? true,
  }).returning();
  res.status(201).json(CreateServiceResponse.parse({
    ...service,
    description: service.description ?? null,
    createdAt: service.createdAt.toISOString(),
  }));
});

router.get("/services/:id", async (req, res): Promise<void> => {
  const params = GetServiceParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, params.data.id));
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(GetServiceResponse.parse({ ...service, description: service.description ?? null, createdAt: service.createdAt.toISOString() }));
});

router.patch("/services/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateServiceParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = UpdateServiceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const [service] = await db.update(servicesTable).set(parsed.data).where(eq(servicesTable.id, params.data.id)).returning();
  if (!service) { res.status(404).json({ error: "Service not found" }); return; }
  res.json(UpdateServiceResponse.parse({ ...service, description: service.description ?? null, createdAt: service.createdAt.toISOString() }));
});

router.delete("/services/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteServiceParams.safeParse({ id: Number(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  await db.delete(servicesTable).where(eq(servicesTable.id, params.data.id));
  res.sendStatus(204);
});

// Upload/replace a service's image (admin only)
router.post("/services/:id/image", requireAdmin, upload.single("image"), async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const [service] = await db.select().from(servicesTable).where(eq(servicesTable.id, id)).limit(1);
    if (!service) { res.status(404).json({ error: "Service not found" }); return; }

    let imageUrl: string;
    if (req.file) {
      imageUrl = `/api/uploads/services/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = String(req.body.imageUrl).trim();
    } else {
      res.status(400).json({ error: "Either upload an image file or provide imageUrl" });
      return;
    }

    // Clean up the old uploaded file (if any) once it's no longer referenced.
    if (service.imageUrl?.startsWith("/api/uploads/services/") && service.imageUrl !== imageUrl) {
      const oldPath = path.join(uploadDir, path.basename(service.imageUrl));
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    const [updated] = await db.update(servicesTable).set({ imageUrl }).where(eq(servicesTable.id, id)).returning();
    res.json({ ...updated, description: updated.description ?? null, createdAt: updated.createdAt.toISOString() });
  } catch (err) {
    req.log.error(err, "upload service image error");
    res.status(500).json({ error: "Failed to upload service image" });
  }
});

// Serve uploaded service images
router.get("/uploads/services/:filename", (req, res): void => {
  const filename = path.basename(req.params.filename as string);
  const filePath = path.join(uploadDir, filename);
  if (!fs.existsSync(filePath)) { res.status(404).json({ error: "File not found" }); return; }
  res.sendFile(filePath);
});

export default router;
