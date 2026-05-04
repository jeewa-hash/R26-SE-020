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
      enum: ['Admin', 'ServiceProvider', 'ServiceSeeker'],
    },
    nicNumber: {
      type: String,
      required: true,
      unique: true,
    },
    telephone: {
      type: String,
      required: false,
    },
    category: {
      type: String,
      required: false,
    },
    bio: {
      type: String,
      required: false,
    },
    district: {
      type: String,
      required: false,
    },
    location: {
      latitude: { type: Number, required: false },
      longitude: { type: Number, required: false },
    },
    nicImage: {
      type: String,
      required: false, // Make false because Admin might not have one, or handled later
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
    extractedNicNumber: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female'],
      required: false,
    },
    address: {
      type: String,
      required: false,
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

module.exports = mongoose.model('Provider', providerSchema);
