const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
      enum: ['User', 'Category', 'NIC', 'Admin', 'Demand Forecasting'],
    },
    actionOwner: {
      adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true,
      },
      fullName: {
        type: String,
        required: true,
      },
    },
    target: {
      id: { type: String },
      name: { type: String },
      type: { type: String }, // e.g., 'Provider', 'Seeker', 'Category'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
