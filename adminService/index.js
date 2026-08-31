const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // <-- fixes SRV lookup without touching MONGO_URI
require('dotenv').config();

const app = express();

const path = require('path');

// Middleware
app.use(cors());
app.use(express.json()); // JSON data handle කරන්න
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- MongoDB Connection ---
// .env file එකේ MONGO_URI එක නැත්නම් local එකට connect වේ.
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected Successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// --- Import Routes ---
const testMLRoutes = require('./routes/testML'); 
const retrainRoutes = require('./routes/retrain');
const categoryRoutes = require('./routes/categoryRoutes');
const inquiryRoutes = require('./routes/inquiryRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
// සටහන: ඔයාගේ routes folder එකේ testML.js නමින් file එකක් තියෙන්න ඕනේ.

// --- Route Mounting ---
app.use('/', testMLRoutes);
app.use('/', retrainRoutes);
app.use('/', categoryRoutes);
app.use('/api', inquiryRoutes);
app.use('/', inquiryRoutes);
app.use('/api', analyticsRoutes);
app.use('/', analyticsRoutes);

// Base route for testing
app.get('/', (req, res) => {
    res.send('🚀 R26-SE-020 Backend Server is Running!');
});

const { initBookingWatcher } = require('./controllers/mlDataController');

// --- Server Port ---
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log(`----------------------------------------------`);
    console.log(`🚀 Server running on: http://localhost:${PORT}`);
    console.log(`📂 ML Data Logging: http://localhost:${PORT}/api/test-log`);
    console.log(`----------------------------------------------`);
    
    // Start Real-Time Watcher for Bookings -> service_data_for_csvs
    initBookingWatcher();
});