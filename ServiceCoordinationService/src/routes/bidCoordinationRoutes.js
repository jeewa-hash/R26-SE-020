import express from "express";

import {
  checkBidCoordination,
  validateQuotationSchedule,
  getBidCoordinationById,
  getBidCoordinationsBySession,
  selectSuggestedSlot
} from "../controllers/bidCoordinationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/validate-quotation", protect(["ServiceProvider"]), validateQuotationSchedule);

router.post("/check", checkBidCoordination); // Chaw: run bid coordination check

router.get("/session/:externalSessionId", getBidCoordinationsBySession); // Chaw: fetch all coordinated bids for one service session

router.get("/:id", protect(["Seeker", "ServiceProvider", "Admin"]), getBidCoordinationById); // Chaw: fetch one bid coordination with evaluations

router.patch(
  "/:coordinationId/suggested-slots/:slotId/select",
  protect(["Seeker"]),
  selectSuggestedSlot
);

export default router;
