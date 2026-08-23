import express from "express";
import {
  createQuotation,
  getProviderQuotations,
  getQuotationById,
  acceptQuotation,
  getSeekerQuotations,
  updateQuotationCoordination, // Chaw - Added route handler for coordination result updates
} from "../controllers/quotationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect(["ServiceProvider"]), createQuotation);
router.get("/provider/me", protect(["ServiceProvider"]), getProviderQuotations);
router.get("/:id", protect(["ServiceProvider", "Seeker"]), getQuotationById);
router.patch("/:id/accept", protect(["Seeker"]), acceptQuotation);
router.get("/seeker/me", protect(["Seeker"]), getSeekerQuotations);
router.patch("/:id/coordination", updateQuotationCoordination); // Chaw - Added route for coordination service updates

export default router;

