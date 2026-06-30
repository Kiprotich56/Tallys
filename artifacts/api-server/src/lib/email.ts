import nodemailer from "nodemailer";
import { logger } from "./logger";

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT ?? "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL ?? "noreply@tallys.co.ke";
const FROM_NAME = process.env.FROM_NAME ?? "Tally's Barbershop";

function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info({ to: opts.to, subject: opts.subject }, "[EMAIL DEV] Would send email:");
    return false;
  }
  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    logger.error(err, "Failed to send email");
    return false;
  }
}

export function bookingConfirmationEmail(data: {
  customerName: string;
  serviceName: string;
  staffName: string;
  date: string;
  timeSlot: string;
  totalKes: number;
}) {
  return {
    subject: `Booking Confirmed – ${data.serviceName} at Tally's`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:8px;overflow:hidden">
        <div style="background:#D4AF37;padding:24px;text-align:center">
          <h1 style="color:#0a0a0a;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
          <p style="color:#0a0a0a;margin:8px 0 0">Booking Confirmed</p>
        </div>
        <div style="padding:32px">
          <p style="font-size:16px">Hi <strong>${data.customerName}</strong>,</p>
          <p>Your appointment has been confirmed. Here are your details:</p>
          <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;width:140px">Service</td><td style="color:#fff;font-weight:bold">${data.serviceName}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Staff</td><td style="color:#fff">${data.staffName}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Date</td><td style="color:#fff">${data.date}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Time</td><td style="color:#fff">${data.timeSlot}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Amount</td><td style="color:#D4AF37;font-weight:bold">KSh ${data.totalKes.toLocaleString()}</td></tr>
            </table>
          </div>
          <p style="color:#999;font-size:13px">📍 Location: Nairobi CBD, Kenya<br>📞 Need to reschedule? Contact us at least 2 hours before your appointment.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px">
          © ${new Date().getFullYear()} Tally's Barbershop & Beauty Studio
        </div>
      </div>
    `,
  };
}

export function bookingReminderEmail(data: {
  customerName: string;
  serviceName: string;
  staffName: string;
  date: string;
  timeSlot: string;
}) {
  return {
    subject: `Reminder: Your appointment tomorrow at Tally's`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:8px;overflow:hidden">
        <div style="background:#D4AF37;padding:24px;text-align:center">
          <h1 style="color:#0a0a0a;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
          <p style="color:#0a0a0a;margin:8px 0 0">Appointment Reminder</p>
        </div>
        <div style="padding:32px">
          <p>Hi <strong>${data.customerName}</strong>, just a reminder about your appointment tomorrow!</p>
          <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;width:140px">Service</td><td style="color:#fff;font-weight:bold">${data.serviceName}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Staff</td><td style="color:#fff">${data.staffName}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Date</td><td style="color:#fff">${data.date}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Time</td><td style="color:#D4AF37;font-weight:bold">${data.timeSlot}</td></tr>
            </table>
          </div>
          <p style="color:#999;font-size:13px">See you soon! Please arrive 5 minutes early.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px">
          © ${new Date().getFullYear()} Tally's Barbershop & Beauty Studio
        </div>
      </div>
    `,
  };
}

export function bookingCancellationEmail(data: {
  customerName: string;
  serviceName: string;
  date: string;
  timeSlot: string;
}) {
  return {
    subject: `Appointment Cancelled – Tally's Barbershop`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:8px;overflow:hidden">
        <div style="background:#ef4444;padding:24px;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
          <p style="color:#fff;margin:8px 0 0">Appointment Cancelled</p>
        </div>
        <div style="padding:32px">
          <p>Hi <strong>${data.customerName}</strong>, your appointment has been cancelled.</p>
          <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0">
            <table style="width:100%;border-collapse:collapse">
              <tr><td style="padding:8px 0;color:#999;width:140px">Service</td><td style="color:#fff">${data.serviceName}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Date</td><td style="color:#fff">${data.date}</td></tr>
              <tr><td style="padding:8px 0;color:#999">Time</td><td style="color:#fff">${data.timeSlot}</td></tr>
            </table>
          </div>
          <p><a href="${process.env.APP_URL ?? "https://tallys.co.ke"}/book" style="background:#D4AF37;color:#0a0a0a;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">Book Again</a></p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px">
          © ${new Date().getFullYear()} Tally's Barbershop & Beauty Studio
        </div>
      </div>
    `,
  };
}

export function emailVerificationEmail(data: { name: string; verificationUrl: string }) {
  return {
    subject: `Verify your email – Tally's Barbershop`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:8px;overflow:hidden">
        <div style="background:#D4AF37;padding:24px;text-align:center">
          <h1 style="color:#0a0a0a;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
          <p style="color:#0a0a0a;margin:8px 0 0">Verify Your Email</p>
        </div>
        <div style="padding:32px;text-align:center">
          <p>Hi <strong>${data.name}</strong>, thanks for signing up!</p>
          <p>Please verify your email address to complete your registration and start booking appointments.</p>
          <a href="${data.verificationUrl}" style="display:inline-block;background:#D4AF37;color:#0a0a0a;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">Verify Email</a>
          <p style="color:#666;font-size:12px;margin-top:24px">This link expires in 24 hours. If you didn't sign up, ignore this email.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px">
          © ${new Date().getFullYear()} Tally's Barbershop & Beauty Studio
        </div>
      </div>
    `,
  };
}

export function passwordResetEmail(data: { name: string; resetUrl: string }) {
  return {
    subject: `Reset your password – Tally's Barbershop`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:8px;overflow:hidden">
        <div style="background:#D4AF37;padding:24px;text-align:center">
          <h1 style="color:#0a0a0a;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
          <p style="color:#0a0a0a;margin:8px 0 0">Password Reset</p>
        </div>
        <div style="padding:32px;text-align:center">
          <p>Hi <strong>${data.name}</strong>, we received a request to reset your password.</p>
          <a href="${data.resetUrl}" style="display:inline-block;background:#D4AF37;color:#0a0a0a;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">Reset Password</a>
          <p style="color:#666;font-size:12px;margin-top:24px">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
        </div>
        <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px">
          © ${new Date().getFullYear()} Tally's Barbershop & Beauty Studio
        </div>
      </div>
    `,
  };
}
