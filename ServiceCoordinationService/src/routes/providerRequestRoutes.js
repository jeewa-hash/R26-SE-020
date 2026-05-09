import express from "express";
import {
  createProviderRequest,
  getRequestsByPost,
  getRequestsByProvider,
  acceptProviderRequest,
} from "../controllers/providerRequestController.js";

const router = express.Router();

router.post("/", createProviderRequest);
router.get("/post/:postId", getRequestsByPost);
router.get("/provider/:providerId", getRequestsByProvider);
router.post("/:requestId/accept", acceptProviderRequest);

export default router;