import express from "express";

import {
  createQuotation,
  getProviderQuotations,
  getQuotationById,
  acceptQuotation,
  getSeekerQuotations,
  updateQuotationCoordination, // Chaw: added route handler for coordination result updates
} from "../controllers/quotationController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect(["ServiceProvider"]), createQuotation);
router.get("/provider/me", protect(["ServiceProvider"]), getProviderQuotations);
router.get("/seeker/me", protect(["Seeker"]), getSeekerQuotations); // Chaw: moved before /:id to avoid route conflict
router.patch("/:id/coordination", updateQuotationCoordination); // Chaw: temporarily open for Coordination Service update during local testing
router.get("/:id", getQuotationById); // Chaw: temporarily open for Coordination Service lookup during local testing
router.patch("/:id/accept", protect(["Seeker"]), acceptQuotation);

export default router;