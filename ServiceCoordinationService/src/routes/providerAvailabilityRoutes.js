import express from "express";
import {
  upsertProviderAvailability,
  getProviderAvailability,
  createAvailabilitySlot,
  updateAvailabilitySlot,
  deleteAvailabilitySlot,
  updateAvailabilityStatus,
} from "../controllers/providerAvailabilityController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/provider/me", protect(["ServiceProvider"]), getProviderAvailability);
router.get("/provider/:providerId", protect(["ServiceProvider", "Admin"]), getProviderAvailability);
router.post("/provider/me", protect(["ServiceProvider"]), createAvailabilitySlot);
router.patch("/provider/me/status", protect(["ServiceProvider"]), updateAvailabilityStatus);
router.put("/:availabilityId", protect(["ServiceProvider"]), updateAvailabilitySlot);
router.delete("/:availabilityId", protect(["ServiceProvider"]), deleteAvailabilitySlot);

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
