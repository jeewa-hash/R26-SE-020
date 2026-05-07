import express from "express";
import {
  getProviderCalendar,
  getSeekerCalendar
} from "../controllers/calendarController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/calendar/provider/{providerId}:
 *   get:
 *     summary: Get provider calendar bookings
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         example: PROV001
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2026-05-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2026-05-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: Provider calendar retrieved successfully
 */
router.get("/provider/:providerId", getProviderCalendar);

/**
 * @swagger
 * /api/coordination/calendar/seeker/{customerId}:
 *   get:
 *     summary: Get seeker calendar bookings
 *     tags: [Calendar]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         example: CUS001
 *       - in: query
 *         name: from
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2026-05-01T00:00:00.000Z"
 *       - in: query
 *         name: to
 *         required: false
 *         schema:
 *           type: string
 *           format: date-time
 *         example: "2026-05-31T23:59:59.000Z"
 *     responses:
 *       200:
 *         description: Seeker calendar retrieved successfully
 */
router.get("/seeker/:customerId", getSeekerCalendar);

export default router;