import express from "express";
import {
  predictDuration,
  predictDelayRisk
} from "../controllers/predictionController.js";

const router = express.Router();

/**
 * @swagger
 * /api/coordination/predictions/duration:
 *   post:
 *     summary: Predict actual service duration
 *     tags: [Predictions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_category
 *               - service_subcategory
 *               - task_complexity
 *               - weather_affected
 *               - provider_schedule_density
 *               - distance_km
 *               - estimated_travel_time_mins
 *               - estimated_duration_hours
 *             properties:
 *               service_category:
 *                 type: string
 *                 example: Repairing Services
 *               service_subcategory:
 *                 type: string
 *                 example: Plumbing
 *               task_complexity:
 *                 type: string
 *                 example: Medium
 *               weather_affected:
 *                 type: string
 *                 example: No
 *               provider_schedule_density:
 *                 type: string
 *                 example: Medium
 *               distance_km:
 *                 type: number
 *                 example: 8.5
 *               estimated_travel_time_mins:
 *                 type: number
 *                 example: 25
 *               estimated_duration_hours:
 *                 type: number
 *                 example: 4
 *     responses:
 *       200:
 *         description: Duration prediction completed
 */
router.post("/duration", predictDuration);

/**
 * @swagger
 * /api/coordination/predictions/delay-risk:
 *   post:
 *     summary: Predict delay risk level
 *     tags: [Predictions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - service_category
 *               - service_subcategory
 *               - task_complexity
 *               - weather_affected
 *               - provider_schedule_density
 *               - distance_km
 *               - estimated_travel_time_mins
 *               - estimated_duration_hours
 *               - gap_before_next_booking_mins
 *               - start_delay_mins
 *             properties:
 *               service_category:
 *                 type: string
 *                 example: Repairing Services
 *               service_subcategory:
 *                 type: string
 *                 example: Plumbing
 *               task_complexity:
 *                 type: string
 *                 example: Medium
 *               weather_affected:
 *                 type: string
 *                 example: No
 *               provider_schedule_density:
 *                 type: string
 *                 example: High
 *               distance_km:
 *                 type: number
 *                 example: 8.5
 *               estimated_travel_time_mins:
 *                 type: number
 *                 example: 25
 *               estimated_duration_hours:
 *                 type: number
 *                 example: 4
 *               gap_before_next_booking_mins:
 *                 type: number
 *                 example: 30
 *               start_delay_mins:
 *                 type: number
 *                 example: 20
 *     responses:
 *       200:
 *         description: Delay risk prediction completed
 */
router.post("/delay-risk", predictDelayRisk);

export default router;