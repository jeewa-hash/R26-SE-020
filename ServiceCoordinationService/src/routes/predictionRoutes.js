import express from "express";
import { predictDuration, predictDelayRisk } from "../controllers/predictionController.js";
const router = express.Router();
router.post("/duration", predictDuration);
router.post("/delay-risk", predictDelayRisk);
export default router;
