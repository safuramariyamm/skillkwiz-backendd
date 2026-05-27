const { v4: uuidv4 } = require("uuid");
const Employer = require("../models/Employer.model");
const Transaction = require("../models/Transaction.model");
const CreditLedger = require("../models/CreditLedger.model");
const paypalService = require("../services/paypal.service");
const phonePeService = require("../services/phonepe.service");
const creditService = require("../services/credit.service");

// ─── Pricing Plans ────────────────────────────────────────────────────────────
const PLANS = {
  starter: {
    name: "Starter",
    credits: 10,
    amountUSD: 29,
    amountINR: 2499,
    usdPerCredit: 2.9,
    inrPerCredit: 249.9,
  },
  growth: {
    name: "Growth",
    credits: 30,
    amountUSD: 79,
    amountINR: 6499,
    usdPerCredit: 2.63,
    inrPerCredit: 216.6,
  },
  enterprise: {
    name: "Enterprise",
    credits: 100,
    amountUSD: 199,
    amountINR: 16499,
    usdPerCredit: 1.99,
    inrPerCredit: 164.99,
  },
};

// ─── GET /api/payments/plans ──────────────────────────────────────────────────
const getPlans = (req, res) => {
  res.json({ success: true, data: PLANS });
};

// ─── POST /api/payments/create-order (PayPal) ─────────────────────────────────
const createOrder = async (req, res, next) => {
  try {
    const { planId } = req.body;

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan selected" });
    }

    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found" });
    }

    // ── Delete any stale pending PayPal transactions for this employer+plan ──
    // This prevents duplicate idempotencyKey errors when the user retries.
    await Transaction.deleteMany({
      employerId: employer._id,
      paymentGateway: "paypal",
      paymentStatus: "pending",
    });

    // Always use a fresh unique key — never reuse across attempts
    const idempotencyKey = `pp-${employer._id}-${planId}-${uuidv4()}`;

    const order = await paypalService.createOrder(
      plan.amountUSD,
      plan.credits,
      plan.name,
      idempotencyKey
    );

    await Transaction.create({
      employerId: employer._id,
      amount: plan.amountUSD,
      currency: "USD",
      paymentGateway: "paypal",
      paypalOrderId: order.id,
      creditsPurchased: plan.credits,
      paymentStatus: "pending",
      planName: plan.name,
      idempotencyKey,
    });

    console.log("[PayPal] create-order -> created transaction and order", {
      employerId: employer._id.toString(),
      planId,
      paypalOrderId: order.id,
    });

    res.json({
      success: true,
      data: {
        orderId: order.id,
        approveUrl: order.links?.find((l) => l.rel === "approve")?.href,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/capture-order (PayPal) ────────────────────────────────
const captureOrder = async (req, res, next) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" });
    }

    console.log("[PayPal] capture-order -> incoming", { orderId });

    const transaction = await Transaction.findOne({ paypalOrderId: orderId });
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Idempotent — already processed
    if (transaction.paymentStatus === "completed") {
      return res.json({
        success: true,
        message: "Payment already processed",
        data: transaction,
      });
    }

    const capture = await paypalService.captureOrder(orderId);

    console.log("[PayPal] capture-order -> PayPal response summary", {
      id: capture?.id,
      status: capture?.status,
    });

    if (capture.status !== "COMPLETED") {
      await Transaction.findByIdAndUpdate(transaction._id, { paymentStatus: "failed" });
      return res.status(400).json({ success: false, message: "Payment capture failed" });
    }

    const captureUnit = capture.purchase_units[0].payments.captures[0];

    await Transaction.findByIdAndUpdate(transaction._id, {
      paymentStatus: "completed",
      paypalCaptureId: captureUnit.id,
      payerEmail: capture.payer.email_address,
      payerId: capture.payer.payer_id,
    });

    await creditService.addCredits(
      transaction.employerId,
      transaction.creditsPurchased,
      `Purchased ${transaction.creditsPurchased} credits (${transaction.planName})`,
      orderId
    );

    await Employer.findByIdAndUpdate(transaction.employerId, {
      subscriptionStatus: "active",
      activePlan: transaction.planName?.toLowerCase() || "custom",
    });

    const updatedEmployer = await creditService.getBalance(transaction.employerId);

    console.log("[PayPal] capture-order -> success", {
      orderId,
      employerId: transaction.employerId.toString(),
      creditsAdded: transaction.creditsPurchased,
    });

    res.json({
      success: true,
      message: `Payment successful! ${transaction.creditsPurchased} credits added.`,
      data: {
        credits: updatedEmployer.credits,
        invoiceNumber: transaction.invoiceNumber,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/phonepe/initiate ─────────────────────────────────────
const initiatePhonePe = async (req, res, next) => {
  try {
    const { planId } = req.body;

    const plan = PLANS[planId];
    if (!plan) {
      return res.status(400).json({ success: false, message: "Invalid plan selected" });
    }

    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer profile not found" });
    }

    // ── Clean up ALL stale pending PhonePe transactions before creating new ──
    await Transaction.deleteMany({
      employerId: employer._id,
      paymentGateway: "phonepe",
      paymentStatus: "pending",
    });

    // Fresh unique IDs every attempt — never reuse
    const merchantTransactionId = `SKQ-${uuidv4().replace(/-/g, "").slice(0, 28)}`;
    const idempotencyKey = `pp-${employer._id}-${planId}-${uuidv4()}`;

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const result = await phonePeService.initiatePayment({
      merchantTransactionId,
      amount: plan.amountINR * 100, // paise
      mobileNumber: employer.phone?.replace(/\D/g, "") || "",
      redirectUrl: `${frontendUrl}/employer/payment/phonepe/return?txnId=${merchantTransactionId}`,
      callbackUrl: `${process.env.BACKEND_URL}/api/payments/phonepe/callback`,
      userId: employer._id.toString(),
    });

    await Transaction.create({
      employerId: employer._id,
      amount: plan.amountINR,
      currency: "INR",
      paymentGateway: "phonepe",
      phonepeMerchantTransactionId: merchantTransactionId,
      creditsPurchased: plan.credits,
      paymentStatus: "pending",
      planName: plan.name,
      idempotencyKey,
    });

    res.json({
      success: true,
      data: {
        redirectUrl: result.redirectUrl,
        merchantTransactionId,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/phonepe/verify/:txnId ─────────────────────────────────
const verifyPhonePe = async (req, res, next) => {
  try {
    const { txnId } = req.params;

    if (!txnId) {
      return res.status(400).json({ success: false, message: "txnId is required" });
    }

    const transaction = await Transaction.findOne({
      phonepeMerchantTransactionId: txnId,
    });
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    // Already completed — idempotent return
    if (transaction.paymentStatus === "completed") {
      const balance = await creditService.getBalance(transaction.employerId);
      return res.json({
        success: true,
        message: "Payment already processed",
        data: {
          credits: balance.credits,
          invoiceNumber: transaction.invoiceNumber,
          planName: transaction.planName,
          creditsPurchased: transaction.creditsPurchased,
        },
      });
    }

    const statusResponse = await phonePeService.checkPaymentStatus(txnId);

    if (statusResponse.success && statusResponse.code === "PAYMENT_SUCCESS") {
      const pgData = statusResponse.data;

      await Transaction.findByIdAndUpdate(transaction._id, {
        paymentStatus: "completed",
        phonepePgTransactionId: pgData?.transactionId || null,
        phonepePgAuthorizationCode: pgData?.paymentInstrument?.pgAuthorizationCode || null,
        phonepePaymentInstrument: pgData?.paymentInstrument?.type || null,
      });

      await creditService.addCredits(
        transaction.employerId,
        transaction.creditsPurchased,
        `PhonePe: Purchased ${transaction.creditsPurchased} credits (${transaction.planName})`,
        txnId
      );

      await Employer.findByIdAndUpdate(transaction.employerId, {
        subscriptionStatus: "active",
        activePlan: transaction.planName?.toLowerCase() || "custom",
      });

      const balance = await creditService.getBalance(transaction.employerId);

      return res.json({
        success: true,
        message: `Payment successful! ${transaction.creditsPurchased} credits added.`,
        data: {
          credits: balance.credits,
          invoiceNumber: transaction.invoiceNumber,
          planName: transaction.planName,
          creditsPurchased: transaction.creditsPurchased,
        },
      });
    } else {
      const terminalCodes = ["PAYMENT_ERROR", "TIMED_OUT", "PAYMENT_DECLINED"];
      const isFailed = terminalCodes.includes(statusResponse.code);

      if (isFailed) {
        await Transaction.findByIdAndUpdate(transaction._id, { paymentStatus: "failed" });
        return res.status(400).json({
          success: false,
          message: statusResponse.message || "Payment failed",
          code: statusResponse.code,
        });
      }

      // Still pending — tell frontend to keep retrying
      return res.status(202).json({
        success: false,
        message: "Payment is still being processed",
        code: statusResponse.code || "PAYMENT_PENDING",
      });
    }
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/phonepe/callback ─────────────────────────────────────
const handlePhonePeCallback = async (req, res, next) => {
  try {
    const xVerify = req.headers["x-verify"];
    const { response } = req.body;

    if (!xVerify || !response) {
      return res.status(400).json({ success: false, message: "Invalid callback" });
    }

    const isValid = phonePeService.verifyChecksum(response, xVerify);
    if (!isValid) {
      console.error("[PhonePe Callback] Invalid checksum");
      return res.status(400).json({ success: false, message: "Invalid checksum" });
    }

    const decoded = JSON.parse(Buffer.from(response, "base64").toString("utf8"));
    const { merchantTransactionId, code, data: pgData } = decoded;

    const transaction = await Transaction.findOne({
      phonepeMerchantTransactionId: merchantTransactionId,
    });

    if (!transaction) {
      console.error("[PhonePe Callback] Transaction not found:", merchantTransactionId);
      return res.status(200).send("OK");
    }

    if (transaction.paymentStatus === "completed") {
      return res.status(200).send("OK");
    }

    if (code === "PAYMENT_SUCCESS") {
      await Transaction.findByIdAndUpdate(transaction._id, {
        paymentStatus: "completed",
        phonepePgTransactionId: pgData?.transactionId || null,
        phonepePgAuthorizationCode: pgData?.paymentInstrument?.pgAuthorizationCode || null,
        phonepePaymentInstrument: pgData?.paymentInstrument?.type || null,
      });

      await creditService.addCredits(
        transaction.employerId,
        transaction.creditsPurchased,
        `PhonePe webhook: ${transaction.creditsPurchased} credits (${transaction.planName})`,
        merchantTransactionId
      );

      await Employer.findByIdAndUpdate(transaction.employerId, {
        subscriptionStatus: "active",
        activePlan: transaction.planName?.toLowerCase() || "custom",
      });

      console.log(`[PhonePe Callback] ✅ Payment confirmed: ${merchantTransactionId}`);
    } else {
      await Transaction.findByIdAndUpdate(transaction._id, { paymentStatus: "failed" });
      console.log(`[PhonePe Callback] ❌ Payment failed: ${merchantTransactionId} — ${code}`);
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("[PhonePe Callback] Error:", err.message);
    res.status(200).send("OK"); // Always 200 to PhonePe
  }
};

// ─── POST /api/payments/webhook (PayPal) ─────────────────────────────────────
const handleWebhook = async (req, res, next) => {
  try {
    const isValid = await paypalService.verifyWebhookSignature(req.headers, req.rawBody);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid webhook signature" });
    }

    const event = req.body;

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const orderId = event.resource.supplementary_data?.related_ids?.order_id;
      if (orderId) {
        const txn = await Transaction.findOne({ paypalOrderId: orderId });
        if (txn && txn.paymentStatus !== "completed") {
          await Transaction.findByIdAndUpdate(txn._id, { paymentStatus: "completed" });
          await creditService.addCredits(
            txn.employerId,
            txn.creditsPurchased,
            `Webhook: ${txn.creditsPurchased} credits (${txn.planName})`,
            orderId
          );
          await Employer.findByIdAndUpdate(txn.employerId, {
            subscriptionStatus: "active",
            activePlan: txn.planName?.toLowerCase() || "custom",
          });
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/history ────────────────────────────────────────────────
const getHistory = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer not found" });
    }

    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [transactions, total, ledger, balance] = await Promise.all([
      Transaction.find({ employerId: employer._id, paymentStatus: "completed" })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Transaction.countDocuments({ employerId: employer._id, paymentStatus: "completed" }),
      CreditLedger.find({ employerId: employer._id }).sort({ createdAt: -1 }).limit(20),
      creditService.getBalance(employer._id),
    ]);

    res.json({
      success: true,
      data: { transactions, ledger, balance, pagination: { total, page: parseInt(page), limit: parseInt(limit) } },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/payments/balance ────────────────────────────────────────────────
const getBalance = async (req, res, next) => {
  try {
    const employer = await Employer.findOne({ user: req.user._id });
    if (!employer) {
      return res.status(404).json({ success: false, message: "Employer not found" });
    }
    const balance = await creditService.getBalance(employer._id);
    res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getPlans,
  createOrder,
  captureOrder,
  initiatePhonePe,
  verifyPhonePe,
  handlePhonePeCallback,
  handleWebhook,
  getHistory,
  getBalance,
};