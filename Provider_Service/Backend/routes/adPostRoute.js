import express from "express";
import {
  generateManualPost,
  generateFromMLResult,
  regeneratePost,
  listPostsByProvider,
  listAllPublicPosts,
  boostPost,
  getPostById,
  updatePost,
  deletePost,
  toggleLikePost,
} from "../controllers/adPostController.js";
import { protect } from "../middleware/authMiddleware.js";
import { checkPaymentSuspension } from "../middleware/checkPaymentSuspension.js";
import { createBoostCheckoutSession, confirmBoostPayment } from "../controllers/boostController.js";
import { getSystemTotalIncome } from "../controllers/analyticsController.js";

const router = express.Router();

// Generation (Protected & Blocked if payment suspended)
router.post("/generate", protect(["ServiceProvider"]), checkPaymentSuspension, generateManualPost); // manual input flow
router.post("/generate/ml", protect(["ServiceProvider"]), checkPaymentSuspension, generateFromMLResult); // ML portfolio-classification flow
router.post("/:id/regenerate", protect(["ServiceProvider"]), checkPaymentSuspension, regeneratePost); // regenerate an existing post

// Management (FR-16)
router.get("/public/all", listAllPublicPosts); // public sorted feed for seekers
router.get("/provider", protect(["ServiceProvider"]), listPostsByProvider);
router.get("/:id", getPostById);
router.put("/:id", protect(["ServiceProvider"]), checkPaymentSuspension, updatePost);
router.delete("/:id", protect(["ServiceProvider"]), checkPaymentSuspension, deletePost);
router.post("/:id/boost", protect(["ServiceProvider"]), checkPaymentSuspension, boostPost); // boost ad priority
router.post("/:id/like", toggleLikePost); // toggle like on ad post

router.post("/:id/create-checkout-session", protect(["ServiceProvider"]), checkPaymentSuspension, createBoostCheckoutSession);
router.post("/confirm-payment/:sessionId", protect(["ServiceProvider"]), confirmBoostPayment);

// Admin routes
router.get("/income/total", getSystemTotalIncome);

export default router;
