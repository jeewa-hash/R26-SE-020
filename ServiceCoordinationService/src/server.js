import express from "express";
import cors from "cors";
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
import integrationTestRoutes from "./routes/integrationTestRoutes.js"; // Chaw - Added temporary integration test routes
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/health", (req, res) => {
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

const PORT = process.env.PORT || 5010;

app.listen(PORT, "0.0.0.0",() => {
  logger.info(`Service Coordination Service running on port ${PORT}`);
});