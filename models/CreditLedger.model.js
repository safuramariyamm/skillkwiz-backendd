const mongoose = require("mongoose");

const creditLedgerSchema = new mongoose.Schema(
  {
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employer",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: { type: Number, required: true }, // positive = credits added, negative = deducted
    balance: { type: Number, required: true }, // balance AFTER this transaction
    description: { type: String, required: true },
    referenceId: { type: String, default: null }, // paypalOrderId or assessmentId
    referenceType: {
      type: String,
      enum: ["payment", "assessment", "manual", "refund"],
      default: "payment",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CreditLedger", creditLedgerSchema);
