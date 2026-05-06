const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const providerAuthController = require('../controllers/providerAuthController');
const ServiceCategory = require('../models/ServiceCategory');

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
    // e.g. NIC-161045239-245.jpg
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

// Routes
router.post('/generate-bio', providerAuthController.generateBio);
router.post('/register', upload.fields([{ name: 'nicImage', maxCount: 1 }, { name: 'profileImage', maxCount: 1 }]), providerAuthController.register);
router.post('/login', providerAuthController.login);

// Public route to fetch all service categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await ServiceCategory.find().sort({ name: 1 });
    res.status(200).json(categories);
  } catch (err) {
    console.error('Error fetching categories:', err.message);
    res.status(500).json({ message: 'Server error while fetching categories' });
  }
});

// Notification routes
router.get('/notifications', providerAuthController.verifyProvider, providerAuthController.getNotifications);
router.patch('/notifications/read-all', providerAuthController.verifyProvider, providerAuthController.markAllNotificationsAsRead);
router.delete('/notifications', providerAuthController.verifyProvider, providerAuthController.clearAllNotifications);
router.patch('/notifications/:id/read', providerAuthController.verifyProvider, providerAuthController.markNotificationAsRead);

module.exports = router;
