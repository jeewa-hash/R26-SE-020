import express from "express";
import {
  createNotification,
  getMyNotifications,
  markAsRead,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Route for inter-service calls or manual dispatch
router.post("/send", createNotification);

// Routes for logged-in Seeker/Provider
router.get("/", protect(["ServiceProvider", "Seeker"]), getMyNotifications);
router.patch("/:id/read", protect(["ServiceProvider", "Seeker"]), markAsRead);

export default router;