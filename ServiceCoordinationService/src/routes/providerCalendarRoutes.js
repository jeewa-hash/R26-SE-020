import express from "express";
import { getProviderCalendar } from "../controllers/providerCalendarController.js";

const router = express.Router();

router.get("/provider/:providerId", getProviderCalendar);

export default router;