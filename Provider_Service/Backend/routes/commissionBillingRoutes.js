import express from "express";
import {
  getBillingOverview,
  getBillingByMonth,
  refreshMonthlyBill,
  getSuspensionStatus,
  createCommissionCheckoutSession,
  confirmCommissionPayment,
} from "../controllers/commissionBillingController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Billing & Payment Portal Routes (Always accessible to Providers, even when suspended)
router.get("/overview", protect(["ServiceProvider"]), getBillingOverview);
router.get("/month/:month", protect(["ServiceProvider"]), getBillingByMonth);
router.post("/refresh", protect(["ServiceProvider"]), refreshMonthlyBill);
router.get("/suspension-status", protect(["ServiceProvider"]), getSuspensionStatus);
router.post("/create-checkout-session", protect(["ServiceProvider"]), createCommissionCheckoutSession);
router.post("/confirm-payment/:sessionId", protect(["ServiceProvider"]), confirmCommissionPayment);

export default router;
