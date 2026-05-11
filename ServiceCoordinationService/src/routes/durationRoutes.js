import express from "express";
import { estimateDuration } from "../controllers/durationController.js";

const router = express.Router();

router.post("/estimate", estimateDuration);

export default router;