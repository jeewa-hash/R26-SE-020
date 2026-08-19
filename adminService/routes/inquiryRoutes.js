const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const inquiryController = require('../controllers/inquiryController');

// Multer storage setup for evidence uploads
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'evidence-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

// Provider inquiry endpoints
router.post('/inquiries', upload.array('evidenceImages', 5), inquiryController.submitInquiry);
router.get('/inquiries/missed-bookings/:providerId', inquiryController.getProviderMissedBookings);

// Admin inquiry & penalty management endpoints
router.get('/inquiries', inquiryController.getAllInquiries);
router.get('/inquiries/penalty-registry', inquiryController.getPenaltyRegistry);
router.put('/inquiries/:id/review', inquiryController.reviewInquiry);
router.put('/inquiries/provider/:id/toggle-lock', inquiryController.toggleProviderLock);

module.exports = router;
