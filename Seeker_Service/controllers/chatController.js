import Chat from "../models/Chat.js";
import Message from "../models/Message.js";

// ================= CREATE CHAT =================
export const createChat = async (req, res) => {
  try {
    const { senderId, receiverId } = req.body;

    // ✅ prevent duplicate chat
    const existingChat = await Chat.findOne({
      members: { $all: [senderId, receiverId] },
    });

    if (existingChat) {
      return res.status(200).json(existingChat);
    }

    const newChat = new Chat({
      members: [senderId, receiverId],
      lastMessage: { text: "", senderId: "" },
    });

    const savedChat = await newChat.save();
    res.status(200).json(savedChat);
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= GET USER CHATS =================
export const getUserChats = async (req, res) => {
  try {
    const chats = await Chat.find({
      members: { $in: [req.params.userId] },
    }).sort({ updatedAt: -1 }); // newest first

    res.status(200).json(chats);
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= GET MESSAGES =================
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chatId: req.params.chatId,
    }).sort({ createdAt: 1 }); // oldest first

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
};