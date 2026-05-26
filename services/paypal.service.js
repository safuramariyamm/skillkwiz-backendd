const axios = require("axios");

const PAYPAL_BASE =
  process.env.PAYPAL_ENV === "production"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";

let cachedToken = null;
let tokenExpiry = null;

/**
 * ============================================
 * GET PAYPAL ACCESS TOKEN
 * ============================================
 */
const getAccessToken = async () => {
  // Return cached token if still valid
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET missing in .env"
    );
  }

  const credentials = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  try {
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v1/oauth2/token`,
      "grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
      }
    );

    cachedToken = data.access_token;

    // Cache token for reuse
    tokenExpiry =
      Date.now() + (data.expires_in - 60) * 1000;

    return cachedToken;
  } catch (err) {
    console.error(
      "PAYPAL AUTH ERROR:",
      err.response?.data || err.message
    );

    throw new Error(
      err.response?.data?.error_description ||
        "PayPal authentication failed"
    );
  }
};

/**
 * ============================================
 * CREATE PAYPAL ORDER
 * ============================================
 */
const createOrder = async (
  amount,
  credits,
  planName,
  idempotencyKey
) => {
  const token = await getAccessToken();

  const payload = {
    intent: "CAPTURE",

    purchase_units: [
      {
        amount: {
          currency_code: "USD",

          // IMPORTANT FIX
          value: Number(amount).toFixed(2),
        },

        description: `SkillKwiz - ${planName} (${credits} assessment credits)`,

        custom_id: idempotencyKey,
      },
    ],

    application_context: {
      brand_name: "SkillKwiz",

      landing_page: "BILLING",

      user_action: "PAY_NOW",

      return_url: `${process.env.FRONTEND_URL}/employer/payment/success`,

      cancel_url: `${process.env.FRONTEND_URL}/employer/payment/cancel`,
    },
  };

  // DEBUG LOG
  console.log(
    "PAYPAL ORDER PAYLOAD:",
    JSON.stringify(payload, null, 2)
  );

  try {
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${token}`,

          "Content-Type": "application/json",

          "PayPal-Request-Id":
            idempotencyKey,
        },
      }
    );

    return data;
  } catch (err) {
    console.error(
      "PAYPAL CREATE ORDER ERROR:",
      err.response?.data || err.message
    );

    throw new Error(
      err.response?.data?.message ||
        "Failed to create PayPal order"
    );
  }
};

/**
 * ============================================
 * CAPTURE PAYMENT
 * ============================================
 */
const captureOrder = async (orderId) => {
  const token = await getAccessToken();

  try {
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`,
      {},
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return data;
  } catch (err) {
    console.error(
      "PAYPAL CAPTURE ERROR:",
      err.response?.data || err.message
    );

    throw new Error(
      err.response?.data?.message ||
        "Failed to capture PayPal payment"
    );
  }
};

/**
 * ============================================
 * VERIFY WEBHOOK SIGNATURE
 * ============================================
 */
const verifyWebhookSignature = async (
  headers,
  rawBody
) => {
  const token = await getAccessToken();

  try {
    const { data } = await axios.post(
      `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo:
          headers["paypal-auth-algo"],

        cert_url:
          headers["paypal-cert-url"],

        transmission_id:
          headers["paypal-transmission-id"],

        transmission_sig:
          headers["paypal-transmission-sig"],

        transmission_time:
          headers["paypal-transmission-time"],

        webhook_id:
          process.env.PAYPAL_WEBHOOK_ID,

        webhook_event: JSON.parse(rawBody),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    return (
      data.verification_status === "SUCCESS"
    );
  } catch (err) {
    console.error(
      "PAYPAL WEBHOOK VERIFY ERROR:",
      err.response?.data || err.message
    );

    return false;
  }
};

module.exports = {
  createOrder,
  captureOrder,
  verifyWebhookSignature,
};