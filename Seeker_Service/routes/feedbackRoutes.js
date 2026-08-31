import express from "express";
import {
  createFeedback,
  getAllFeedbacks,
  getProviderFeedback,
  getServiceFeedback,
  getBookingFeedbackStatus,
  updateFeedback,
  deleteFeedback
} from "../controllers/feedbackController.js";

const router = express.Router();

// CREATE
router.post("/", createFeedback);

// READ
router.get("/", getAllFeedbacks);
router.get("/provider/:providerId", getProviderFeedback);
router.get("/booking/:bookingId", getBookingFeedbackStatus);
router.get("/service/:serviceId", getServiceFeedback);

// UPDATE
router.put("/:id", updateFeedback);

// DELETE
router.delete("/:id", deleteFeedback);

export default router;
