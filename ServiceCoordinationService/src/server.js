import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./config/db.js";
import logger from "./utils/logger.js";

import providerRequestRoutes from "./routes/providerRequestRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import providerAvailabilityRoutes from "./routes/providerAvailabilityRoutes.js";
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

app.use("/api/coordination/requests", providerRequestRoutes);
app.use("/api/coordination/bookings", bookingRoutes);
app.use("/api/coordination/availability", providerAvailabilityRoutes);

const PORT = process.env.PORT || 5010;

app.listen(PORT, () => {
  logger.info(`Service Coordination Service running on port ${PORT}`);
});