// config.js
// Use your machine's local IP (for physical devices) or '10.0.2.2' (for Android emulator)

export const IP_ADDRESS = process.env.EXPO_PUBLIC_API_HOST || '192.168.8.101';

// Chat service (port 6001)
export const API_BASE_URL = process.env.EXPO_PUBLIC_SEEKER_SERVICE_URL || `http://${IP_ADDRESS}:6001`;
export const SOCKET_URL = API_BASE_URL; // Socket.IO uses the same Seeker service


// Core APIs default to the local laptop for device testing.
export const AUTH_SERVICE_URL = process.env.EXPO_PUBLIC_AUTH_SERVICE_URL || `http://${IP_ADDRESS}:4003`;

// Hosted image diagnosis service (FastAPI). Keep this as the service root;
// screens append /predict and /flow/next for their respective requests.
export const IMAGE_CLASSIFIER_URL = 'https://elegant-forgiveness-production-00a1.up.railway.app';
export const TEXT_MODEL_URL = `http://${IP_ADDRESS}:5002`;

export const PROVIDER_SERVICE_URL =
    process.env.EXPO_PUBLIC_PROVIDER_SERVICE_URL ||
    `http://${IP_ADDRESS}:3002`;
export const ML_SERVICE_URL =
    process.env.EXPO_PUBLIC_ML_SERVICE_URL ||
    'https://r26-se-020-production-faf9.up.railway.app';
export const PROVIDER_LIST_URL = `${ML_SERVICE_URL}/portfolio/all-providers`;
export const PROVIDER_API_BASE = ML_SERVICE_URL;

// Shared CONFIG object used across screens and services
export const CONFIG = {
    API_BASE_URL: `http://${IP_ADDRESS}:5002`,
    SEEKER_SERVICE_URL: API_BASE_URL,
    COORDINATION_SERVICE_URL: (process.env.EXPO_PUBLIC_COORDINATION_API_URL ||
  `http://${IP_ADDRESS}:5010`).replace(/\/+$/, ''),
    PROVIDER_SERVICE_URL,
    PROVIDER_SERVICE_API_URL: PROVIDER_SERVICE_URL,
    ML_SERVICE_URL,
    IMAGE_CLASSIFIER_URL,
    TEXT_MODEL_URL,
};

export const COORDINATION_SERVICE_URL = CONFIG.COORDINATION_SERVICE_URL;
