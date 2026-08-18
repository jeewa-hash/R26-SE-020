const mongoose = require('mongoose');

const HighDemandAlertLogSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  district: {
    type: String,
    required: true,
  },
  timeframe: {
    type: String,
    required: true,
  },
  date: {
    type: String,
    required: true, // Format: YYYY-MM-DD
  },
}, { timestamps: true });

// Ensure we don't insert duplicate logs for the same combination
HighDemandAlertLogSchema.index({ category: 1, district: 1, timeframe: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('HighDemandAlertLog', HighDemandAlertLogSchema);
