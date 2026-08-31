// controllers/rewardController.js
import mongoose from "mongoose";
import RewardAccount from "../models/RewardAccount.js";
import RewardTransaction from "../models/RewardTransaction.js";
import RewardRedemption from "../models/RewardRedemption.js";
import { awardPointsForBooking } from "../services/rewardService.js";

/**
 * Internal endpoint used by ServiceCoordinationService after a booking is paid
 * and completed. It is intentionally not protected by a user JWT because the
 * service-to-service key identifies the trusted caller.
 */
export const awardBookingPoints = async (req, res) => {
  if (!process.env.REWARD_SERVICE_KEY || req.get("x-reward-service-key") !== process.env.REWARD_SERVICE_KEY) {
    return res.status(401).json({ error: "Unauthorized service request" });
  }

  try {
    const result = await awardPointsForBooking(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/rewards/balance
 * Returns current balance and lifetime stats for authenticated seeker.
 */
export const getBalance = async (req, res) => {
  try {
    const account = await RewardAccount.findOne({ seekerId: req.user.id });
    if (!account) {
      return res.json({
        balance: 0,
        lifetimeEarned: 0,
        lifetimeSpent: 0,
      });
    }
    res.json({
      balance: account.balance,
      lifetimeEarned: account.lifetimeEarned,
      lifetimeSpent: account.lifetimeSpent,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/rewards/history
 * Paginated transaction history for authenticated seeker.
 * Query params: page (default 1), limit (default 20)
 */
export const getTransactionHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const transactions = await RewardTransaction.find({ seekerId: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await RewardTransaction.countDocuments({ seekerId: req.user.id });

    res.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/rewards/redeem
 * Redeem points for a reward item.
 * Body: { pointsToSpend, rewardItem, rewardValue }
 */
export const redeemPoints = async (req, res) => {
  const { pointsToSpend, rewardItem, rewardValue } = req.body;

  if (!pointsToSpend || pointsToSpend <= 0) {
    return res.status(400).json({ error: "Invalid points amount" });
  }
  if (!rewardItem) {
    return res.status(400).json({ error: "Reward item is required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const account = await RewardAccount.findOne({ seekerId: req.user.id }).session(session);
    if (!account || account.balance < pointsToSpend) {
      throw new Error("Insufficient balance");
    }

    // Deduct points
    account.balance -= pointsToSpend;
    account.lifetimeSpent += pointsToSpend;
    await account.save({ session });

    // Create transaction record
    const transaction = new RewardTransaction({
      seekerId: req.user.id,
      amount: -pointsToSpend,
      type: "SPEND",
      description: `Redeemed ${pointsToSpend} points for ${rewardItem}`,
      metadata: { rewardItem, rewardValue },
    });
    await transaction.save({ session });

    // Create redemption request
    const redemption = new RewardRedemption({
      seekerId: req.user.id,
      pointsSpent: pointsToSpend,
      rewardItem,
      rewardValue,
      status: "PENDING",
    });
    await redemption.save({ session });

    await session.commitTransaction();
    res.status(201).json({
      message: "Redemption request submitted",
      newBalance: account.balance,
      redemptionId: redemption._id,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

// ---------- Admin endpoints (optional) ----------

/**
 * GET /admin/rewards/transactions
 * List all transactions (admin only) with filters.
 * Query: seekerId, type, fromDate, toDate, etc.
 */
export const adminListTransactions = async (req, res) => {
  try {
    const filter = {};
    if (req.query.seekerId) filter.seekerId = req.query.seekerId;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.fromDate || req.query.toDate) {
      filter.createdAt = {};
      if (req.query.fromDate) filter.createdAt.$gte = new Date(req.query.fromDate);
      if (req.query.toDate) filter.createdAt.$lte = new Date(req.query.toDate);
    }

    const transactions = await RewardTransaction.find(filter)
      .sort({ createdAt: -1 })
      .populate("seekerId", "name email");
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /admin/rewards/redemptions/:id
 * Approve or reject a redemption request.
 * Body: { status: "APPROVED" | "REJECTED" }
 */
export const updateRedemptionStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res.status(400).json({ error: "Invalid status. Use APPROVED or REJECTED" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const redemption = await RewardRedemption.findById(id).session(session);
    if (!redemption) {
      throw new Error("Redemption not found");
    }
    if (redemption.status !== "PENDING") {
      throw new Error("Redemption already processed");
    }

    redemption.status = status;
    if (status === "APPROVED") {
      redemption.approvedBy = req.user.id;
      redemption.approvedAt = new Date();
    }
    await redemption.save({ session });

    // If rejected, we might want to refund points, but that's a business decision.
    // For now we just update the status.

    await session.commitTransaction();
    res.json({ message: `Redemption ${status.toLowerCase()}`, redemption });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * POST /admin/rewards/adjust
 * Manually adjust a seeker's points.
 * Body: { seekerId, amount, reason }
 * amount can be positive (add) or negative (deduct).
 */
export const adminAdjustPoints = async (req, res) => {
  const { seekerId, amount, reason } = req.body;

  if (!seekerId || !amount || amount === 0) {
    return res.status(400).json({ error: "seekerId and non-zero amount are required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    let account = await RewardAccount.findOne({ seekerId }).session(session);
    if (!account) {
      account = new RewardAccount({ seekerId, balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
    }

    const newBalance = account.balance + amount;
    if (newBalance < 0) {
      throw new Error("Insufficient balance for deduction");
    }

    account.balance = newBalance;
    if (amount > 0) {
      account.lifetimeEarned += amount;
    } else {
      account.lifetimeSpent += Math.abs(amount);
    }
    await account.save({ session });

    const transaction = new RewardTransaction({
      seekerId,
      amount,
      type: "ADJUST",
      description: reason || "Admin adjustment",
      metadata: { adminId: req.user.id },
      referenceModel: "Admin",
    });
    await transaction.save({ session });

    await session.commitTransaction();
    res.json({ message: "Adjustment successful", newBalance: account.balance });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
