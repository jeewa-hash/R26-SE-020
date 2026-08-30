import express from "express";

import {
  createRequestQuotation,
  getSeekerRequests,
  getProviderRequests,
  getSingleRequest,
  updateRequestStatus,
  deleteRequestQuotation,
  getProviderRecommendations,
} from "../controllers/requestQuotationController.js";

const router = express.Router();

router.post("/", createRequestQuotation);

router.get("/recommendations/seeker/:seekerId", getProviderRecommendations);

router.get("/seeker/:seekerId", getSeekerRequests);

router.get("/provider/:providerId", getProviderRequests);

router.patch("/:id/status", updateRequestStatus);

router.delete("/:id", deleteRequestQuotation);

//router.get("/:id", getSingleRequest);
router.get("/:id", getSingleRequest); // Chaw - Temporarily open for service-to-service local testing

export default router;