const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "USD" },

    // ─── Payment Gateway ──────────────────────────────────────────────────────
    paymentGateway: {
      type: String,
      enum: ["paypal", "phonepe"],
      required: true,
      default: "paypal",
    },

    // ─── PayPal fields ────────────────────────────────────────────────────────
    paypalOrderId: { type: String, default: null, sparse: true },
    paypalCaptureId: { type: String, default: null },
    payerEmail: { type: String, default: null },
    payerId: { type: String, default: null },

    // ─── PhonePe fields ───────────────────────────────────────────────────────
    phonepeMerchantTransactionId: { type: String, default: null, sparse: true },
    phonepePgTransactionId: { type: String, default: null },
    phonepePgAuthorizationCode: { type: String, default: null },
    phonepePaymentInstrument: { type: String, default: null }, // UPI/CARD/NETBANKING etc.

    // ─── Common fields ────────────────────────────────────────────────────────
    creditsPurchased: { type: Number, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    planName: { type: String, default: "Custom" },
    invoiceNumber: { type: String, unique: true, sparse: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

// Auto-generate invoice number before save
transactionSchema.pre("save", async function (next) {
  if (!this.invoiceNumber) {
    const count = await mongoose.model("Transaction").countDocuments();
    this.invoiceNumber = `INV-${Date.now()}-${String(count + 1).padStart(4, "0")}`;
  }
  next();
});

module.exports = mongoose.model("Transaction", transactionSchema);