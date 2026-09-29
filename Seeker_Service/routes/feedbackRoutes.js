import express from "express";
import {
  createFeedback,
  getProviderFeedback,
  getServiceFeedback,
  getBookingFeedbackStatus,
  updateFeedback,
  deleteFeedback,
  getUserFeedback,
  getProviderAverageRatings,
} from "../controllers/feedbackController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// CREATE
router.post("/", createFeedback);

// READ
router.get("/provider/:providerId", getProviderFeedback);
router.get("/booking/:bookingId", getBookingFeedbackStatus);
router.get("/service/:serviceId", getServiceFeedback);
router.get("/user/me", authMiddleware, getUserFeedback);

// INTERNAL – provider score aggregation (called by ML image-classifier service)
router.get("/provider-scores", getProviderAverageRatings);
router.get("/provider-scores/:providerId", getProviderAverageRatings);

// UPDATE
router.put("/:id", updateFeedback);

// DELETE
router.delete("/:id", deleteFeedback);

export default router;
