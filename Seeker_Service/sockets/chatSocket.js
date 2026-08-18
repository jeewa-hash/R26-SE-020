import Message from "../models/Message.js";

export default function chatSocket(io) {
  let onlineUsers = [];

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
      const { senderId, receiverId, text, chatId } = data;

      // ✅ Save to DB
      const message = new Message({
        senderId,
        receiverId,
        text,
        chatId,
      });

      const savedMessage = await message.save();

      // ✅ Send to receiver
      const user = onlineUsers.find((u) => u.userId === receiverId);

      if (user) {
        io.to(user.socketId).emit("receiveMessage", savedMessage);
      }

      // ✅ Send back to sender (confirmation)
      socket.emit("messageSent", savedMessage);
    });

    // ================= DISCONNECT =================
    socket.on("disconnect", () => {
      onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
      io.emit("getUsers", onlineUsers);
    });
  });
}