const mongoose = require('mongoose');

const seekerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    role: { type: String, default: 'Seeker' },
    district: { type: String, required: true },
    telephone: { type: String },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.models.Seeker || mongoose.model('Seeker', seekerSchema);
