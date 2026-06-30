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

      -- Indexes for performance
      CREATE INDEX IF NOT EXISTS idx_commissions_staff_id ON commissions(staff_id);
      CREATE INDEX IF NOT EXISTS idx_commissions_payment_status ON commissions(payment_status);
      CREATE INDEX IF NOT EXISTS idx_commissions_completed_at ON commissions(completed_at);
      CREATE INDEX IF NOT EXISTS idx_staff_portfolio_staff_id ON staff_portfolio(staff_id);
      CREATE INDEX IF NOT EXISTS idx_appointments_staff_date ON appointments(staff_id, date);
      CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
    `);
    logger.info("Database migrations completed successfully");
  } catch (err) {
    logger.error(err, "Migration failed");
    throw err;
  }
}
