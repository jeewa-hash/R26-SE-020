const mongoose = require('mongoose');

const providerSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['ServiceProvider'],
      default: 'ServiceProvider',
    },
    nicNumber: {
      type: String,
      required: true,
      unique: true,
    },
    telephone: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    bio: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: true,
    },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    nicImage: {
      type: String,
      required: true,
    },
    profileImage: {
      type: String,
      required: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    consecutiveRejections: {
      type: Number,
      default: 0,
    },
    blockedUntil: {
      type: Date,
      default: null,
    },
    blockReason: {
      type: String,
      default: '',
    },
    lastUnblockedAt: {
      type: Date,
      default: null,
    },
    extractedNicNumber: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    isRejected: {
      type: Boolean,
      default: false,
    },
    adminNote: {
      type: String,
      required: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Provider || mongoose.model('Provider', providerSchema);
