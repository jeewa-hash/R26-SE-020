const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const app = express();
app.use(cors());

// Auth Service Proxy
app.use('/uploads', createProxyMiddleware({
    target: 'http://127.0.0.1:4003',
    changeOrigin: true,
    onError: (err, req, res) => { console.error('Proxy Error (/uploads):', err.message); res.status(500).send('Proxy Error'); }
}));

app.use('/api/auth', createProxyMiddleware({
    target: 'http://127.0.0.1:4003',
    changeOrigin: true,
    pathRewrite: { '^/api/auth': '' },
    onError: (err, req, res) => { console.error('Proxy Error (/api/auth):', err.message); res.status(500).send('Proxy Error'); }
}));

// Admin Service Proxy
app.use('/api', createProxyMiddleware({
    target: 'http://127.0.0.1:5001',
    changeOrigin: true,
    onError: (err, req, res) => { console.error('Proxy Error (/api):', err.message); res.status(500).send('Proxy Error'); }
}));

app.get('/', (req, res) => res.send('🚀 API Gateway is Running!'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`----------------------------------------------`);
    console.log(`🚀 API Gateway running on: http://localhost:${PORT}`);
    console.log(`🔗 Proxies /api/auth -> AuthService (4003)`);
    console.log(`🔗 Proxies /api/*    -> AdminService (5001)`);
    console.log(`----------------------------------------------`);
});
