const axios = require("axios");

// Support PAYPAL_BASE_URL directly (Railway), OR derive from PAYPAL_ENV
const PAYPAL_BASE =
  process.env.PAYPAL_BASE_URL ||
  (process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com");

console.log(`[PayPal] Using base URL: ${PAYPAL_BASE} (env=${process.env.PAYPAL_ENV || "sandbox"})`);

let cachedToken = null;
let tokenExpiry = null;

const getAccessToken = async () => {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET missing in .env");
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  try {
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    cachedToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
    return cachedToken;
  } catch (err) {
    const msg = err.response?.data?.error_description || err.message;
    throw new Error(`PayPal auth failed (${PAYPAL_BASE}): ${msg}`);
  }
};

const createOrder = async (amount, credits, planName, idempotencyKey) => {
  const token = await getAccessToken();
  try {
    console.log("[PayPal] Creating order", {
      amount,
      credits,
      planName,
      idempotencyKey,
    });
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      {
        intent: "CAPTURE",
        purchase_units: [{
          amount: { currency_code: "USD", value: amount.toFixed(2) },
          description: `SkillKwiz - ${planName} (${credits} assessment credits)`,
          custom_id: idempotencyKey,
        }],
        application_context: {
          brand_name: "SkillKwiz",
          landing_page: "BILLING",
          user_action: "PAY_NOW",
          return_url: `${process.env.FRONTEND_URL}/employer/payment/success`,
          cancel_url: `${process.env.FRONTEND_URL}/employer/payment/cancel`,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
        },
      }
    );
    console.log("[PayPal] Created order response", {
      id: data?.id,
      status: data?.status,
    });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`PayPal createOrder failed: ${msg}`);
  }
};

const captureOrder = async (orderId) => {
  const token = await getAccessToken();
  try {
    console.log("[PayPal] Capturing order", { orderId });
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
      {},
      { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
    );
    console.log("[PayPal] Capture response", {
      id: data?.id,
      status: data?.status,
      raw: data,
    });
    return data;
  } catch (err) {
    const msg = err.response?.data?.message || err.message;
    throw new Error(`PayPal captureOrder failed: ${msg}`);
  }
};

const verifyWebhookSignature = async (headers, rawBody) => {
  const token = await getAccessToken();
  const { data } = await axios.post(
    `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
    {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: JSON.parse(rawBody),
    },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );
  return data.verification_status === "SUCCESS";
};

module.exports = { createOrder, captureOrder, verifyWebhookSignature };