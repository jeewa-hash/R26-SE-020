/**
 * index.js
 * Main Entry Point
 */

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import adRoutes from "./routes/adPostRoute.js";

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

mongoose.connect(process.env.MONGODB_URI)
.then(() => {

  console.log("✅ MongoDB Connected Successfully");

})
.catch((err) => {

  console.error("❌ MongoDB Connection Error:");
  console.error(err.message);

});

// ─────────────────────────────────────────────
// Root Route
// ─────────────────────────────────────────────

app.get("/", (req, res) => {

  res.status(200).json({
    success: true,
    message: "AI Advertisement Generator API Running 🚀"
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

app.use("/api/ad", adRoutes);

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
 AI Advertisement Generator Running
===================================
🌍 URL   : http://localhost:${PORT}
📦 PORT  : ${PORT}
===================================
  `);

});