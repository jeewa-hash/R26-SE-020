import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import http from "http";
import { Server } from "socket.io";

import adPostRoutes from "./routes/adPostRoute.js";
import jobStatusRoutes from "./routes/jobStatusRoute.js";
import quotationRoutes from "./routes/quotationRoutes.js";
import { initNotificationSocket } from "./sockets/notificationSocket.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";
import commissionBillingRoutes from "./routes/commissionBillingRoutes.js";

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use("/api/webhooks", webhookRoutes);
app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true
}));

// Pass `io` instance to Express app object for controllers
app.set("io", io);

// Start Socket.io connections
initNotificationSocket(io);

// ─────────────────────────────────────────────
// MongoDB Connection
// ─────────────────────────────────────────────

if (!process.env.MONGO_URI) {
  console.error("❌ MONGODB_URI is not set. Check that .env exists in Provider_Service/Backend and is saved as UTF-8.");
} else {
  mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected Successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:");
    console.error(err.message);
  });
}

// ─────────────────────────────────────────────
// Root Route
// ─────────────────────────────────────────────

app.get("/", (req, res) => {

  res.status(200).json({
    success: true,
    message: "Provider Service API Running 🚀"
  });

});

// ─────────────────────────────────────────────
// Health Check
// ─────────────────────────────────────────────

app.get("/health", (req, res) => {

  res.status(200).json({
    success: true,
    status: "OK",
    timestamp: new Date()
  });

});

// ─────────────────────────────────────────────
// API Routes
// ─────────────────────────────────────────────

app.use("/api/provider/ads", adPostRoutes); // AI-assisted service post generation (FR-03)
app.use("/api/provider/jobs", jobStatusRoutes);
app.use("/api/provider/quotations", quotationRoutes);
app.use("/api/provider/billing", commissionBillingRoutes); // Monthly 5% service charge commission & payment portal
app.use("/api/notifications", notificationRoutes);

// ─────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────

app.use((req, res) => {

  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });

});

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────

app.use((err, req, res, next) => {

  console.error("❌ SERVER ERROR:");
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: err.message
  });

});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────

const PORT = process.env.PORT || 3002;

server.listen(PORT, "0.0.0.0", () => {

  console.log(`
🚀 ===================================
 Provider Service Running
===================================
🌍 URL   : http://localhost:${PORT}
📦 PORT  : ${PORT}
===================================
  `);

});
