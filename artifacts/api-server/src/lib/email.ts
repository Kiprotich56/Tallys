import nodemailer from "nodemailer";
import { logger } from "./logger";

const GMAIL_USER = process.env.GMAIL_USER;
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD;
const APP_URL = process.env.APP_URL ?? "https://tallys.co.ke";
const FROM = `"Tally's Barbershop" <${GMAIL_USER ?? "noreply@tallys.co.ke"}>`;

function createTransporter() {
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
    return null;
  }
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: GMAIL_USER,
      pass: GMAIL_APP_PASSWORD,
    },
  });
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) {
    logger.info({ to, subject }, "[EMAIL] SMTP not configured — would send email");
    return false;
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
    logger.info({ to, subject }, "[EMAIL] Sent successfully");
    return true;
  } catch (err) {
    logger.error({ err, to, subject }, "[EMAIL] Failed to send");
    return false;
  }
}

const BASE_STYLES = `font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0a0a0a;color:#e5e5e5;border-radius:8px;overflow:hidden`;
const HEADER = (subtitle: string) => `
  <div style="background:#D4AF37;padding:24px;text-align:center">
    <h1 style="color:#0a0a0a;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
    <p style="color:#0a0a0a;margin:8px 0 0">${subtitle}</p>
  </div>`;
const FOOTER = `
  <div style="padding:16px;text-align:center;background:#111;color:#666;font-size:12px">
    © ${new Date().getFullYear()} Tally's Barbershop &amp; Beauty Studio · Nairobi, Kenya
  </div>`;
const BTN = (href: string, label: string) =>
  `<a href="${href}" style="display:inline-block;background:#D4AF37;color:#0a0a0a;padding:14px 32px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;margin:16px 0">${label}</a>`;
const ROW = (label: string, value: string, color = "#fff") =>
  `<tr><td style="padding:8px 0;color:#999;width:140px">${label}</td><td style="color:${color};font-weight:bold">${value}</td></tr>`;

export async function sendVerificationEmail(
  to: string,
  data: { name: string; verificationUrl: string },
): Promise<boolean> {
  const html = `
    <div style="${BASE_STYLES}">
      ${HEADER("Verify Your Email")}
      <div style="padding:32px;text-align:center">
        <p style="font-size:16px">Hi <strong>${data.name}</strong>, thanks for signing up!</p>
        <p style="color:#aaa">Please verify your email address to activate your account and start booking appointments.</p>
        ${BTN(data.verificationUrl, "Verify Email Address")}
        <p style="color:#666;font-size:12px;margin-top:24px">
          This link expires in <strong>24 hours</strong>.<br>
          If you didn't create an account, you can safely ignore this email.
        </p>
      </div>
      ${FOOTER}
    </div>`;
  return send(to, "Verify your email – Tally's Barbershop", html);
}

export async function sendPasswordResetEmail(
  to: string,
  data: { name: string; resetUrl: string },
): Promise<boolean> {
  const html = `
    <div style="${BASE_STYLES}">
      ${HEADER("Password Reset")}
      <div style="padding:32px;text-align:center">
        <p style="font-size:16px">Hi <strong>${data.name}</strong>,</p>
        <p style="color:#aaa">We received a request to reset your password. Click the button below to choose a new one.</p>
        ${BTN(data.resetUrl, "Reset Password")}
        <p style="color:#666;font-size:12px;margin-top:24px">
          This link expires in <strong>1 hour</strong>.<br>
          If you didn't request a password reset, no action is needed — your account remains secure.
        </p>
      </div>
      ${FOOTER}
    </div>`;
  return send(to, "Reset your password – Tally's Barbershop", html);
}

export async function sendBookingConfirmationEmail(
  to: string,
  data: {
    customerName: string;
    serviceName: string;
    staffName: string;
    date: string;
    timeSlot: string;
    totalKes: number;
  },
): Promise<boolean> {
  const bookUrl = `${APP_URL}/book`;
  const html = `
    <div style="${BASE_STYLES}">
      ${HEADER("Booking Confirmed")}
      <div style="padding:32px">
        <p style="font-size:16px">Hi <strong>${data.customerName}</strong>,</p>
        <p>Your appointment has been confirmed. Here are your details:</p>
        <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0">
          <table style="width:100%;border-collapse:collapse">
            ${ROW("Service", data.serviceName)}
            ${ROW("Stylist", data.staffName)}
            ${ROW("Date", data.date)}
            ${ROW("Time", data.timeSlot)}
            ${ROW("Amount", `KSh ${data.totalKes.toLocaleString()}`, "#D4AF37")}
          </table>
        </div>
        <p style="color:#999;font-size:13px">
          📍 <strong>Location:</strong> Nairobi CBD, Kenya<br>
          🕐 Please arrive <strong>5 minutes early</strong>.<br>
          📞 Need to reschedule? Contact us at least 2 hours before your appointment.
        </p>
      </div>
      ${FOOTER}
    </div>`;
  return send(to, `Booking Confirmed – ${data.serviceName} at Tally's`, html);
}

export async function sendBookingCancellationEmail(
  to: string,
  data: {
    customerName: string;
    serviceName: string;
    date: string;
    timeSlot: string;
  },
): Promise<boolean> {
  const bookUrl = `${APP_URL}/book`;
  const html = `
    <div style="${BASE_STYLES}">
      <div style="background:#ef4444;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
        <p style="color:#fff;margin:8px 0 0">Appointment Cancelled</p>
      </div>
      <div style="padding:32px">
        <p style="font-size:16px">Hi <strong>${data.customerName}</strong>,</p>
        <p>Your appointment has been cancelled.</p>
        <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0">
          <table style="width:100%;border-collapse:collapse">
            ${ROW("Service", data.serviceName)}
            ${ROW("Date", data.date)}
            ${ROW("Time", data.timeSlot)}
          </table>
        </div>
        <p style="text-align:center">
          ${BTN(bookUrl, "Book Another Appointment")}
        </p>
        <p style="color:#999;font-size:13px;text-align:center">
          We hope to see you again soon!
        </p>
      </div>
      ${FOOTER}
    </div>`;
  return send(to, "Appointment Cancelled – Tally's Barbershop", html);
}

export async function sendSecurityNotificationEmail(
  to: string,
  data: { name: string; action: string; details?: string },
): Promise<boolean> {
  const html = `
    <div style="${BASE_STYLES}">
      <div style="background:#1e3a5f;padding:24px;text-align:center">
        <h1 style="color:#fff;margin:0;font-size:24px">✂️ Tally's Barbershop</h1>
        <p style="color:#93c5fd;margin:8px 0 0">Security Notice</p>
      </div>
      <div style="padding:32px">
        <p style="font-size:16px">Hi <strong>${data.name}</strong>,</p>
        <p>We're letting you know that the following action was performed on your account:</p>
        <div style="background:#1a1a1a;border-radius:8px;padding:20px;margin:20px 0;border-left:4px solid #3b82f6">
          <p style="margin:0;font-weight:bold;color:#93c5fd">${data.action}</p>
          ${data.details ? `<p style="margin:8px 0 0;color:#aaa;font-size:13px">${data.details}</p>` : ""}
        </div>
        <p style="color:#999;font-size:13px">
          If this was you, no further action is needed.<br>
          If you did <strong>not</strong> perform this action, please contact us immediately or reset your password.
        </p>
      </div>
      ${FOOTER}
    </div>`;
  return send(to, "Security notice – Tally's Barbershop", html);
}
