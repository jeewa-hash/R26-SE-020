const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Public routes
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);

// Protected routes (only logged-in admin can access)
router.post('/register', adminController.verifyAdmin, adminController.register);
router.get('/profile', adminController.verifyAdmin, adminController.getProfile);
router.get('/dashboard-stats', adminController.verifyAdmin, adminController.getDashboardStats);
router.get('/user-growth', adminController.verifyAdmin, adminController.getUserGrowthData);
router.get('/users', adminController.verifyAdmin, adminController.getAllUsers);
router.put('/users/:type/:id', adminController.verifyAdmin, adminController.updateUser);
router.delete('/users/:type/:id', adminController.verifyAdmin, adminController.deleteUser);
router.patch('/users/:type/:id/status', adminController.verifyAdmin, adminController.toggleUserStatus);

// Provider NIC Verification Routes
router.get('/providers/unverified', adminController.verifyAdmin, adminController.getUnverifiedProviders);
router.get('/providers/rejected', adminController.verifyAdmin, adminController.getRejectedProviders);
router.get('/providers/:id/verify-details', adminController.verifyAdmin, adminController.getProviderVerificationDetails);
router.patch('/providers/:id/verify', adminController.verifyAdmin, adminController.verifyProvider);

// Admin Notification Routes
router.get('/notifications', adminController.verifyAdmin, adminController.getNotifications);
router.patch('/notifications/:id/read', adminController.verifyAdmin, adminController.markNotificationAsRead);
router.patch('/notifications/read-all', adminController.verifyAdmin, adminController.markAllNotificationsAsRead);
router.delete('/notifications', adminController.verifyAdmin, adminController.clearAllNotifications);

// Audit Log Routes
router.get('/audit-logs', adminController.verifyAdmin, adminController.getAuditLogs);
router.post('/audit-logs/internal', adminController.createAuditLogInternal);

// Demand Forecasting Alert Route
router.post('/notify-high-demand', adminController.verifyAdmin, adminController.dispatchHighDemandAlerts);

module.exports = router;
