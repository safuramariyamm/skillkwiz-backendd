const mongoose = require("mongoose");
const Employer = require("../models/Employer.model");
const CreditLedger = require("../models/CreditLedger.model");

/**
 * Add credits to an employer account (called after successful payment)
 * Uses MongoDB transactions for atomicity
 */
const addCredits = async (employerId, creditsToAdd, description, referenceId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // $inc is atomic — safe to run concurrently
    const employer = await Employer.findByIdAndUpdate(
      employerId,
      {
        $inc: {
          credits: creditsToAdd,
          totalCreditsPurchased: creditsToAdd,
        },
      },
      { new: true, session }
    );

    if (!employer) throw new Error("Employer not found");

    // Record in ledger
    await CreditLedger.create(
      [
        {
          employerId,
          type: "credit",
          amount: creditsToAdd,
          balance: employer.credits,
          description,
          referenceId,
          referenceType: "payment",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return employer;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Deduct 1 credit from employer (called on assessment creation)
 * Returns updated employer or throws if insufficient credits
 */
const deductCredit = async (employerId, description, referenceId) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // findOneAndUpdate with credits > 0 check — atomic, prevents race conditions
    const employer = await Employer.findOneAndUpdate(
      { _id: employerId, credits: { $gt: 0 } },
      {
        $inc: { credits: -1, creditsUsed: 1 },
      },
      { new: true, session }
    );

    if (!employer) {
      await session.abortTransaction();
      const err = new Error("Insufficient credits");
      err.statusCode = 402;
      throw err;
    }

    await CreditLedger.create(
      [
        {
          employerId,
          type: "debit",
          amount: 1,
          balance: employer.credits,
          description,
          referenceId,
          referenceType: "assessment",
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return employer;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

/**
 * Get current credit balance
 */
const getBalance = async (employerId) => {
  const employer = await Employer.findById(employerId).select(
    "credits activePlan subscriptionStatus creditsUsed totalCreditsPurchased"
  );
  if (!employer) throw new Error("Employer not found");
  return employer;
};

module.exports = { addCredits, deductCredit, getBalance };
