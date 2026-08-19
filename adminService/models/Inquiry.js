const mongoose = require('mongoose');

const missedBookingSchema = new mongoose.Schema({
  bookingId: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  location: {
    type: String,
    default: '',
  },
  reason: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected'],
    default: 'Pending',
  },
  adminNote: {
    type: String,
    default: '',
  },
}, { _id: false });

const inquirySchema = new mongoose.Schema(
  {
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'Provider',
      index: true,
    },
    providerName: {
      type: String,
      required: true,
    },
    providerEmail: {
      type: String,
      required: true,
    },
    providerAvatar: {
      type: String,
      default: '',
    },
    providerRole: {
      type: String,
      default: 'Service Provider',
    },
    missedServices: [missedBookingSchema],
    reason: {
      type: String,
      required: true,
    },
    evidenceImages: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ['Submitted', 'Pending', 'Approved', 'Rejected'],
      default: 'Submitted',
    },
    adminNote: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Inquiry', inquirySchema);
