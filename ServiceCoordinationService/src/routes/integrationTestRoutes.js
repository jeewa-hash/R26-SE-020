import express from "express";
import { testBidInputFetch } from "../controllers/integrationTestController.js";

const router = express.Router();

router.post("/bid-input-fetch", testBidInputFetch); // Chaw - Temporary route to validate service-to-service data fetching

export default router;