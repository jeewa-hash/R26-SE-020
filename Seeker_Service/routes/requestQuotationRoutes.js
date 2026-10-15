import express from "express";
import { authMiddleware } from "../middleware/auth.js";

import {
  createRequestQuotation,
  requestQuotationReschedule,
  updateQuotationRequestedTime,
  getSeekerRequests,
  getProviderRequests,
  getSingleRequest,
  updateRequestStatus,
  deleteRequestQuotation,
  getProviderRecommendations,
  getProviderRequestsbyProvider,
  markSessionSelection,
} from "../controllers/requestQuotationController.js";

const router = express.Router();

router.post("/", authMiddleware, createRequestQuotation);
router.patch("/:id/reschedule-request", authMiddleware, requestQuotationReschedule);
router.patch("/:id/preferred-time", authMiddleware, updateQuotationRequestedTime);

router.get("/recommendations/seeker/:seekerId", getProviderRecommendations);

router.get("/seeker/:seekerId", getSeekerRequests);

router.get("/provider-filtered/:providerId", getProviderRequestsbyProvider);

router.get("/provider/:providerId", getProviderRequests);

router.patch("/:id/status", updateRequestStatus);
router.patch("/session/:sessionId/selection", markSessionSelection);

router.delete("/:id", deleteRequestQuotation);

router.get("/:id", getSingleRequest);

export default router;
