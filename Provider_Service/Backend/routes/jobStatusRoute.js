// routes/jobStatusRoute.js
import express from "express";
import {
  applyToJobPost,
  cancelJobApplication,
  updateJobStatus,
  getJobsByProvider,
  getJobStatusById,
} from "../controllers/jobStatusController.js";
import { checkPaymentSuspension } from "../middleware/checkPaymentSuspension.js";

const router = express.Router();

router.post("/:postId/apply", checkPaymentSuspension, applyToJobPost);
router.post("/:postId/cancel", cancelJobApplication);
router.put("/:id/status", checkPaymentSuspension, updateJobStatus);
router.get("/provider/:providerId", getJobsByProvider);
router.get("/:id", getJobStatusById);

export default router;