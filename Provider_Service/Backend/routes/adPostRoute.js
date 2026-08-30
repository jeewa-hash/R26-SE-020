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
import { createBoostCheckoutSession } from "../controllers/boostController.js"; 
import { getSystemTotalIncome } from "../controllers/analyticsController.js";

const router = express.Router();

// Generation
router.post("/generate", generateManualPost); // manual input flow
router.post("/generate/ml", generateFromMLResult); // ML portfolio-classification flow
router.post("/:id/regenerate", regeneratePost); // regenerate an existing post

// Management (FR-16)
router.get("/public/all", listAllPublicPosts); // public sorted feed for seekers
router.get("/provider", protect(["ServiceProvider"]), listPostsByProvider);
router.get("/:id", getPostById);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);
router.post("/:id/boost", protect(["ServiceProvider"]), boostPost); // boost ad priority
router.post("/:id/like", toggleLikePost); // toggle like on ad post


router.post("/:id/create-checkout-session", createBoostCheckoutSession);

//admin routes
router.get("/income/total", getSystemTotalIncome);

router.post("/:id/create-checkout-session", createBoostCheckoutSession);

//admin routes
router.get("/income/total", getSystemTotalIncome);

export default router;
