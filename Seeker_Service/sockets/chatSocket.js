import Message from "../models/Message.js";
import Chat from "../models/Chat.js";

let onlineUsers = [];

export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ================= ADD USER =================
    socket.on("addUser", (userId) => {
      if (!onlineUsers.find((u) => u.userId === userId)) {
        onlineUsers.push({ userId, socketId: socket.id });
      }
      io.emit("getUsers", onlineUsers);
    });

    // ================= SEND MESSAGE =================
    socket.on("sendMessage", async (data) => {
      try {
        const { senderId, receiverId, text, chatId } = data;

        // 1. Save message to DB
        const message = new Message({
          senderId,
          receiverId,
          text,
          chatId,
        });
        const savedMessage = await message.save();

        // 2. Update the chat's lastMessage
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: { text, senderId },
          // updatedAt will be auto‑updated via timestamps
        });

        // 3. Emit to receiver (if online)
        const receiver = onlineUsers.find((u) => u.userId === receiverId);
        if (receiver) {
          io.to(receiver.socketId).emit("receiveMessage", savedMessage);
        }

        // 4. Confirm to sender
        socket.emit("messageSent", savedMessage);
      } catch (error) {
        console.error("Error in sendMessage:", error);
        socket.emit("messageError", { error: "Failed to send message" });
      }
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", () => {
      onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
      io.emit("getUsers", onlineUsers);
    });
  });
}