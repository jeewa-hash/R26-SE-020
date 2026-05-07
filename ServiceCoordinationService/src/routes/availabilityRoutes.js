import express from "express";
import {
  upsertAvailability,
  getProviderAvailability,
  checkAvailability
} from "../controllers/availabilityController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/availability:
 *   post:
 *     summary: Create or update provider availability
 *     tags: [Availability]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - district
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: PROV001
 *               serviceCategories:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Repairing Services", "Cleaning Services"]
 *               district:
 *                 type: string
 *                 example: Colombo
 *               workingDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
 *               workingStartTime:
 *                 type: string
 *                 example: "08:00"
 *               workingEndTime:
 *                 type: string
 *                 example: "18:00"
 *               unavailableSlots:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     startTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-10T10:00:00.000Z"
 *                     endTime:
 *                       type: string
 *                       format: date-time
 *                       example: "2026-05-10T12:00:00.000Z"
 *                     reason:
 *                       type: string
 *                       example: "Accepted booking"
 *     responses:
 *       201:
 *         description: Provider availability saved
 */
router.post("/", upsertAvailability);

/**
 * @swagger
 * /api/coordination/availability/provider/{providerId}:
 *   get:
 *     summary: Get provider availability by provider ID
 *     tags: [Availability]
 *     parameters:
 *       - in: path
 *         name: providerId
 *         required: true
 *         schema:
 *           type: string
 *         example: PROV001
 *     responses:
 *       200:
 *         description: Provider availability retrieved successfully
 */
router.get("/provider/:providerId", getProviderAvailability);

/**
 * @swagger
 * /api/coordination/availability/check:
 *   post:
 *     summary: Check provider availability for a requested time slot
 *     tags: [Availability]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - providerId
 *               - requestedStartTime
 *               - estimatedDurationHours
 *             properties:
 *               providerId:
 *                 type: string
 *                 example: PROV001
 *               requestedStartTime:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-05-10T10:00:00.000Z"
 *               estimatedDurationHours:
 *                 type: number
 *                 example: 4
 *     responses:
 *       200:
 *         description: Availability checked
 */
router.post("/check", checkAvailability);

export default router;