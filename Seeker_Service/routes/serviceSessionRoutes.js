import express from "express";
import { getSeekerServiceSessions } from "../controllers/serviceSessionController.js";

const router = express.Router();
router.get("/seeker/:seekerId", getSeekerServiceSessions);

export default router;
