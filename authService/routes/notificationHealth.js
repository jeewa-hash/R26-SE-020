const crypto = require('crypto');
const mongoose = require('mongoose');

module.exports = (req, res) => {
  const secret = process.env.NOTIFICATION_SERVICE_SECRET;
  const supplied = req.get('x-notification-secret') || '';
  if (!secret) return res.status(503).json({ status: 'not_configured' });
  if (Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !crypto.timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return res.status(401).json({ message: 'Unauthorized' });
  const databaseReady = mongoose.connection.readyState === 1;
  const socketReady = Boolean(req.app.get('socketio'));
  return res.status(databaseReady && socketReady ? 200 : 503).json({ configured: true, databaseReady, socketReady });
};
