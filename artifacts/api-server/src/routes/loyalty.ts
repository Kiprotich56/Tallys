import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  GetLoyaltyParams,
  GetLoyaltyResponse,
  RedeemLoyaltyParams,
  RedeemLoyaltyBody,
  RedeemLoyaltyResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const TIER_CONFIG = {
  Bronze:   { min: 0,  max: 4,  next: "Silver",   benefits: ["Welcome member"] },
  Silver:   { min: 5,  max: 14, next: "Gold",     benefits: ["5% discount on all services", "Free scrub on 10th visit"] },
  Gold:     { min: 15, max: 29, next: "Platinum", benefits: ["10% discount on all services", "Free facial on birthday", "Priority booking"] },
  Platinum: { min: 30, max: Infinity, next: null, benefits: ["15% discount on all services", "Free service monthly", "VIP treatment", "Birthday rewards"] },
};

function buildLoyalty(customer: typeof customersTable.$inferSelect) {
  const tier = customer.loyaltyTier as keyof typeof TIER_CONFIG;
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.Bronze;
  const nextTier = config.next as string | null;
  const visitsToNextTier = nextTier ? Math.max(0, TIER_CONFIG[nextTier as keyof typeof TIER_CONFIG].min - customer.totalVisits) : null;

  return {
    customerId: customer.id,
    tier: customer.loyaltyTier,
    points: customer.loyaltyPoints,
    totalVisits: customer.totalVisits,
    nextTier,
    visitsToNextTier,
    benefits: config.benefits,
  };
}

router.get("/loyalty/:customerId", async (req, res): Promise<void> => {
  const params = GetLoyaltyParams.safeParse({ customerId: Number(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  res.json(GetLoyaltyResponse.parse(buildLoyalty(customer)));
});

router.post("/loyalty/:customerId/redeem", async (req, res): Promise<void> => {
  const params = RedeemLoyaltyParams.safeParse({ customerId: Number(Array.isArray(req.params.customerId) ? req.params.customerId[0] : req.params.customerId) });
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const parsed = RedeemLoyaltyBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, params.data.customerId));
  if (!customer) { res.status(404).json({ error: "Customer not found" }); return; }
  if (customer.loyaltyPoints < parsed.data.points) { res.status(400).json({ error: "Insufficient points" }); return; }

  const [updated] = await db.update(customersTable)
    .set({ loyaltyPoints: customer.loyaltyPoints - parsed.data.points })
    .where(eq(customersTable.id, params.data.customerId))
    .returning();

  res.json(RedeemLoyaltyResponse.parse(buildLoyalty(updated)));
});

export default router;
