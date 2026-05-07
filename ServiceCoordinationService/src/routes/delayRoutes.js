import express from "express";
import {
  reportStartDelay,
  reportExecutionDelay,
  getDelayReportsByBooking
} from "../controllers/delayController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/delays/start-delay:
 *   post:
 *     summary: Analyze provider start delay and schedule impact
 *     tags: [Delays]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - actualStartTime
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "PASTE_BOOKING_ID"
 *               actualStartTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-10T11:00:00.000Z"
 *               delayReason:
 *                 type: string
 *                 example: "Previous job overran"
 *     responses:
 *       201:
 *         description: Start delay analyzed successfully
 */
router.post("/start-delay", reportStartDelay);

/**
 * @swagger
 * /api/coordination/delays/execution-delay:
 *   post:
 *     summary: Analyze execution delay and schedule impact
 *     tags: [Delays]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bookingId
 *               - updatedExpectedEndTime
 *             properties:
 *               bookingId:
 *                 type: string
 *                 example: "PASTE_BOOKING_ID"
 *               updatedExpectedEndTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-10T15:30:00.000Z"
 *               delayReason:
 *                 type: string
 *                 example: "Additional repair work required"
 *     responses:
 *       201:
 *         description: Execution delay analyzed successfully
 */
router.post("/execution-delay", reportExecutionDelay);

/**
 * @swagger
 * /api/coordination/delays/booking/{bookingId}:
 *   get:
 *     summary: Get delay reports by booking ID
 *     tags: [Delays]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Delay reports retrieved successfully
 */
router.get("/booking/:bookingId", getDelayReportsByBooking);

export default router;