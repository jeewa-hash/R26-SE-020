// config.js
// Use your machine's local IP (for physical devices) or '10.0.2.2' (for Android emulator)

// Expo supplies the development server host on devices; web uses its page host.
import Constants from 'expo-constants';
const developmentHost = Constants.expoConfig?.hostUri?.split(':')[0] ||
  (typeof window !== 'undefined' ? window.location.hostname : 'localhost');
export const IP_ADDRESS = process.env.EXPO_PUBLIC_API_HOST || developmentHost;
const serviceUrl = (port, hosted) => __DEV__ ? `http://${IP_ADDRESS}:${port}` : hosted;

// Local seeker and chat service in development (port 6001).
export const API_BASE_URL = process.env.EXPO_PUBLIC_SEEKER_SERVICE_URL || serviceUrl(6001, 'https://r26-se-020-production-db02.up.railway.app');
export const SOCKET_URL = API_BASE_URL; // Socket.IO uses the same Seeker service


// Explicit environment URLs take precedence over development defaults.
export const AUTH_SERVICE_URL = process.env.EXPO_PUBLIC_AUTH_SERVICE_URL || serviceUrl(4003, 'https://r26-auth-service.onrender.com');

// Hosted image diagnosis service (FastAPI). Keep this as the service root;
// screens append /predict and /flow/next for their respective requests.
export const IMAGE_CLASSIFIER_URL = 'https://elegant-forgiveness-production-00a1.up.railway.app';
export const TEXT_MODEL_URL =
    process.env.EXPO_PUBLIC_TEXT_MODEL_URL ||
    'https://extraordinary-communication-production-6db2.up.railway.app';

export const PROVIDER_SERVICE_URL =
    process.env.EXPO_PUBLIC_PROVIDER_SERVICE_URL ||
    serviceUrl(3002, 'https://r26-se-020-production.up.railway.app');
export const ML_SERVICE_URL =
    process.env.EXPO_PUBLIC_ML_SERVICE_URL ||
    'https://r26-se-020-production-faf9.up.railway.app';
export const PROVIDER_LIST_URL = `${ML_SERVICE_URL}/portfolio/all-providers`;
export const PROVIDER_API_BASE = ML_SERVICE_URL;

// Shared CONFIG object used across screens and services
export const CONFIG = {
    API_BASE_URL,
    SEEKER_SERVICE_URL: API_BASE_URL,
    COORDINATION_SERVICE_URL: (process.env.EXPO_PUBLIC_COORDINATION_API_URL ||
  serviceUrl(5010, 'http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com')).replace(/\/+$/, ''),
    PROVIDER_SERVICE_URL,
    PROVIDER_SERVICE_API_URL: PROVIDER_SERVICE_URL,
    ML_SERVICE_URL,
    IMAGE_CLASSIFIER_URL,
    TEXT_MODEL_URL,
};

export const COORDINATION_SERVICE_URL = CONFIG.COORDINATION_SERVICE_URL;
