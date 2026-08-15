const mongoose = require('mongoose');

const seekerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      enum: ['Seeker'],
      default: 'Seeker',
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
    district: {
      type: String,
      required: true,
    },
    location: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    profilePicture: {
      type: String,
      required: false,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      required: false,
    },
    otpExpires: {
      type: Date,
      required: false,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Seeker', seekerSchema);
