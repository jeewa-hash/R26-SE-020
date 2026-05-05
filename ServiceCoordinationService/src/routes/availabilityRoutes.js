import express from "express";
import { upsertAvailability, getProviderAvailability, checkAvailability } from "../controllers/availabilityController.js";
const router = express.Router();
router.post("/", upsertAvailability);
router.get("/provider/:providerId", getProviderAvailability);
router.post("/check", checkAvailability);
export default router;
