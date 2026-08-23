// routes/jobStatusRoute.js
import express from "express";
import {
  applyToJobPost,
  cancelJobApplication,
  updateJobStatus,
  getJobsByProvider,
  getJobStatusById,
} from "../controllers/jobStatusController.js";

const router = express.Router();

router.post("/:postId/apply", applyToJobPost);
router.post("/:postId/cancel", cancelJobApplication);
router.put("/:id/status", updateJobStatus);
router.get("/provider/:providerId", getJobsByProvider);
router.get("/:id", getJobStatusById);

export default router;