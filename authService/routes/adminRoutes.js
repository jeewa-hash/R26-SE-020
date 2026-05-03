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
router.get('/users', adminController.verifyAdmin, adminController.getAllUsers);
router.put('/users/:type/:id', adminController.verifyAdmin, adminController.updateUser);
router.delete('/users/:type/:id', adminController.verifyAdmin, adminController.deleteUser);
router.patch('/users/:type/:id/status', adminController.verifyAdmin, adminController.toggleUserStatus);

module.exports = router;
