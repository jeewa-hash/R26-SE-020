import express from "express";
import { createServiceSession, getSeekerServiceSessions } from "../controllers/serviceSessionController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();
router.post("/", authMiddleware, createServiceSession);
router.get("/seeker/:seekerId", getSeekerServiceSessions);

export default router;
