import express from "express";
import {
  createProviderRequest,
  getRequestsByPost,
  getRequestsByProvider,
  acceptProviderRequest,
} from "../controllers/providerRequestController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect(["ServiceProvider"]), createProviderRequest);

router.get("/post/:postId", getRequestsByPost);

router.get(
  "/provider/me",
  protect(["ServiceProvider"]),
  getRequestsByProvider
);

router.post("/:requestId/accept", protect(["Seeker"]), acceptProviderRequest);

export default router;