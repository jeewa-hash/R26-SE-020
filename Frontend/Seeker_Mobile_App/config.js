// config.js
// Use your machine's local IP (for physical devices) or '10.0.2.2' (for Android emulator)

export const IP_ADDRESS = '192.168.1.22';

// Chat service (port 6000)
export const API_BASE_URL = `http://${IP_ADDRESS}:6000`;   // used by ChatContext & ChatScreen
export const SOCKET_URL = `http://${IP_ADDRESS}:6000`;     // same for socket


// Live Cloud Render Services 🚀
export const AUTH_SERVICE_URL = 'https://r26-auth-service.onrender.com';

export const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:5000/portfolio/all-providers`;
export const PROVIDER_API_BASE = `http://${IP_ADDRESS}:5000`;

// Shared CONFIG object used across screens and services
export const CONFIG = {
    API_BASE_URL: `http://${IP_ADDRESS}:5002`,
    SEEKER_SERVICE_URL: `http://${IP_ADDRESS}:6000`,
    COORDINATION_SERVICE_URL: `http://${IP_ADDRESS}:5010`,
    PROVIDER_SERVICE_API_URL: `http://${IP_ADDRESS}:5000`,
    IMAGE_CLASSIFIER_URL,
    TEXT_MODEL_URL,
};
