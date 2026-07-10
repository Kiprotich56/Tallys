import { db, pool } from "@workspace/db";
import { logger } from "./logger";

export async function runMigrations() {
  try {
    await pool.query(`
      -- Users: email verification + password reset
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_expires TIMESTAMPTZ;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMPTZ;

      -- Customers: admin notes + last interaction
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS admin_notes TEXT;
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_interaction TIMESTAMPTZ;

      -- Staff: social links
      ALTER TABLE staff ADD COLUMN IF NOT EXISTS social_links JSONB;

      -- Staff portfolio images
      CREATE TABLE IF NOT EXISTS staff_portfolio (
        id SERIAL PRIMARY KEY,
        staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        caption TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Commissions
      CREATE TABLE IF NOT EXISTS commissions (
        id SERIAL PRIMARY KEY,
        appointment_id INTEGER NOT NULL REFERENCES appointments(id),
        staff_id INTEGER NOT NULL REFERENCES staff(id),
        customer_id INTEGER NOT NULL REFERENCES customers(id),
        service_id INTEGER NOT NULL REFERENCES services(id),
        service_price_kes INTEGER NOT NULL,
        commission_pct REAL NOT NULL,
        commission_amount_kes INTEGER NOT NULL,
        salon_amount_kes INTEGER NOT NULL,
        payment_status TEXT NOT NULL DEFAULT 'pending',
        payment_date TIMESTAMPTZ,
        payment_notes TEXT,
        completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Service-specific commission rates
      CREATE TABLE IF NOT EXISTS service_commissions (
        id SERIAL PRIMARY KEY,
        service_id INTEGER NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        commission_pct REAL NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Contact form submissions
      CREATE TABLE IF NOT EXISTS contact_submissions (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT,
        message TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'unread',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Reviews: allow anonymous submissions (nullable customer_id + reviewer_name)
      ALTER TABLE reviews ALTER COLUMN customer_id DROP NOT NULL;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_commissions_staff_id ON commissions(staff_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_payment_status ON commissions(payment_status);
      CREATE INDEX IF NOT EXISTS idx_commissions_completed_at ON commissions(completed_at);
      CREATE INDEX IF NOT EXISTS idx_staff_portfolio_staff_id ON staff_portfolio(staff_id);
      -- Appointment reminders
      ALTER TABLE appointments ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN NOT NULL DEFAULT false;

      CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON appointments(staff_id, date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_appointments_reminder ON appointments(date, reminder_sent);
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

      -- Service images
      ALTER TABLE services ADD COLUMN IF NOT EXISTS image_url TEXT;

      UPDATE services SET image_url = 'https://images.squarespace-cdn.com/content/v1/6266605f2774c536bff0650a/1700556119441-423LUOKRP0CDZM0CXQUR/Drop+Fade+Haircut+(San+Francisco+Barbershop).png' WHERE name = 'Classic Gentleman''s Cut' AND image_url IS NULL;
      UPDATE services SET image_url = 'https://images.squarespace-cdn.com/content/v1/6266605f2774c536bff0650a/1700556122113-R90V0E0DX4TVYAFHCTPY/Low+Shadow+Fade+Haircut+(San+Francisco+Barbershop).png' WHERE name = 'Skin Fade' AND image_url IS NULL;
      UPDATE services SET image_url = 'https://www.manhattanbarbershopnyc.com/_next/image?url=/images/style-guide/low-fade-professional-style.webp&w=1920&q=75&dpl=dpl_71H5SjqfCGokXtjA5RnCU9rRLKxK' WHERE name = 'Taper Fade' AND image_url IS NULL;
      UPDATE services SET image_url = 'https://images.squarespace-cdn.com/content/v1/6266605f2774c536bff0650a/1700556119441-423LUOKRP0CDZM0CXQUR/Drop+Fade+Haircut+(San+Francisco+Barbershop).png' WHERE name = 'Caesar Cut' AND image_url IS NULL;
      UPDATE services SET image_url = 'https://images.squarespace-cdn.com/content/v1/6266605f2774c536bff0650a/1700556119441-423LUOKRP0CDZM0CXQUR/Drop+Fade+Haircut+(San+Francisco+Barbershop).png' WHERE name = 'Kids'' Haircut' AND image_url IS NULL;

      UPDATE services SET image_url = 'https://www.therazordoc.com/wp-content/uploads/2024/08/istockphoto-872361244-612x612-1.webp' WHERE category = 'Beard Services' AND image_url IS NULL;

      UPDATE services SET image_url = 'https://images.pexels.com/photos/3993331/pexels-photo-3993331.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' WHERE name IN ('Deep Conditioning Treatment', 'Scalp Treatment', 'Keratin Smoothing') AND image_url IS NULL;
      UPDATE services SET image_url = 'https://images.pexels.com/photos/8468036/pexels-photo-8468036.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' WHERE name IN ('Hair Coloring', 'Highlights & Balayage') AND image_url IS NULL;

      UPDATE services SET image_url = 'https://thumbs.dreamstime.com/b/skin-body-care-woman-getting-beauty-spa-face-massage-treatmen-close-up-young-treatment-salon-facial-treatment-63739125.jpg' WHERE category = 'Skincare' AND image_url IS NULL;

      UPDATE services SET image_url = 'https://images.pexels.com/photos/18112333/pexels-photo-18112333/free-photo-of-woman-doing-her-nails-at-the-beauty-salon.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' WHERE category = 'Manicure & Pedicure' AND image_url IS NULL;

      UPDATE services SET image_url = 'https://i.pinimg.com/originals/a8/8a/83/a88a8326c18ab4b8476141794f305b39.jpg' WHERE name IN ('Braiding', 'Dreadlock Maintenance', 'Updo & Special Occasion') AND image_url IS NULL;
      UPDATE services SET image_url = 'https://images.pexels.com/photos/3993331/pexels-photo-3993331.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500' WHERE name = 'Blow Dry & Style' AND image_url IS NULL;

      UPDATE services SET image_url = 'https://esthetichaus.com/wp-content/uploads/2023/09/fw1.jpg' WHERE category = 'Waxing' AND image_url IS NULL;

      UPDATE services SET image_url = 'https://i0.wp.com/paradiseadventures.live/wp-content/uploads/2025/06/House-of-Barbaard_1.107.1.jpg?resize=1024,576&ssl=1' WHERE category = 'Combos' AND image_url IS NULL;

      -- Enforce double-booking prevention atomically at the DB level. The
      -- app-level "check then insert" in appointments.ts has a race window
      -- between two concurrent requests for the same slot; this partial
      -- unique index (excluding cancelled bookings, which free up the slot)
      -- makes the second insert fail with a unique violation instead of
      -- silently creating a duplicate booking.
      CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_slot_unique
        ON appointments(staff_id, date, time_slot)
        WHERE status <> 'cancelled';

      -- Customer profile pictures
      ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT;
    `);
    logger.info("Database migrations completed successfully");
  } catch (err) {
    logger.error(err, "Migration failed");
    throw err;
  }
}
