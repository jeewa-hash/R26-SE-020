const mongoose = require('mongoose');

const ProviderNotificationSchema = new mongoose.Schema({
  providerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Provider',
    required: true,
  },
  eventId: { type: String, unique: true, sparse: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  category: { type: String, default: 'orders' },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    default: 'system',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('ProviderNotification', ProviderNotificationSchema);
