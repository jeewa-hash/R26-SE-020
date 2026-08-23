import express from "express";
import {
  createQuotation,
  getProviderQuotations,
  getQuotationById,
  acceptQuotation,
   getSeekerQuotations,
} from "../controllers/quotationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect(["ServiceProvider"]), createQuotation);
router.get("/provider/me", protect(["ServiceProvider"]), getProviderQuotations);
router.get("/:id", protect(["ServiceProvider", "Seeker"]), getQuotationById);
router.patch("/:id/accept", protect(["Seeker"]), acceptQuotation);
router.get("/seeker/me", protect(["Seeker"]), getSeekerQuotations);

export default router;
