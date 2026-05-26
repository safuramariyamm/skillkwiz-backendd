const axios = require("axios");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");

// ─── PhonePe API Config ────────────────────────────────────────────────────────
const PHONEPE_BASE =
  process.env.PHONEPE_ENV === "production"
    ? "https://api.phonepe.com/apis/hermes"
    : "https://api-preprod.phonepe.com/apis/pg-sandbox";

const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID;
const SALT_KEY = process.env.PHONEPE_SALT_KEY;
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || "1";

/**
 * ============================================================
 * GENERATE SHA256 CHECKSUM
 * PhonePe checksum = SHA256(base64Payload + "/pg/v1/pay" + saltKey) + "###" + saltIndex
 * ============================================================
 */
const generateChecksum = (base64Payload, endpoint) => {
  const dataToHash = `${base64Payload}${endpoint}${SALT_KEY}`;
  const sha256Hash = crypto.createHash("sha256").update(dataToHash).digest("hex");
  return `${sha256Hash}###${SALT_INDEX}`;
};

/**
 * ============================================================
 * VERIFY CALLBACK CHECKSUM
 * For callbacks: SHA256(base64Response + saltKey) + "###" + saltIndex
 * ============================================================
 */
const verifyChecksum = (base64Response, receivedChecksum) => {
  if (!base64Response || !receivedChecksum) return false;

  const dataToHash = `${base64Response}${SALT_KEY}`;
  const sha256Hash = crypto.createHash("sha256").update(dataToHash).digest("hex");
  const expectedChecksum = `${sha256Hash}###${SALT_INDEX}`;

  return expectedChecksum === receivedChecksum;
};

/**
 * ============================================================
 * INITIATE PAYMENT
 * Creates a PhonePe payment session and returns redirect URL
 * ============================================================
 */
const initiatePayment = async ({
  merchantTransactionId,
  amount, // in INR (integer paise: 100 = ₹1)
  userId,
  planName,
  mobileNumber,
  callbackUrl,
  redirectUrl,
}) => {
  if (!MERCHANT_ID || !SALT_KEY) {
    throw new Error("PHONEPE_MERCHANT_ID or PHONEPE_SALT_KEY missing in .env");
  }

  const payload = {
    merchantId: MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: `MUID-${userId}`,
    amount, // amount in paise
    redirectUrl,
    redirectMode: "REDIRECT",
    callbackUrl,
    mobileNumber: mobileNumber || "",
    paymentInstrument: {
      type: "PAY_PAGE",
    },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum = generateChecksum(base64Payload, "/pg/v1/pay");

  try {
    const { data } = await axios.post(
      `${PHONEPE_BASE}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
      }
    );

    if (!data.success) {
      console.error("PHONEPE INITIATE ERROR:", data);
      throw new Error(data.message || "PhonePe payment initiation failed");
    }

    return {
      success: true,
      merchantTransactionId,
      redirectUrl: data.data?.instrumentResponse?.redirectInfo?.url,
      phonepeData: data.data,
    };
  } catch (err) {
    console.error("PHONEPE INITIATE EXCEPTION:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || "PhonePe initiation failed");
  }
};

/**
 * ============================================================
 * CHECK PAYMENT STATUS (Poll / Verify)
 * Used to verify payment after redirect or callback
 * ============================================================
 */
const checkPaymentStatus = async (merchantTransactionId) => {
  if (!MERCHANT_ID || !SALT_KEY) {
    throw new Error("PHONEPE_MERCHANT_ID or PHONEPE_SALT_KEY missing in .env");
  }

  const endpoint = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`;
  const dataToHash = `${endpoint}${SALT_KEY}`;
  const sha256Hash = crypto.createHash("sha256").update(dataToHash).digest("hex");
  const checksum = `${sha256Hash}###${SALT_INDEX}`;

  try {
    const { data } = await axios.get(`${PHONEPE_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": MERCHANT_ID,
        accept: "application/json",
      },
    });

    return data;
  } catch (err) {
    console.error("PHONEPE STATUS ERROR:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "PhonePe status check failed");
  }
};

/**
 * ============================================================
 * INITIATE REFUND
 * ============================================================
 */
const initiateRefund = async ({
  originalMerchantTransactionId,
  refundMerchantTransactionId,
  amount,
  callbackUrl,
}) => {
  const payload = {
    merchantId: MERCHANT_ID,
    merchantUserId: `REFUND-${Date.now()}`,
    originalTransactionId: originalMerchantTransactionId,
    merchantTransactionId: refundMerchantTransactionId,
    amount,
    callbackUrl,
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString("base64");
  const checksum = generateChecksum(base64Payload, "/pg/v1/refund");

  try {
    const { data } = await axios.post(
      `${PHONEPE_BASE}/pg/v1/refund`,
      { request: base64Payload },
      {
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          accept: "application/json",
        },
      }
    );

    return data;
  } catch (err) {
    console.error("PHONEPE REFUND ERROR:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "PhonePe refund failed");
  }
};

module.exports = {
  initiatePayment,
  checkPaymentStatus,
  initiateRefund,
  verifyChecksum,
  generateChecksum,
};