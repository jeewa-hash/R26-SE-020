import express from "express";
import { createServiceRequest, getServiceRequests, getServiceRequestById } from "../controllers/serviceRequestController.js";
const router = express.Router();
router.post("/", createServiceRequest);
router.get("/", getServiceRequests);
router.get("/:id", getServiceRequestById);
export default router;
