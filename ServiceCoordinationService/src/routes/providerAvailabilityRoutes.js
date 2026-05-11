import express from "express";
import {
  upsertProviderAvailability,
  getProviderAvailability,
} from "../controllers/providerAvailabilityController.js";

const router = express.Router();

router.post("/", upsertProviderAvailability);
router.get("/:providerId", getProviderAvailability);

export default router;