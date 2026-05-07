import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import serviceRequestRoutes from "./routes/serviceRequestRoutes.js";
import availabilityRoutes from "./routes/availabilityRoutes.js";
import predictionRoutes from "./routes/predictionRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import delayRoutes from "./routes/delayRoutes.js";
import rescheduleRoutes from "./routes/rescheduleRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
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
    component: "Service Scheduling and Rescheduling Engine",
    status: "healthy"
  });
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/api/coordination/service-requests", serviceRequestRoutes);
app.use("/api/coordination/availability", availabilityRoutes);
app.use("/api/coordination/predictions", predictionRoutes);
app.use("/api/coordination/bookings", bookingRoutes);
app.use("/api/coordination/delays", delayRoutes);
app.use("/api/coordination/reschedule", rescheduleRoutes);
app.use("/api/coordination/calendar", calendarRoutes);

app.use(notFound);
app.use(errorHandler);
export default app;
