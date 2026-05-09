import express from "express";
import {
  getBookingsByProvider,
  getBookingsBySeeker,
  getBookingByPost,
} from "../controllers/bookingController.js";

const router = express.Router();

router.get("/provider/:providerId", getBookingsByProvider);
router.get("/seeker/:seekerId", getBookingsBySeeker);
router.get("/post/:postId", getBookingByPost);

export default router;