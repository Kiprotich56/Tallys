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

const IMG = {
  haircut: "https://images.squarespace-cdn.com/content/v1/6266605f2774c536bff0650a/1700556119441-423LUOKRP0CDZM0CXQUR/Drop+Fade+Haircut+(San+Francisco+Barbershop).png",
  fade: "https://images.squarespace-cdn.com/content/v1/6266605f2774c536bff0650a/1700556122113-R90V0E0DX4TVYAFHCTPY/Low+Shadow+Fade+Haircut+(San+Francisco+Barbershop).png",
  taperFade: "https://www.manhattanbarbershopnyc.com/_next/image?url=/images/style-guide/low-fade-professional-style.webp&w=1920&q=75&dpl=dpl_71H5SjqfCGokXtjA5RnCU9rRLKxK",
  beard: "https://www.therazordoc.com/wp-content/uploads/2024/08/istockphoto-872361244-612x612-1.webp",
  hairTreatment: "https://images.pexels.com/photos/3993331/pexels-photo-3993331.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
  hairColor: "https://images.pexels.com/photos/8468036/pexels-photo-8468036.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
  skincare: "https://thumbs.dreamstime.com/b/skin-body-care-woman-getting-beauty-spa-face-massage-treatmen-close-up-young-treatment-salon-facial-treatment-63739125.jpg",
  manicure: "https://images.pexels.com/photos/18112333/pexels-photo-18112333/free-photo-of-woman-doing-her-nails-at-the-beauty-salon.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500",
  braids: "https://i.pinimg.com/originals/a8/8a/83/a88a8326c18ab4b8476141794f305b39.jpg",
  waxing: "https://esthetichaus.com/wp-content/uploads/2023/09/fw1.jpg",
  combos: "https://i0.wp.com/paradiseadventures.live/wp-content/uploads/2025/06/House-of-Barbaard_1.107.1.jpg?resize=1024,576&ssl=1",
};

const services = [
  // Haircuts
  { name: "Classic Gentleman's Cut", description: "Timeless scissor cut with comb finish and hot towel.", category: "Haircuts", priceKes: 700, durationMinutes: 40, isActive: true, imageUrl: IMG.haircut },
  { name: "Skin Fade", description: "Sharp skin-to-length fade for a clean modern look.", category: "Haircuts", priceKes: 800, durationMinutes: 45, isActive: true, imageUrl: IMG.fade },
  { name: "Taper Fade", description: "Gradual taper from short sides to a longer top.", category: "Haircuts", priceKes: 750, durationMinutes: 45, isActive: true, imageUrl: IMG.taperFade },
  { name: "Caesar Cut", description: "Short, even-length cut with a horizontal fringe.", category: "Haircuts", priceKes: 600, durationMinutes: 30, isActive: true, imageUrl: IMG.haircut },
  { name: "Kids' Haircut", description: "Gentle cut for children under 12 years old.", category: "Haircuts", priceKes: 450, durationMinutes: 25, isActive: true, imageUrl: IMG.haircut },

  // Beard Services
  { name: "Beard Trim & Shape", description: "Precision shaping and edging with a straight razor finish.", category: "Beard Services", priceKes: 500, durationMinutes: 25, isActive: true, imageUrl: IMG.beard },
  { name: "Full Beard Grooming", description: "Complete wash, condition, trim, shape and hot-towel treatment.", category: "Beard Services", priceKes: 800, durationMinutes: 40, isActive: true, imageUrl: IMG.beard },
  { name: "Hot Towel Shave", description: "Traditional straight-razor shave with hot towel and aftershave balm.", category: "Beard Services", priceKes: 600, durationMinutes: 30, isActive: true, imageUrl: IMG.beard },
  { name: "Beard Coloring", description: "Professional beard dye to cover greys or enhance natural color.", category: "Beard Services", priceKes: 1200, durationMinutes: 50, isActive: true, imageUrl: IMG.beard },

  // Hair Treatments
  { name: "Deep Conditioning Treatment", description: "Intense moisture mask to restore shine and elasticity.", category: "Hair Treatments", priceKes: 1000, durationMinutes: 45, isActive: true, imageUrl: IMG.hairTreatment },
  { name: "Scalp Treatment", description: "Exfoliating scalp scrub and nourishing serum for dandruff relief.", category: "Hair Treatments", priceKes: 900, durationMinutes: 40, isActive: true, imageUrl: IMG.hairTreatment },
  { name: "Keratin Smoothing", description: "Formaldehyde-free keratin treatment for frizz control.", category: "Hair Treatments", priceKes: 3500, durationMinutes: 120, isActive: true, imageUrl: IMG.hairTreatment },
  { name: "Hair Coloring", description: "Full head color using premium ammonia-free dyes.", category: "Hair Treatments", priceKes: 2500, durationMinutes: 90, isActive: true, imageUrl: IMG.hairColor },
  { name: "Highlights & Balayage", description: "Hand-painted highlights for a natural, sun-kissed effect.", category: "Hair Treatments", priceKes: 3200, durationMinutes: 105, isActive: true, imageUrl: IMG.hairColor },

  // Skincare
  { name: "Classic Facial", description: "Deep cleanse, steam, extraction and moisturizing mask.", category: "Skincare", priceKes: 1500, durationMinutes: 60, isActive: true, imageUrl: IMG.skincare },
  { name: "Anti-Aging Facial", description: "Collagen-boosting treatment targeting fine lines.", category: "Skincare", priceKes: 2200, durationMinutes: 75, isActive: true, imageUrl: IMG.skincare },
  { name: "Charcoal Detox Facial", description: "Activated charcoal mask to deep-cleanse pores.", category: "Skincare", priceKes: 1800, durationMinutes: 60, isActive: true, imageUrl: IMG.skincare },
  { name: "Men's Skin Refresh", description: "Quick 30-min facial designed for men: cleanse, scrub, moisturize.", category: "Skincare", priceKes: 1000, durationMinutes: 30, isActive: true, imageUrl: IMG.skincare },

  // Manicure & Pedicure
  { name: "Classic Manicure", description: "Nail shaping, cuticle care and buff with polish of choice.", category: "Manicure & Pedicure", priceKes: 700, durationMinutes: 35, isActive: true, imageUrl: IMG.manicure },
  { name: "Gel Manicure", description: "Long-lasting gel polish that cures under UV light.", category: "Manicure & Pedicure", priceKes: 1200, durationMinutes: 50, isActive: true, imageUrl: IMG.manicure },
  { name: "Classic Pedicure", description: "Foot soak, callus removal, nail trim and polish.", category: "Manicure & Pedicure", priceKes: 900, durationMinutes: 45, isActive: true, imageUrl: IMG.manicure },
  { name: "Luxury Spa Pedicure", description: "Exfoliation, paraffin wax wrap and hot-stone massage.", category: "Manicure & Pedicure", priceKes: 1600, durationMinutes: 70, isActive: true, imageUrl: IMG.manicure },
  { name: "Nail Art", description: "Custom nail designs — per hand, designs quoted on request.", category: "Manicure & Pedicure", priceKes: 500, durationMinutes: 30, isActive: true, imageUrl: IMG.manicure },

  // Hair Styling
  { name: "Blow Dry & Style", description: "Professional blow-dry with round-brush styling.", category: "Hair Styling", priceKes: 800, durationMinutes: 40, isActive: true, imageUrl: IMG.hairTreatment },
  { name: "Braiding", description: "Box braids, cornrows or twists — price varies by length.", category: "Hair Styling", priceKes: 2000, durationMinutes: 120, isActive: true, imageUrl: IMG.braids },
  { name: "Dreadlock Maintenance", description: "Re-twisting and locking for existing dreadlocks.", category: "Hair Styling", priceKes: 1500, durationMinutes: 90, isActive: true, imageUrl: IMG.braids },
  { name: "Updo & Special Occasion", description: "Elegant updos for weddings, graduations and events.", category: "Hair Styling", priceKes: 2500, durationMinutes: 90, isActive: true, imageUrl: IMG.braids },

  // Waxing
  { name: "Eyebrow Wax & Shape", description: "Precision waxing for perfectly arched brows.", category: "Waxing", priceKes: 400, durationMinutes: 20, isActive: true, imageUrl: IMG.waxing },
  { name: "Full Leg Wax", description: "Smooth, long-lasting hair removal for full legs.", category: "Waxing", priceKes: 2000, durationMinutes: 60, isActive: true, imageUrl: IMG.waxing },
  { name: "Underarm Wax", description: "Quick underarm hair removal for 4–6 week smoothness.", category: "Waxing", priceKes: 500, durationMinutes: 15, isActive: true, imageUrl: IMG.waxing },

  // Combos
  { name: "The Full Tally's Package", description: "Haircut + beard groom + facial + manicure. Our flagship experience.", category: "Combos", priceKes: 3500, durationMinutes: 150, isActive: true, imageUrl: IMG.combos },
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

  // --- Reviews ---
  console.log("⭐ Seeding reviews...");
  const existingReviews = await db.select({ id: schema.reviewsTable.id }).from(schema.reviewsTable);
  if (existingReviews.length === 0) {
    const allStaff = await db.select({ id: schema.staffTable.id }).from(schema.staffTable);
    const allServices = await db.select({ id: schema.servicesTable.id }).from(schema.servicesTable);
    const allCustomers = await db.select({ id: schema.customersTable.id }).from(schema.customersTable);

    if (allStaff.length > 0 && allServices.length > 0 && allCustomers.length > 0) {
      const customerId = allCustomers[0].id;

      const reviewData = [
        {
          customerId,
          staffId: allStaff[0]?.id,
          serviceId: allServices[0]?.id,
          rating: 5,
          comment: "Absolutely incredible experience! Tally gave me the best skin fade I've ever had. The attention to detail is unmatched — crisp lines, perfect blend. The studio has such a professional yet relaxed vibe. I'm a customer for life!",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[1]?.id,
          serviceId: allServices[12]?.id ?? allServices[0].id,
          rating: 5,
          comment: "Amina transformed my hair completely. The balayage looks so natural and the keratin treatment has my hair smoother than ever. She really listens to what you want and delivers beyond expectations. Already booked my next appointment!",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[2]?.id,
          serviceId: allServices[1]?.id ?? allServices[0].id,
          rating: 5,
          comment: "Brian is a wizard with fades. Showed him a reference photo and he nailed it perfectly — even better than the picture. The hot towel finish was so relaxing. Best barbershop in Nairobi, hands down.",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[3]?.id,
          serviceId: allServices[14]?.id ?? allServices[0].id,
          rating: 5,
          comment: "Grace's facial left my skin glowing for days! She was so gentle and knowledgeable about skincare. The gel manicure is still going strong three weeks later. Tally's is the full package — highly recommend to everyone!",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[4]?.id,
          serviceId: allServices[2]?.id ?? allServices[0].id,
          rating: 4,
          comment: "Kevin did a great taper fade and the lineup is super clean. The studio is spotless and the staff are friendly. Pricing is fair for the quality you get. Will definitely be coming back regularly.",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[0]?.id,
          serviceId: allServices[5]?.id ?? allServices[0].id,
          rating: 5,
          comment: "I came in for a beard trim and left feeling like a completely new person. Tally takes his time and makes sure every detail is perfect. The whole team is warm and welcoming. This place is a hidden gem!",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[1]?.id,
          serviceId: allServices[13]?.id ?? allServices[0].id,
          rating: 4,
          comment: "The hair colouring turned out exactly as I envisioned. Amina was patient and walked me through the whole process. The salon is clean and well-equipped. Slightly long wait but absolutely worth it!",
          status: "approved",
        },
        {
          customerId,
          staffId: allStaff[3]?.id,
          serviceId: allServices[19]?.id ?? allServices[0].id,
          rating: 5,
          comment: "Grace did my nails and I cannot stop staring at them! The nail art design she created was so unique and beautiful. She's incredibly talented and so friendly. Tally's is now my go-to for everything beauty.",
          status: "approved",
        },
      ];

      await db.insert(schema.reviewsTable).values(reviewData);
      console.log(`   ✓ Inserted ${reviewData.length} approved reviews\n`);
    } else {
      console.log("   ⚠  Skipping reviews — no customers/staff/services found\n");
    }
  } else {
    console.log(`   ⏭  ${existingReviews.length} reviews already exist, skipping\n`);
  }

  console.log("✅ Seed complete!");
  await pool.end();
}

seed().catch(async (err) => {
  console.error("❌ Seed failed:", err);
  await pool.end();
  process.exit(1);
});
