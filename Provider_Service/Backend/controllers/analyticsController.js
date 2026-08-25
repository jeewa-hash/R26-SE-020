// controllers/analyticsController.js
import Transaction from "../models/Transaction.js";

export const getSystemTotalIncome = async (req, res) => {
  try {
    const stats = await Transaction.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amountPaid" },
          totalTransactions: { $sum: 1 },
          totalBoostSteps: { $sum: "$boostAmount" },
        },
      },
    ]);

    const result = stats[0] || { totalIncome: 0, totalTransactions: 0, totalBoostSteps: 0 };

    res.json({
      success: true,
      data: {
        totalIncomeLkr: result.totalIncome,
        totalTransactions: result.totalTransactions,
        totalBoostSteps: result.totalBoostSteps,
        currency: "LKR",
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};