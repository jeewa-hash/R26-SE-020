// controllers/analyticsController.js
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const getSystemTotalIncome = async (req, res) => {
  try {
    const { district, providerIds } = req.query;
    let matchStage = { status: "completed" };

    if (providerIds) {
      const ids = providerIds.split(',').map(id => id.trim()).filter(Boolean);
      matchStage.providerId = { $in: ids };
    }

    const stats = await Transaction.aggregate([
      { $match: matchStage },
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

    // Monthly breakdown aggregation
    const monthlyStats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          revenue: { $sum: "$amountPaid" },
          transactions: { $sum: 1 },
          boostSteps: { $sum: "$boostAmount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    const monthlyMap = {};
    monthlyStats.forEach((item) => {
      const key = `${item._id.year}-${item._id.month}`;
      monthlyMap[key] = item;
    });

    const currentYear = new Date().getFullYear();
    const monthlyBreakdown = MONTH_NAMES.map((monthName, idx) => {
      const monthNum = idx + 1;
      const key = `${currentYear}-${monthNum}`;
      const found = monthlyMap[key];
      const monthStr = monthNum < 10 ? `0${monthNum}` : `${monthNum}`;
      return {
        name: monthName,
        month: monthName,
        monthIndex: monthNum,
        year: currentYear,
        date: `${currentYear}-${monthStr}-01`,
        revenue: found ? found.revenue : 0,
        transactions: found ? found.transactions : 0,
        boostSteps: found ? found.boostSteps : 0,
      };
    });

    res.json({
      success: true,
      data: {
        totalIncomeLkr: result.totalIncome,
        totalTransactions: result.totalTransactions,
        totalBoostSteps: result.totalBoostSteps,
        currency: "LKR",
        monthlyBreakdown,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};