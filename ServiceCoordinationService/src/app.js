import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import serviceRequestRoutes from "./routes/serviceRequestRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import { notFound, errorHandler } from "./middleware/errorMiddleware.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    service: "ServiceCoordinationService",
    component: "AI-Driven Delay-Aware Service Scheduling and Rescheduling Engine",
    status: "healthy"
  });
});

app.use("/api/coordination/service-requests", serviceRequestRoutes);
app.use("/api/coordination/availability", availabilityRoutes);
app.use("/api/coordination/predictions", predictionRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
