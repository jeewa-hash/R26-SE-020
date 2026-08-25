import express from "express";

import {
  checkBidCoordination,
  getBidCoordinationById,
  getBidCoordinationsBySession,
} from "../controllers/bidCoordinationController.js";

const router = express.Router();

router.post("/check", checkBidCoordination); // Chaw: run bid coordination check

router.get("/session/:externalSessionId", getBidCoordinationsBySession); // Chaw: fetch all coordinated bids for one service session

router.get("/:id", getBidCoordinationById); // Chaw: fetch one bid coordination with evaluations

export default router;