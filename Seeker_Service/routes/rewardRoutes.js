import express from "express";
import {
  getBalance,
  getTransactionHistory,
  redeemPoints,
  adminListTransactions,
  updateRedemptionStatus,
  adminAdjustPoints,
  awardBookingPoints,
} from "../controllers/rewardController.js";
import { authMiddleware, adminMiddleware } from "../middleware/auth.js"; // adjust to your actual auth

const router = express.Router();

// Internal (service-to-service) – must come before user routes
router.post("/internal/bookings/award", awardBookingPoints);

// Seeker routes
router.get("/balance", authMiddleware, getBalance);
router.get("/history", authMiddleware, getTransactionHistory);
router.post("/redeem", authMiddleware, redeemPoints);

// Admin routes
router.get("/admin/transactions", authMiddleware, adminMiddleware, adminListTransactions);
router.put("/admin/redemptions/:id", authMiddleware, adminMiddleware, updateRedemptionStatus);
router.post("/admin/adjust", authMiddleware, adminMiddleware, adminAdjustPoints);

export default router;