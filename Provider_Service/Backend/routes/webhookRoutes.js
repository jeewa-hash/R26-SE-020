// routes/webhookRoutes.js
import express from "express";
import { handleStripeWebhook } from "../controllers/webhookController.js";

const router = express.Router();

// Route must use express.raw to preserve raw binary body for signature checking
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;