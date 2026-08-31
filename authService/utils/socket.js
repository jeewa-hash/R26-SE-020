const { Server } = require('socket.io');

let io;

module.exports = {
  init: (httpServer) => {
    io = new Server(httpServer, {
      cors: {
        origin: '*', // Adjust as needed for security
        methods: ['GET', 'POST'],
      },
    });

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('join', (room) => {
        if (room) {
          socket.join(room.toString());
          console.log(`Socket ${socket.id} joined room: ${room}`);
        }
      });

      socket.on('join_notification_room', (userId) => {
        if (userId) {
          socket.join(userId.toString());
          console.log(`Socket ${socket.id} joined notification room: ${userId}`);
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io not initialized!');
    }
    return io;
  },
};
