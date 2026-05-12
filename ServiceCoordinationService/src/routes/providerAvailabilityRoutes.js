import express from "express";
import {
  upsertProviderAvailability,
  getProviderAvailability,
} from "../controllers/providerAvailabilityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect(["ServiceProvider"]),
  upsertProviderAvailability
);

router.put(
  "/me",
  protect(["ServiceProvider"]),
  upsertProviderAvailability
);

router.get(
  "/me",
  protect(["ServiceProvider"]),
  (req, res, next) => {
    req.params.providerId = req.user.id;
    next();
  },
  getProviderAvailability
);

router.get(
  "/:providerId",
  protect(["ServiceProvider", "Admin"]),
  getProviderAvailability
);

export default router;