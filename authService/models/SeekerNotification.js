const mongoose = require('mongoose');

const SeekerNotificationSchema = new mongoose.Schema({
  seekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seeker',
    required: true,
  },
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

module.exports = mongoose.model('SeekerNotification', SeekerNotificationSchema);
