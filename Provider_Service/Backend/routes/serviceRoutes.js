import express from "express";
import {
  createService,
  getServicesByProvider,
  getServiceById,
  updateService,
  deleteService,
  toggleServiceActive,
  checkServiceAvailability,
  getServiceCategoryMeta,
} from "../controllers/serviceController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/check-availability", protect(["ServiceProvider"]), checkServiceAvailability);
router.get("/category-meta", getServiceCategoryMeta);

router.post("/", protect(["ServiceProvider"]), createService);
router.get("/provider", protect(["ServiceProvider"]), getServicesByProvider);
router.get("/:id", getServiceById);
router.put("/:id", protect(["ServiceProvider"]), updateService);
router.delete("/:id", protect(["ServiceProvider"]), deleteService);
router.patch("/:id/toggle-active", protect(["ServiceProvider"]), toggleServiceActive);

export default router;
