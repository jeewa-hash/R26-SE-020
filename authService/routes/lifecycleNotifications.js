const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const ProviderNotification = require('../models/ProviderNotification');
const SeekerNotification = require('../models/SeekerNotification');
const router = express.Router();
router.post('/', async (req, res) => {
  const expected = process.env.NOTIFICATION_SERVICE_SECRET;
  const supplied = req.get('x-notification-secret') || '';
  if (!expected || Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const { recipientId, role, eventId, title, message, type, metadata = {} } = req.body;
  if (!mongoose.isValidObjectId(recipientId) || !['Seeker', 'ServiceProvider'].includes(role) ||
      !eventId || !title || !message || !type) return res.status(400).json({ message: 'Invalid notification' });
  const Model = role === 'Seeker' ? SeekerNotification : ProviderNotification;
  const field = role === 'Seeker' ? 'seekerId' : 'providerId';
  try {
    const notification = await Model.create({ [field]: recipientId, eventId, title, message, type, metadata, category: 'orders' });
    req.app.get('socketio')?.to(String(recipientId)).emit('notification', notification.toObject());
    return res.status(201).json({ success: true });
  } catch (error) {
    if (error.code === 11000) return res.json({ success: true, duplicate: true });
    return res.status(500).json({ message: 'Notification could not be saved' });
  }
});
module.exports = router;
