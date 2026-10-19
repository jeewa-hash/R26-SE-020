import express from "express";
import { getSeekerBookingHistory } from "../controllers/coordinationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

router.get("/bookings/me", authMiddleware, getSeekerBookingHistory);

export default router;