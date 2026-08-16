import express from "express";
import { getProviderCalendar,getSeekerCalendar } from "../controllers/providerCalendarController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();
router.get(
    "/provider/me",
    protect(["ServiceProvider"]),
    getProviderCalendar
  );

  router.get(
    "/seeker/me",
    protect(["Seeker"]),
    getSeekerCalendar
  );  

export default router;