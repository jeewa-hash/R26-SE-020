import express from "express";

import {
  checkBidCoordination,
  getBidCoordinationById,
  getBidCoordinationsBySession,
  selectSuggestedSlot
} from "../controllers/bidCoordinationController.js";

const router = express.Router();

router.post("/check", checkBidCoordination); // Chaw: run bid coordination check

router.get("/session/:externalSessionId", getBidCoordinationsBySession); // Chaw: fetch all coordinated bids for one service session

router.get("/:id", getBidCoordinationById); // Chaw: fetch one bid coordination with evaluations

router.patch("/:coordinationId/suggested-slots/:slotId/select",selectSuggestedSlot); // Chaw: seeker selects one suggested alternative slot

export default router;