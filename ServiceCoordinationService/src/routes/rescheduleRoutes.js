import express from "express";
import {
  createRescheduleRequest,
  acceptRescheduleSlot,
  getReschedulesByBooking,
} from "../controllers/rescheduleController.js";

const router = express.Router();

router.post("/bookings/:bookingId/reschedule", createRescheduleRequest);

router.put("/:rescheduleId/accept", acceptRescheduleSlot);

router.get("/booking/:bookingId", getReschedulesByBooking);

export default router;