import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_ID = process.env.WHATSAPP_PHONE_ID;
const META_API_VERSION = "v19.0";

interface SendMessageBody {
  to: string;
  message: string;
}

interface AppointmentNotificationBody {
  to: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  date: string;
  timeSlot: string;
  totalKes: number;
  type: "confirmation" | "reminder" | "cancellation";
}

function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("0")) return "254" + cleaned.slice(1);
  if (cleaned.startsWith("254")) return cleaned;
  return "254" + cleaned;
}

async function sendWhatsAppMessage(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; simulated?: boolean }> {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_ID) {
    logger.info({ to, message }, "WhatsApp simulation mode: message would be sent");
    return { success: true, messageId: `sim_${Date.now()}`, simulated: true };
  }

  const phone = normalizePhone(to);
  const url = `https://graph.facebook.com/${META_API_VERSION}/${WHATSAPP_PHONE_ID}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: message },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    logger.error({ err, phone }, "WhatsApp API error");
    return { success: false, error: err };
  }

  const data = await response.json() as { messages?: { id: string }[] };
  const messageId = data.messages?.[0]?.id;
  return { success: true, messageId };
}

router.post("/whatsapp/send", async (req, res): Promise<void> => {
  const { to, message } = req.body as SendMessageBody;

  if (!to || !message) {
    res.status(400).json({ error: "to and message are required" });
    return;
  }

  const result = await sendWhatsAppMessage(to, message);
  if (!result.success) {
    res.status(502).json({ error: result.error ?? "Failed to send message" });
    return;
  }

  res.json({ ok: true, messageId: result.messageId, simulated: result.simulated ?? false });
});

router.post("/whatsapp/send-appointment", async (req, res): Promise<void> => {
  const body = req.body as AppointmentNotificationBody;

  const { to, customerName, serviceName, staffName, date, timeSlot, totalKes, type } = body;

  if (!to || !customerName || !serviceName || !date || !timeSlot) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  let message = "";
  const formattedDate = new Date(date).toLocaleDateString("en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (type === "confirmation") {
    message = `✅ *Appointment Confirmed!*\n\nHi ${customerName},\n\nYour appointment at *Tally's Barbershop & Beauty Studio* has been confirmed.\n\n📅 *Date:* ${formattedDate}\n⏰ *Time:* ${timeSlot}\n✂️ *Service:* ${serviceName}\n👤 *Stylist:* ${staffName}\n💰 *Total:* KSh ${totalKes.toLocaleString()}\n\nPlease arrive 5 minutes early. See you soon! 💈`;
  } else if (type === "reminder") {
    message = `⏰ *Appointment Reminder*\n\nHi ${customerName},\n\nThis is a friendly reminder about your appointment tomorrow at *Tally's Barbershop & Beauty Studio*.\n\n📅 *Date:* ${formattedDate}\n⏰ *Time:* ${timeSlot}\n✂️ *Service:* ${serviceName}\n👤 *Stylist:* ${staffName}\n\nSee you tomorrow! 💈`;
  } else if (type === "cancellation") {
    message = `❌ *Appointment Cancelled*\n\nHi ${customerName},\n\nYour appointment on ${formattedDate} at ${timeSlot} for *${serviceName}* has been cancelled.\n\nTo rebook, visit us at tallys.co.ke or reply to this message.\n\nSorry for any inconvenience. 🙏`;
  }

  const result = await sendWhatsAppMessage(to, message);
  if (!result.success) {
    res.status(502).json({ error: result.error ?? "Failed to send message" });
    return;
  }

  res.json({ ok: true, messageId: result.messageId, simulated: result.simulated ?? false, message });
});

router.get("/whatsapp/status", (_req, res): void => {
  const configured = !!(WHATSAPP_TOKEN && WHATSAPP_PHONE_ID);
  res.json({
    configured,
    mode: configured ? "live" : "simulation",
    phoneId: WHATSAPP_PHONE_ID ?? null,
  });
});

export default router;
