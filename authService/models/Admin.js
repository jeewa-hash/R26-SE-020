const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    nic: {
      type: String,
      required: true,
      unique: true,
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
    telephone: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      required: true,
      default: 'Admin',
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    otp: {
      type: String,
      default: null,
    },
    otpExpires: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Admin', adminSchema);
