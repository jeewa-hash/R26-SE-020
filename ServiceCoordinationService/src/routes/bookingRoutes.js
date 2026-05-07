import express from "express";
import {
  createBooking,
  listBookings,
  getBooking,
  listProviderBookings,
  listCustomerBookings,
  confirmBookingById,
  startBookingById,
  completeBookingById
} from "../controllers/bookingController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/bookings:
 *   post:
 *     summary: Create a lightweight service booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - providerId
 *               - serviceCategory
 *               - serviceSubCategory
 *               - scheduledStartTime
 *               - estimatedDurationHours
 *               - predictedActualDurationHours
 *             properties:
 *               customerId:
 *                 type: string
 *                 example: CUS001
 *               providerId:
 *                 type: string
 *                 example: PROV001
 *               serviceCategory:
 *                 type: string
 *                 example: Repairing Services
 *               serviceSubCategory:
 *                 type: string
 *                 example: Plumbing
 *               taskComplexity:
 *                 type: string
 *                 example: Medium
 *               scheduledStartTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-05-10T10:00:00.000Z
 *               estimatedDurationHours:
 *                 type: number
 *                 example: 4
 *               predictedActualDurationHours:
 *                 type: number
 *                 example: 4.79
 *               predictedDelayRiskLevel:
 *                 type: string
 *                 example: Medium
 *               delayRiskProbability:
 *                 type: object
 *                 example:
 *                   High: 0.1405
 *                   Low: 0.0141
 *                   Medium: 0.8454
 *               agreedPrice:
 *                 type: number
 *                 example: 5500
 *               address:
 *                 type: string
 *                 example: Nugegoda
 *               district:
 *                 type: string
 *                 example: Colombo
 *               notes:
 *                 type: string
 *                 example: Water tank pipe leaking
 *     responses:
 *       201:
 *         description: Booking created successfully
 */
router.post("/", createBooking);

/**
 * @swagger
 * /api/coordination/bookings:
 *   get:
 *     summary: Get all bookings
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Bookings retrieved successfully
 */
router.get("/", listBookings);

/**
 * @swagger
 * /api/coordination/bookings/provider/{providerId}:
 *   get:
 *     summary: Get bookings by provider ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         example: PROV001
 *     responses:
 *       200:
 *         description: Provider bookings retrieved successfully
 */
router.get("/provider/:providerId", listProviderBookings);

/**
 * @swagger
 * /api/coordination/bookings/customer/{customerId}:
 *   get:
 *     summary: Get bookings by customer ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         example: CUS001
 *     responses:
 *       200:
 *         description: Customer bookings retrieved successfully
 */
router.get("/customer/:customerId", listCustomerBookings);

/**
 * @swagger
 * /api/coordination/bookings/{id}:
 *   get:
 *     summary: Get booking by ID
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking retrieved successfully
 */
router.get("/:id", getBooking);

/**
 * @swagger
 * /api/coordination/bookings/{id}/confirm:
 *   put:
 *     summary: Confirm booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking confirmed successfully
 */
router.put("/:id/confirm", confirmBookingById);

/**
 * @swagger
 * /api/coordination/bookings/{id}/start:
 *   put:
 *     summary: Start booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actualStartTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-05-10T11:00:00.000Z
 *     responses:
 *       200:
 *         description: Booking started successfully
 */
router.put("/:id/start", startBookingById);

/**
 * @swagger
 * /api/coordination/bookings/{id}/complete:
 *   put:
 *     summary: Complete booking
 *     tags: [Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               actualEndTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-05-10T15:30:00.000Z
 *     responses:
 *       200:
 *         description: Booking completed successfully
 */
router.put("/:id/complete", completeBookingById);

export default router;