import { startBookingReminderWorker } from './services/bookingReminderService.js';
import express from "express";
import cors from "cors";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";

import providerRequestRoutes from "./routes/providerRequestRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import providerAvailabilityRoutes from "./routes/providerAvailabilityRoutes.js";
import durationRoutes from "./routes/durationRoutes.js";
import providerCalendarRoutes from "./routes/providerCalendarRoutes.js";
import rescheduleRoutes from "./routes/rescheduleRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import bidCoordinationRoutes from "./routes/bidCoordinationRoutes.js"; // Chaw: added bid coordination routes
import integrationTestRoutes from "./routes/integrationTestRoutes.js"; // Chaw - Added temporary integration test routes
dotenv.config();

const app = express();

// Local Expo web servers may use ports 8081–8083 when another app is running.
const corsOrigins = (process.env.CORS_ALLOWED_ORIGINS ||
  "http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082,http://localhost:8083,http://127.0.0.1:8083")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

connectDB().then(() => startBookingReminderWorker());

app.get("/health", (req, res) => {
  res.status(200).json({
    service: "Service Coordination Service",
    status: "healthy",
  });
});

app.get("/", (req, res) => {
  res.status(200).json({
    service: "Service Coordination Service",
    status: "healthy",
  });
});

app.use("/requests", providerRequestRoutes);
app.use("/bookings", bookingRoutes);
app.use("/availability", providerAvailabilityRoutes);
app.use("/duration", durationRoutes);
app.use("/calendar", providerCalendarRoutes);
app.use("/reschedules", rescheduleRoutes);
app.use("/posts", postRoutes);
app.use("/test", integrationTestRoutes); // Chaw - Temporary route for Phase 2 validation
app.use("/bid-coordinations", bidCoordinationRoutes); // Chaw: added bid coordination routes

const PORT = process.env.PORT || 5010;

app.listen(PORT, "0.0.0.0",() => {
  logger.info(`Service Coordination Service running on port ${PORT}`);
});