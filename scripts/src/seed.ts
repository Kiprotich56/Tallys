import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import pg from "pg";
import bcrypt from "bcryptjs";
import * as schema from "@workspace/db/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool, { schema });

// ─── SERVICES ───────────────────────────────────────────────────────────────

const services = [
  // Haircuts
  { name: "Classic Gentleman's Cut", description: "Timeless scissor cut with comb finish and hot towel.", category: "Haircuts", priceKes: 700, durationMinutes: 40, isActive: true },
  { name: "Skin Fade", description: "Sharp skin-to-length fade for a clean modern look.", category: "Haircuts", priceKes: 800, durationMinutes: 45, isActive: true },
  { name: "Taper Fade", description: "Gradual taper from short sides to a longer top.", category: "Haircuts", priceKes: 750, durationMinutes: 45, isActive: true },
  { name: "Caesar Cut", description: "Short, even-length cut with a horizontal fringe.", category: "Haircuts", priceKes: 600, durationMinutes: 30, isActive: true },
  { name: "Kids' Haircut", description: "Gentle cut for children under 12 years old.", category: "Haircuts", priceKes: 450, durationMinutes: 25, isActive: true },

  // Beard Services
  { name: "Beard Trim & Shape", description: "Precision shaping and edging with a straight razor finish.", category: "Beard Services", priceKes: 500, durationMinutes: 25, isActive: true },
  { name: "Full Beard Grooming", description: "Complete wash, condition, trim, shape and hot-towel treatment.", category: "Beard Services", priceKes: 800, durationMinutes: 40, isActive: true },
  { name: "Hot Towel Shave", description: "Traditional straight-razor shave with hot towel and aftershave balm.", category: "Beard Services", priceKes: 600, durationMinutes: 30, isActive: true },
  { name: "Beard Coloring", description: "Professional beard dye to cover greys or enhance natural color.", category: "Beard Services", priceKes: 1200, durationMinutes: 50, isActive: true },

  // Hair Treatments
  { name: "Deep Conditioning Treatment", description: "Intense moisture mask to restore shine and elasticity.", category: "Hair Treatments", priceKes: 1000, durationMinutes: 45, isActive: true },
  { name: "Scalp Treatment", description: "Exfoliating scalp scrub and nourishing serum for dandruff relief.", category: "Hair Treatments", priceKes: 900, durationMinutes: 40, isActive: true },
  { name: "Keratin Smoothing", description: "Formaldehyde-free keratin treatment for frizz control.", category: "Hair Treatments", priceKes: 3500, durationMinutes: 120, isActive: true },
  { name: "Hair Coloring", description: "Full head color using premium ammonia-free dyes.", category: "Hair Treatments", priceKes: 2500, durationMinutes: 90, isActive: true },
  { name: "Highlights & Balayage", description: "Hand-painted highlights for a natural, sun-kissed effect.", category: "Hair Treatments", priceKes: 3200, durationMinutes: 105, isActive: true },

  // Skincare
  { name: "Classic Facial", description: "Deep cleanse, steam, extraction and moisturizing mask.", category: "Skincare", priceKes: 1500, durationMinutes: 60, isActive: true },
  { name: "Anti-Aging Facial", description: "Collagen-boosting treatment targeting fine lines.", category: "Skincare", priceKes: 2200, durationMinutes: 75, isActive: true },
  { name: "Charcoal Detox Facial", description: "Activated charcoal mask to deep-cleanse pores.", category: "Skincare", priceKes: 1800, durationMinutes: 60, isActive: true },
  { name: "Men's Skin Refresh", description: "Quick 30-min facial designed for men: cleanse, scrub, moisturize.", category: "Skincare", priceKes: 1000, durationMinutes: 30, isActive: true },

  // Manicure & Pedicure
  { name: "Classic Manicure", description: "Nail shaping, cuticle care and buff with polish of choice.", category: "Manicure & Pedicure", priceKes: 700, durationMinutes: 35, isActive: true },
  { name: "Gel Manicure", description: "Long-lasting gel polish that cures under UV light.", category: "Manicure & Pedicure", priceKes: 1200, durationMinutes: 50, isActive: true },
  { name: "Classic Pedicure", description: "Foot soak, callus removal, nail trim and polish.", category: "Manicure & Pedicure", priceKes: 900, durationMinutes: 45, isActive: true },
  { name: "Luxury Spa Pedicure", description: "Exfoliation, paraffin wax wrap and hot-stone massage.", category: "Manicure & Pedicure", priceKes: 1600, durationMinutes: 70, isActive: true },
  { name: "Nail Art", description: "Custom nail designs — per hand, designs quoted on request.", category: "Manicure & Pedicure", priceKes: 500, durationMinutes: 30, isActive: true },

  // Hair Styling
  { name: "Blow Dry & Style", description: "Professional blow-dry with round-brush styling.", category: "Hair Styling", priceKes: 800, durationMinutes: 40, isActive: true },
  { name: "Braiding", description: "Box braids, cornrows or twists — price varies by length.", category: "Hair Styling", priceKes: 2000, durationMinutes: 120, isActive: true },
  { name: "Dreadlock Maintenance", description: "Re-twisting and locking for existing dreadlocks.", category: "Hair Styling", priceKes: 1500, durationMinutes: 90, isActive: true },
  { name: "Updo & Special Occasion", description: "Elegant updos for weddings, graduations and events.", category: "Hair Styling", priceKes: 2500, durationMinutes: 90, isActive: true },

  // Waxing
  { name: "Eyebrow Wax & Shape", description: "Precision waxing for perfectly arched brows.", category: "Waxing", priceKes: 400, durationMinutes: 20, isActive: true },
  { name: "Full Leg Wax", description: "Smooth, long-lasting hair removal for full legs.", category: "Waxing", priceKes: 2000, durationMinutes: 60, isActive: true },
  { name: "Underarm Wax", description: "Quick underarm hair removal for 4–6 week smoothness.", category: "Waxing", priceKes: 500, durationMinutes: 15, isActive: true },

  // Combos
  { name: "The Full Tally's Package", description: "Haircut + beard groom + facial + manicure. Our flagship experience.", category: "Combos", priceKes: 3500, durationMinutes: 150, isActive: true },
];

// ─── STAFF ───────────────────────────────────────────────────────────────────

const staffMembers = [
  {
    name: "Tally Mwangi",
    role: "Master Barber & Owner",
    bio: "Tally founded the studio in 2018 after training in Nairobi and Dubai. His signature skin fades and creative tapework have earned him a loyal clientele across the city.",
    specializations: ["Skin Fade", "Taper Fade", "Classic Gentleman's Cut"],
    rating: 4.9,
    commissionPct: 0,
    isActive: true,
    completedServices: 0,
    revenueGenerated: 0,
  },
  {
    name: "Amina Odhiambo",
    role: "Senior Stylist",
    bio: "Amina brings 7 years of expertise in hair colouring, balayage and keratin treatments. She has a gift for transforming hair texture and shine.",
    specializations: ["Balayage", "Keratin Smoothing", "Hair Coloring"],
    rating: 4.8,
    commissionPct: 35,
    isActive: true,
    completedServices: 0,
    revenueGenerated: 0,
  },
  {
    name: "Brian Kipchoge",
    role: "Barber",
    bio: "Brian is a fade specialist who grew up watching barbershop culture in Eldoret. His attention to detail and friendly demeanour make every visit feel premium.",
    specializations: ["Skin Fade", "Beard Grooming", "Hot Towel Shave"],
    rating: 4.7,
    commissionPct: 30,
    isActive: true,
    completedServices: 0,
    revenueGenerated: 0,
  },
  {
    name: "Grace Wanjiku",
    role: "Beauty Therapist",
    bio: "Grace specialises in skincare and nail artistry. She holds a diploma in Beauty Therapy from the Kenya Beauty School and is passionate about skin health.",
    specializations: ["Classic Facial", "Gel Manicure", "Nail Art"],
    rating: 4.8,
    commissionPct: 30,
    isActive: true,
    completedServices: 0,
    revenueGenerated: 0,
  },
  {
    name: "Kevin Otieno",
    role: "Barber",
    bio: "Kevin blends classic barbering with modern trends. He's known for his crisp lineups and his ability to replicate reference photos with precision.",
    specializations: ["Caesar Cut", "Taper Fade", "Beard Trim & Shape"],
    rating: 4.6,
    commissionPct: 30,
    isActive: true,
    completedServices: 0,
    revenueGenerated: 0,
  },
];

// ─── ADMIN USER ───────────────────────────────────────────────────────────────

const adminEmail = "admin@tallys.co.ke";
const adminPassword = "Tallys@Admin2024";
const adminName = "Tally Mwangi";

// ─── SEED ────────────────────────────────────────────────────────────────────

async function seed() {
  console.log("🌱 Starting seed...\n");

  // --- Services ---
  console.log("📋 Seeding services...");
  const existingServices = await db.select({ id: schema.servicesTable.id }).from(schema.servicesTable);
  if (existingServices.length === 0) {
    await db.insert(schema.servicesTable).values(services);
    console.log(`   ✓ Inserted ${services.length} services\n`);
  } else {
    console.log(`   ⏭  ${existingServices.length} services already exist, skipping\n`);
  }

  // --- Staff ---
  console.log("👥 Seeding staff...");
  const existingStaff = await db.select({ id: schema.staffTable.id }).from(schema.staffTable);
  if (existingStaff.length === 0) {
    await db.insert(schema.staffTable).values(staffMembers);
    console.log(`   ✓ Inserted ${staffMembers.length} staff members\n`);
  } else {
    console.log(`   ⏭  ${existingStaff.length} staff already exist, skipping\n`);
  }

  // --- Admin customer record ---
  console.log("👤 Seeding admin customer record...");
  let adminCustomerId: number | null = null;
  const existingCustomer = await db
    .select({ id: schema.customersTable.id })
    .from(schema.customersTable)
    .where(eq(schema.customersTable.phone, "+254700000000"));

  if (existingCustomer.length === 0) {
    const [cust] = await db
      .insert(schema.customersTable)
      .values({ name: adminName, phone: "+254700000000", email: adminEmail, gender: "Male" })
      .returning({ id: schema.customersTable.id });
    adminCustomerId = cust.id;
    console.log(`   ✓ Admin customer record created (id=${adminCustomerId})\n`);
  } else {
    adminCustomerId = existingCustomer[0].id;
    console.log(`   ⏭  Admin customer already exists (id=${adminCustomerId}), skipping\n`);
  }

  // --- Admin user ---
  console.log("🔐 Seeding admin user...");
  const existingUser = await db
    .select({ id: schema.usersTable.id })
    .from(schema.usersTable)
    .where(eq(schema.usersTable.email, adminEmail));

  if (existingUser.length === 0) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await db.insert(schema.usersTable).values({
      email: adminEmail,
      passwordHash,
      role: "admin",
      customerId: adminCustomerId,
    });
    console.log(`   ✓ Admin user created\n`);
    console.log("   ┌─────────────────────────────────────────┐");
    console.log(`   │  Email:    ${adminEmail}          │`);
    console.log(`   │  Password: ${adminPassword}         │`);
    console.log("   └─────────────────────────────────────────┘\n");
  } else {
    console.log(`   ⏭  Admin user already exists, skipping\n`);
  }

  console.log("✅ Seed complete!");
  await pool.end();
}

seed().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await pool.end();
  process.exit(1);
});
