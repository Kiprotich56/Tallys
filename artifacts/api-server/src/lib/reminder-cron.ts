import { pool } from "@workspace/db";
import { sendEmail, bookingReminderEmail } from "./email";
import { logger } from "./logger";

async function sendAppointmentReminders(): Promise<void> {
  // Use UTC+3 (Nairobi time) for "tomorrow" calculation
  const nowNairobi = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const tomorrowNairobi = new Date(nowNairobi.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowNairobi.toISOString().substring(0, 10);

  logger.info({ date: tomorrowStr }, "Running appointment reminder job");

  let rows: Array<{
    id: number;
    date: string;
    time_slot: string;
    customer_name: string;
    customer_email: string | null;
    service_name: string;
    staff_name: string;
  }>;

  try {
    const result = await pool.query(
      `SELECT
         a.id,
         a.date,
         a.time_slot,
         c.name  AS customer_name,
         c.email AS customer_email,
         s.name  AS service_name,
         st.name AS staff_name
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       JOIN services  s ON s.id = a.service_id
       JOIN staff    st ON st.id = a.staff_id
       WHERE a.date = $1
         AND a.status IN ('pending', 'scheduled', 'confirmed')
         AND a.reminder_sent = false`,
      [tomorrowStr],
    );
    rows = result.rows;
  } catch (err) {
    logger.error(err, "Reminder job: failed to query appointments");
    return;
  }

  logger.info({ count: rows.length, date: tomorrowStr }, "Reminder job: appointments found");

  for (const row of rows) {
    if (!row.customer_email) {
      logger.warn({ appointmentId: row.id }, "Reminder job: customer has no email, skipping");
      await markReminderSent(row.id);
      continue;
    }

    const emailData = bookingReminderEmail({
      customerName: row.customer_name,
      serviceName: row.service_name,
      staffName: row.staff_name,
      date: formatDate(row.date),
      timeSlot: row.time_slot,
    });

    const sent = await sendEmail({
      to: row.customer_email,
      subject: emailData.subject,
      html: emailData.html,
    });

    await markReminderSent(row.id);

    logger.info(
      { appointmentId: row.id, to: row.customer_email, sent },
      "Reminder job: reminder processed",
    );
  }
}

async function markReminderSent(appointmentId: number): Promise<void> {
  try {
    await pool.query(
      `UPDATE appointments SET reminder_sent = true WHERE id = $1`,
      [appointmentId],
    );
  } catch (err) {
    logger.error({ err, appointmentId }, "Reminder job: failed to mark reminder_sent");
  }
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

export function startReminderCron(): void {
  logger.info("Appointment reminder cron started (runs every hour)");

  // Run immediately on start to catch anything missed
  sendAppointmentReminders().catch((err) =>
    logger.error(err, "Reminder cron: initial run failed"),
  );

  setInterval(() => {
    sendAppointmentReminders().catch((err) =>
      logger.error(err, "Reminder cron: interval run failed"),
    );
  }, INTERVAL_MS);
}
