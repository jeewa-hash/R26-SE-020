import express from "express";
import {
  createChat,
  getUserChats,
  sendMessage,
  getMessages,
} from "../controllers/chatController.js";

const router = express.Router();

// MESSAGE ROUTES FIRST (avoid conflict)
router.post("/message", sendMessage);
router.get("/message/:chatId", getMessages);

// CHAT ROUTES
router.post("/", createChat);
router.get("/:userId", getUserChats);

export default router;