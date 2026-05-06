const express = require('express');
const router = express.Router();
const { logServiceForML, getSmartPrediction, getSmartPredictionBatch } = require('../controllers/mlDataController');

router.post('/test-log', async (req, res) => {
    // Postman එකෙන් එවන දත්ත
    await logServiceForML(req.body);
    res.status(200).json({ message: "Mock data processed and saved to ML table" });
});

// ML Tracking Route (logs actual completed services)
router.post('/log-ml-data', logServiceForML);

// Smart Prediction Route (queries python model)
router.post('/get-prediction', getSmartPrediction);

// Smart Prediction Batch Route (for dashboards)
router.post('/get-prediction-batch', getSmartPredictionBatch);

module.exports = router;