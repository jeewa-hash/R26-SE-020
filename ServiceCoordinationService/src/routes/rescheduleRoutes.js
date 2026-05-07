import express from "express";
import {
  suggestRescheduleSlots,
  respondToSuggestion,
  getSuggestionsByBooking
} from "../controllers/rescheduleController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/reschedule/suggest:
 *   post:
 *     summary: Generate alternative rescheduling slots for a booking
 *     tags: [Rescheduling]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "PASTE_BOOKING_ID"
 *               workingStartTime:
 *                 type: string
 *                 example: "08:00"
 *               workingEndTime:
 *                 type: string
 *                 example: "18:00"
 *               searchDays:
 *                 type: number
 *                 example: 7
 *               stepMinutes:
 *                 type: number
 *                 example: 60
 *               bufferMinutes:
 *                 type: number
 *                 example: 30
 *     responses:
 *       201:
 *         description: Reschedule suggestions generated successfully
 */
router.post("/suggest", suggestRescheduleSlots);

/**
 * @swagger
 * /api/coordination/reschedule/{suggestionId}/respond:
 *   put:
 *     summary: Accept or reject a reschedule suggestion
 *     tags: [Rescheduling]
 *     parameters:
 *       - in: path
 *         name: suggestionId
 *         required: true
 *         schema:
 *           type: string
 *         example: "PASTE_SUGGESTION_ID"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: string
 *                 example: accepted
 *               selectedSlot:
 *                 type: object
 *                 properties:
 *                   startTime:
 *                     type: string
 *                     format: date-time
 *                     example: "2026-05-11T09:00:00.000Z"
 *                   endTime:
 *                     type: string
 *                     format: date-time
 *                     example: "2026-05-11T13:47:00.000Z"
 *                   label:
 *                     type: string
 *                     example: "5/11/2026 09:00 AM - 01:47 PM"
 *     responses:
 *       200:
 *         description: Reschedule response saved successfully
 */
router.put("/:suggestionId/respond", respondToSuggestion);

/**
 * @swagger
 * /api/coordination/reschedule/booking/{bookingId}:
 *   get:
 *     summary: Get reschedule suggestions by booking ID
 *     tags: [Rescheduling]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         example: "PASTE_BOOKING_ID"
 *     responses:
 *       200:
 *         description: Reschedule suggestions retrieved successfully
 */
router.get("/booking/:bookingId", getSuggestionsByBooking);

export default router;