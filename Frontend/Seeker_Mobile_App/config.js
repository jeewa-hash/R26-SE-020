// config.js
// Use your machine's local IP (for physical devices) or '10.0.2.2' (for Android emulator)

export const IP_ADDRESS = '192.168.1.22';

// Chat service (port 6000)
export const API_BASE_URL = 'https://r26-se-020-production-db02.up.railway.app';
export const SOCKET_URL = API_BASE_URL; // Socket.IO uses the same hosted Seeker service


// Live Cloud Render Services 🚀
export const AUTH_SERVICE_URL = 'https://r26-auth-service.onrender.com';

// Hosted image diagnosis service (FastAPI). Keep this as the service root;
// screens append /predict and /flow/next for their respective requests.
export const IMAGE_CLASSIFIER_URL = 'https://elegant-forgiveness-production-00a1.up.railway.app';
export const TEXT_MODEL_URL = `http://${IP_ADDRESS}:5002`;

export const PROVIDER_SERVICE_URL =
    process.env.EXPO_PUBLIC_PROVIDER_SERVICE_URL ||
    'https://r26-se-020-production.up.railway.app';
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
  'http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com').replace(/\/+$/, ''),
    PROVIDER_SERVICE_URL,
    PROVIDER_SERVICE_API_URL: PROVIDER_SERVICE_URL,
    ML_SERVICE_URL,
    IMAGE_CLASSIFIER_URL,
    TEXT_MODEL_URL,
};

export const COORDINATION_SERVICE_URL = CONFIG.COORDINATION_SERVICE_URL;
