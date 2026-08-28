const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const seekerAuthController = require('../controllers/seekerAuthController');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure Multer Storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Directory to save files
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

// ─── Update profile picture (secure, token required) ──
router.put(
  '/profile-picture',
  seekerAuthController.verifyToken,
  upload.any(), // ← accepts any field name (profilePicture, file, image, etc.)
  seekerAuthController.updateProfilePicture
);

// Routes
router.post('/register', upload.single('profilePicture'), seekerAuthController.register);
router.post('/verify-otp', seekerAuthController.verifyOTP);
router.post('/login', seekerAuthController.login);
router.post('/logout', seekerAuthController.logout);

// Get user by ID
router.get('/user/:id', seekerAuthController.getUserById);
router.put('/user/:userId', seekerAuthController.updateProfileById);
// Notification Routes
router.get('/notifications', seekerAuthController.verifyToken, seekerAuthController.getNotifications);
router.patch('/notifications/:id/read', seekerAuthController.verifyToken, seekerAuthController.markAsRead);
router.patch('/notifications/read-all', seekerAuthController.verifyToken, seekerAuthController.markAllAsRead);
router.delete('/notifications', seekerAuthController.verifyToken, seekerAuthController.clearNotifications);

module.exports = router;
