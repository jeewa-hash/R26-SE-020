const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // JSON data handle කරන්න

// --- MongoDB Connection ---
// .env file එකේ MONGO_URI එක නැත්නම් local එකට connect වේ.
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Import Routes ---
const testMLRoutes = require('./routes/testML'); 
const retrainRoutes = require('./routes/retrain');
// සටහන: ඔයාගේ routes folder එකේ testML.js නමින් file එකක් තියෙන්න ඕනේ.

// --- Route Mounting ---
app.use('/', testMLRoutes);
app.use('/', retrainRoutes);

// Base route for testing
app.get('/', (req, res) => {
    res.send('🚀 R26-SE-020 Backend Server is Running!');
});

// --- Server Port ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`----------------------------------------------`);
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`📂 ML Data Logging: http://localhost:${PORT}/api/test-log`);
    console.log(`----------------------------------------------`);
});