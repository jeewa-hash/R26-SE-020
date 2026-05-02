const express = require('express');
const router = express.Router();
const { logServiceForML, getSmartPrediction } = require('../controllers/mlDataController');

router.post('/test-log', async (req, res) => {
    // Postman එකෙන් එවන දත්ත
    await logServiceForML(req.body);
    res.status(200).json({ message: "Mock data processed and saved to ML table" });
});

router.post('/get-prediction', getSmartPrediction);

module.exports = router;