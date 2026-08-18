const AuditLog = require('../models/AuditLog');

/**
 * Helper function to create an audit log entry
 * @param {Object} params
 * @param {string} params.action - The action performed (e.g., 'User Blocked')
 * @param {string} params.category - Action category ('User', 'Category', 'NIC', 'Admin')
 * @param {Object} params.admin - Admin object containing _id and fullName
 * @param {Object} [params.target] - Target details { id, name, type }
 * @param {Object} [params.metadata] - Extra details
 */
const createAuditLog = async ({ action, category, admin, target, metadata }) => {
  try {
    const log = new AuditLog({
      action,
      category,
      actionOwner: {
        adminId: admin._id,
        fullName: admin.fullName,
      },
      target,
      metadata,
    });
    await log.save();
    console.log(`Audit log created: ${action}`);
  } catch (err) {
    console.error('Error creating audit log:', err);
  }
};

module.exports = { createAuditLog };
