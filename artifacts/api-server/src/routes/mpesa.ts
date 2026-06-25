import { Router, type IRouter } from "express";
import {
  InitiateMpesaPaymentBody,
  GetMpesaPaymentStatusQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// ─── In-memory payment status store ───────────────────────────────────────────
// Maps CheckoutRequestID → current status
interface PaymentRecord {
  status: "pending" | "success" | "failed";
  resultCode: string;
  resultDesc: string;
  createdAt: number;
}
const payments = new Map<string, PaymentRecord>();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("7") && digits.length === 9) return "254" + digits;
  return digits;
}

function isSimulationMode(): boolean {
  return !process.env.MPESA_CONSUMER_KEY || !process.env.MPESA_CONSUMER_SECRET;
}

function daraja(path: string): string {
  const env = process.env.MPESA_ENV ?? "sandbox";
  const base =
    env === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke";
  return `${base}${path}`;
}

async function getOAuthToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY!;
  const secret = process.env.MPESA_CONSUMER_SECRET!;
  const credentials = Buffer.from(`${key}:${secret}`).toString("base64");

  const res = await fetch(daraja("/oauth/v1/generate?grant_type=client_credentials"), {
    headers: { Authorization: `Basic ${credentials}` },
  });
  if (!res.ok) throw new Error(`OAuth failed: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

function buildTimestampAndPassword(): { timestamp: string; password: string } {
  const shortcode = process.env.MPESA_SHORTCODE ?? "174379";
  const passkey =
    process.env.MPESA_PASSKEY ??
    "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
  const timestamp = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, "")
    .slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
  return { timestamp, password };
}

// ─── POST /mpesa/stk-push ─────────────────────────────────────────────────────
router.post("/mpesa/stk-push", async (req, res) => {
  const parsed = InitiateMpesaPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { phone, amountKes, accountRef, description } = parsed.data;
  const normalizedPhone = normalizePhone(phone);

  // ── Simulation mode (no Daraja credentials configured) ──
  if (isSimulationMode()) {
    const checkoutRequestId = `ws_CO_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    payments.set(checkoutRequestId, {
      status: "pending",
      resultCode: "",
      resultDesc: "Waiting for customer",
      createdAt: Date.now(),
    });

    // Simulate success after 6 seconds
    setTimeout(() => {
      payments.set(checkoutRequestId, {
        status: "success",
        resultCode: "0",
        resultDesc: "The service request is processed successfully.",
        createdAt: Date.now(),
      });
    }, 6000);

    req.log.info({ checkoutRequestId, phone: normalizedPhone, amountKes }, "M-Pesa STK Push simulated");
    res.json({
      checkoutRequestId,
      merchantRequestId: `SIM-${Date.now()}`,
      responseCode: "0",
      responseDescription: "Success. Request accepted for processing",
      customerMessage: "Success. Request accepted for processing",
      simulated: true,
    });
    return;
  }

  // ── Real Daraja API ──
  try {
    const token = await getOAuthToken();
    const { timestamp, password } = buildTimestampAndPassword();
    const shortcode = process.env.MPESA_SHORTCODE!;
    const callbackUrl =
      process.env.MPESA_CALLBACK_URL ??
      `${process.env.REPLIT_DOMAINS?.split(",")[0] ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : "https://example.com"}/api/mpesa/callback`;

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.max(1, amountKes),
      PartyA: normalizedPhone,
      PartyB: shortcode,
      PhoneNumber: normalizedPhone,
      CallBackURL: callbackUrl,
      AccountReference: accountRef.slice(0, 12),
      TransactionDesc: description.slice(0, 13),
    };

    const stkRes = await fetch(daraja("/mpesa/stkpush/v1/processrequest"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!stkRes.ok) {
      const errText = await stkRes.text();
      req.log.error({ status: stkRes.status, body: errText }, "Daraja STK Push failed");
      res.status(503).json({ error: `M-Pesa service error: ${stkRes.status}` });
      return;
    }

    const data = (await stkRes.json()) as {
      CheckoutRequestID: string;
      MerchantRequestID: string;
      ResponseCode: string;
      ResponseDescription: string;
      CustomerMessage: string;
    };

    payments.set(data.CheckoutRequestID, {
      status: "pending",
      resultCode: "",
      resultDesc: "Waiting for payment",
      createdAt: Date.now(),
    });

    req.log.info({ checkoutRequestId: data.CheckoutRequestID, phone: normalizedPhone, amountKes }, "M-Pesa STK Push sent");
    res.json({
      checkoutRequestId: data.CheckoutRequestID,
      merchantRequestId: data.MerchantRequestID,
      responseCode: data.ResponseCode,
      responseDescription: data.ResponseDescription,
      customerMessage: data.CustomerMessage,
      simulated: false,
    });
  } catch (err) {
    req.log.error({ err }, "M-Pesa STK Push error");
    res.status(503).json({ error: "Failed to initiate M-Pesa payment. Please try again." });
  }
});

// ─── GET /mpesa/status ────────────────────────────────────────────────────────
router.get("/mpesa/status", async (req, res) => {
  const parsed = GetMpesaPaymentStatusQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "checkoutRequestId is required" });
    return;
  }

  const { checkoutRequestId } = parsed.data;
  const record = payments.get(checkoutRequestId);

  // If we have a cached result, return it
  if (record) {
    if (record.status !== "pending") {
      res.json({ status: record.status, resultCode: record.resultCode, resultDesc: record.resultDesc });
      return;
    }

    // In simulation mode, just return the current pending state (setTimeout will update it)
    if (isSimulationMode()) {
      res.json({ status: "pending", resultCode: "", resultDesc: "Waiting for customer" });
      return;
    }
  }

  // If no local record and not sim, query Daraja
  if (isSimulationMode()) {
    res.json({ status: "pending", resultCode: "", resultDesc: "Waiting for customer" });
    return;
  }

  try {
    const token = await getOAuthToken();
    const { timestamp, password } = buildTimestampAndPassword();
    const shortcode = process.env.MPESA_SHORTCODE!;

    const queryRes = await fetch(daraja("/mpesa/stkpushquery/v1/query"), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      }),
    });

    if (!queryRes.ok) {
      res.json({ status: "pending", resultCode: "", resultDesc: "Checking..." });
      return;
    }

    const data = (await queryRes.json()) as {
      ResultCode: string;
      ResultDesc: string;
    };

    const resultCode = String(data.ResultCode);
    const status: "pending" | "success" | "failed" =
      resultCode === "0" ? "success" :
      resultCode === "1032" ? "pending" :
      "failed";

    payments.set(checkoutRequestId, {
      status,
      resultCode,
      resultDesc: data.ResultDesc,
      createdAt: Date.now(),
    });

    res.json({ status, resultCode, resultDesc: data.ResultDesc });
  } catch (err) {
    req.log.error({ err }, "M-Pesa status query error");
    res.json({ status: "pending", resultCode: "", resultDesc: "Checking payment..." });
  }
});

// ─── POST /mpesa/callback ─────────────────────────────────────────────────────
router.post("/mpesa/callback", (req, res) => {
  try {
    const body = req.body as {
      Body?: {
        stkCallback?: {
          CheckoutRequestID?: string;
          ResultCode?: number;
          ResultDesc?: string;
        };
      };
    };

    const callback = body?.Body?.stkCallback;
    if (callback?.CheckoutRequestID) {
      const resultCode = String(callback.ResultCode ?? "");
      const status: "pending" | "success" | "failed" =
        resultCode === "0" ? "success" : "failed";

      payments.set(callback.CheckoutRequestID, {
        status,
        resultCode,
        resultDesc: callback.ResultDesc ?? "",
        createdAt: Date.now(),
      });

      req.log.info({ checkoutRequestId: callback.CheckoutRequestID, status }, "M-Pesa callback received");
    }
  } catch (err) {
    req.log.error({ err }, "M-Pesa callback parse error");
  }

  res.json({ ResultCode: 0, ResultDesc: "Accepted" });
});

export default router;
