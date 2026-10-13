const express = require('express');
const router = express.Router();
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');

router.post('/retrain', async (req, res) => {
    const ML_SERVICE_URL = process.env.ML_SERVICE_URL;

    console.log("Triggering Auto-Retrain...");

    // 1. In Microservice / Cloud deployment, forward request to Python ML service
    if (ML_SERVICE_URL) {
        try {
            console.log(`Forwarding retrain request to Python microservice: ${ML_SERVICE_URL}/retrain`);
            const response = await axios.post(`${ML_SERVICE_URL}/retrain`, {}, { timeout: 120000 });
            return res.status(200).json(response.data);
        } catch (err) {
            console.error('ML microservice retrain error:', err.response?.data || err.message);
            return res.status(500).json({
                error: "Failed to retrain model",
                details: err.response?.data?.details || err.response?.data?.error || err.message
            });
        }
    }

    // 2. Fallback to local python exec for local development
    const scriptPath = path.join(__dirname, '../ml_service/train_auto.py');
    const mlServiceDir = path.join(__dirname, '../ml_service');

    exec(`python "${scriptPath}"`, { cwd: mlServiceDir, timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec Error: ${error.message}`);
            console.error(`Stderr: ${stderr}`);
            return res.status(500).json({ 
                error: "Failed to retrain model", 
                details: stderr || error.message 
            });
        }
        
        console.log(`Python Output: ${stdout}`);
        res.status(200).json({ 
            message: "Model retrained successfully!", 
            details: stdout 
        });
    });
});

module.exports = router;