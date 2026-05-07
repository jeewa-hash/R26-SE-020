import express from "express";
import {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById
} from "../controllers/serviceRequestController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/service-requests:
 *   post:
 *     summary: Create service request with ML duration and delay-risk predictions
 *     tags: [Service Requests]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerId
 *               - serviceCategory
 *               - serviceSubCategory
 *               - description
 *               - district
 *               - preferredStartTime
 *             properties:
 *               customerId:
 *                 type: string
 *                 example: CUS001
 *               serviceCategory:
 *                 type: string
 *                 example: Repairing Services
 *               serviceSubCategory:
 *                 type: string
 *                 example: Plumbing
 *               description:
 *                 type: string
 *                 example: Water tank pipe leaking
 *               district:
 *                 type: string
 *                 example: Colombo
 *               address:
 *                 type: string
 *                 example: Nugegoda
 *               preferredStartTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-10T10:00:00.000Z"
 *               taskComplexity:
 *                 type: string
 *                 example: Medium
 *               weatherAffected:
 *                 type: string
 *                 example: No
 *               providerScheduleDensity:
 *                 type: string
 *                 example: High
 *               distanceKm:
 *                 type: number
 *                 example: 8.5
 *               estimatedTravelTimeMins:
 *                 type: number
 *                 example: 25
 *               estimatedDurationHours:
 *                 type: number
 *                 example: 4
 *               gapBeforeNextBookingMins:
 *                 type: number
 *                 example: 30
 *               startDelayMins:
 *                 type: number
 *                 example: 20
 *     responses:
 *       201:
 *         description: Service request created with ML predictions
 */
router.post("/", createServiceRequest);

/**
 * @swagger
 * /api/coordination/service-requests:
 *   get:
 *     summary: Get all service requests
 *     tags: [Service Requests]
 *     responses:
 *       200:
 *         description: Service requests retrieved successfully
 */
router.get("/", getServiceRequests);

/**
 * @swagger
 * /api/coordination/service-requests/{id}:
 *   get:
 *     summary: Get service request by ID
 *     tags: [Service Requests]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Service request retrieved successfully
 */
router.get("/:id", getServiceRequestById);

export default router;