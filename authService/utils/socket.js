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

    io.use((socket, next) => {
      try {
        const decoded = require('jsonwebtoken').verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
        const user = decoded.user || decoded;
        const id = user.id || user._id || user.userId || user.sub;
        if (!id || !user.role) throw new Error('Invalid identity');
        socket.user = { ...user, id: String(id) };
        next();
      } catch { next(new Error('Authentication required')); }
    });
    io.on('connection', (socket) => {
      const ownRoom = String(socket.user.id);
      socket.join(ownRoom);
      if (String(socket.user.role).toLowerCase() === 'admin') socket.join('admin_room');
      const joinOwnRoom = room => {
        if (String(room) === ownRoom) socket.join(ownRoom);
      };
      socket.on('join', joinOwnRoom);
      socket.on('join_notification_room', joinOwnRoom);
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
