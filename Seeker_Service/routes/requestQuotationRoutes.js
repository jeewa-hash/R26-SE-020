import express from "express";

import {
  createRequestQuotation,
  getSeekerRequests,
  getProviderRequests,
  getSingleRequest,
  updateRequestStatus,
  deleteRequestQuotation,
} from "../controllers/requestQuotationController.js";

const router = express.Router();

router.post("/", createRequestQuotation);

router.get("/seeker/:seekerId", getSeekerRequests);

router.get("/provider/:providerId", getProviderRequests);

router.patch("/:id/status", updateRequestStatus);

router.delete("/:id", deleteRequestQuotation);

router.get("/:id", getSingleRequest);

export default router;