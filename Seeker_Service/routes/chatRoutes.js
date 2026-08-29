import express from "express";
import {
  createChat,
  getUserChats,
  getMessages,
} from "../controllers/chatController.js";

const router = express.Router();

// CHAT ROUTES
router.post("/", createChat);
router.get("/:userId", getUserChats);

// MESSAGE HISTORY (read‑only)
router.get("/message/:chatId", getMessages);

export default router;