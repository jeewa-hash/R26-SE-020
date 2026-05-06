const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

router.post('/retrain', (req, res) => {
    const scriptPath = path.join(__dirname, '../ml_service/train_auto.py');
    const mlServiceDir = path.join(__dirname, '../ml_service');

    console.log("Triggering Python Auto-Retrain...");

    // Add timeout to prevent hanging - 60 seconds should be enough for model training
    exec(`python "${scriptPath}"`, { cwd: mlServiceDir, timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Exec Error: ${error.message}`);
            console.error(`Stderr: ${stderr}`);
            // Python එකෙන් එන නියම Error එක (stderr) මෙතනින් බලාගන්න පුළුවන්
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