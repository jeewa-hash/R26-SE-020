const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');

// Public routes
router.post('/login', adminController.login);
router.post('/logout', adminController.logout);

// Protected routes (only logged-in admin can access)
router.post('/register', adminController.verifyAdmin, adminController.register);
router.get('/profile', adminController.verifyAdmin, adminController.getProfile);

module.exports = router;
