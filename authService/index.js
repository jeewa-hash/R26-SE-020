const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Auth MongoDB Connected Successfully'))
    .catch(err => console.error('❌ Auth MongoDB Connection Error:', err));

const providerAuthRoutes = require('./routes/providerAuthRoutes');
app.use('/', providerAuthRoutes);

const seekerAuthRoutes = require('./routes/seekerAuthRoutes');
app.use('/seeker', seekerAuthRoutes);

const adminRoutes = require('./routes/adminRoutes');
app.use('/admin', adminRoutes);

app.get('/', (req, res) => res.send('🚀 AuthService is Running!'));

const PORT = process.env.PORT || 4003;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 AuthService running on: http://0.0.0.0:${PORT}`);
    console.log(`📡 Accessible via network at: http://YOUR_IP:${PORT}`);
});
