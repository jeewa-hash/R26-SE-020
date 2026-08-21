import jwt from "jsonwebtoken";

// Track active connections: userId -> socketId
const activeUsers = new Map();

export const initNotificationSocket = (io) => {
  // Authentication Middleware for Sockets
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication error: Token missing"));

    try {
      const JWT_SECRET = process.env.JWT_SECRET;
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const user = decoded.user || decoded;
      socket.userId = user.id || user._id;
      next();
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected to notification socket: ${socket.userId}`);
    activeUsers.set(String(socket.userId), socket.id);

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.userId}`);
      activeUsers.delete(String(socket.userId));
    });
  });
};

// Helper function to emit real-time notifications if online
export const sendRealtimeNotification = (io, recipientId, notificationData) => {
  const socketId = activeUsers.get(String(recipientId));
  if (socketId) {
    io.to(socketId).emit("notification", notificationData);
    return true;
  }
  return false;
};