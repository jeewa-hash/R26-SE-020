import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import adPostRoutes from "./routes/adPostRoute.js";
// import portfolioRoutes from "./routes/portfolioRoute.js";
// import dashboardRoutes from "./routes/dashboardRoute.js";
// import jobRoutes from "./routes/jobRoute.js";

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

dotenv.config();

const app = express();

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────

app.use(cors());

app.use(express.json({
  limit: "10mb"
}));

app.use(express.urlencoded({
  extended: true
}));

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
// app.use("/api/provider/portfolio", portfolioRoutes);
// app.use("/api/provider/dashboard", dashboardRoutes);
// app.use("/api/provider/jobs", jobRoutes);

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

app.listen(PORT, () => {

  console.log(`
🚀 ===================================
 Provider Service Running
===================================
🌍 URL   : http://localhost:${PORT}
📦 PORT  : ${PORT}
===================================
  `);

});
