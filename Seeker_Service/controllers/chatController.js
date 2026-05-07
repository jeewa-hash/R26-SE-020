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
    });

    res.status(200).json(chats);
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= SEND MESSAGE =================
export const sendMessage = async (req, res) => {
  try {
    const message = new Message(req.body);
    const savedMessage = await message.save();

    res.status(200).json(savedMessage);
  } catch (err) {
    res.status(500).json(err);
  }
};

// ================= GET MESSAGES =================
export const getMessages = async (req, res) => {
  try {
    const messages = await Message.find({
      chatId: req.params.chatId,
    });

    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json(err);
  }
};