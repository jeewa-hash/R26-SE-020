import express from "express";
import {
  generateManualPost,
  generateFromMLResult,
  regeneratePost,
  listPostsByProvider,
  getPostById,
  updatePost,
  deletePost,
} from "../controllers/adPostController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Generation
router.post("/generate", generateManualPost); // manual input flow
router.post("/generate/ml", generateFromMLResult); // ML portfolio-classification flow
router.post("/:id/regenerate", regeneratePost); // regenerate an existing post

// Management (FR-16)
router.get("/provider", protect(["ServiceProvider"]), listPostsByProvider);
router.get("/:id", getPostById);
router.put("/:id", updatePost);
router.delete("/:id", deletePost);

export default router;
