const express = require('express');
const router = express.Router();
const { logServiceForML, logBookingForML, getSmartPrediction, getSmartPredictionBatch } = require('../controllers/mlDataController');

router.post('/test-log', async (req, res) => {
    // Postman එකෙන් එවන දත්ත
    await logServiceForML(req.body);
    res.status(200).json({ message: "Mock data processed and saved to ML table" });
});

// ML Tracking Routes (logs actual completed services & bookings)
router.post('/log-ml-data', logServiceForML);
router.post('/log-booking-ml', async (req, res) => {
    try {
        const result = await logBookingForML(req.body);
        res.status(200).json({ success: true, message: 'Booking logged for ML', data: result });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Smart Prediction Route (queries python model)
router.post('/get-prediction', getSmartPrediction);

// Smart Prediction Batch Route (for dashboards)
router.post('/get-prediction-batch', getSmartPredictionBatch);

module.exports = router;