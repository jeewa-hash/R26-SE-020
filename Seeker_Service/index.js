import express from "express";
import dotenv from "dotenv";
import mongoose from "mongoose";
import cors from "cors";
import dns from "node:dns";
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import { createServer } from "http";
import { Server } from "socket.io";

import postRoutes from "./routes/postRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import chatSocket from "./sockets/chatSocket.js";
import feedbackRoutes from "./routes/feedbackRoutes.js";
import requestQuotationRoutes from "./routes/requestQuotationRoutes.js";

dotenv.config();

const app = express();

// middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static
app.use("/uploads", express.static("uploads"));

// routes
app.use("/posts", postRoutes);
app.use("/chat", chatRoutes);
app.use("/feedback", feedbackRoutes);
app.use("/request-quotations", requestQuotationRoutes);


// HTTP + SOCKET SERVER
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

// socket init
chatSocket(io);

// DB connection
const PORT = process.env.PORT || 6000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log("");
      console.log("================================================");
      console.log("       🚀 SEEKER SERVICE BACKEND");
      console.log("================================================");
      console.log("       ✅ MongoDB   : Connected");
      console.log("       🌐 Server    : Running");
      console.log(`       🔌 Port      : ${PORT}`);
      console.log("       💬 Socket.IO : Enabled");
      console.log("================================================");
      console.log("       ✨ Seeker Service is ready!");
      console.log("================================================");
      console.log("");
    });
  })
  .catch((err) => {
    console.log("");
    console.log("================================================");
    console.log("       ❌ SEEKER SERVICE STARTUP FAILED");
    console.log("================================================");
    console.log(`       MongoDB Error: ${err.message}`);
    console.log("================================================");
    console.log("");
  });