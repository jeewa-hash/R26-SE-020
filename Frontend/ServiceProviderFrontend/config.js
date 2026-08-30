import { Platform } from 'react-native';

// Set EXPO_PUBLIC_API_HOST to your computer's LAN IP when testing on a
// physical device (for example: 192.168.1.103). Android emulators use 10.0.2.2.
export const IP_ADDRESS =
  process.env.EXPO_PUBLIC_API_HOST ||
  (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');

export const CONFIG = {
  API_BASE_URL: `http://${IP_ADDRESS}:6000`,
  SEEKER_SERVICE_URL: `http://${IP_ADDRESS}:6000`,
  AUTH_SERVICE_URL: `http://${IP_ADDRESS}:4003`,
  ADMIN_SERVICE_URL: `http://${IP_ADDRESS}:5002`,
  PROVIDER_SERVICE_URL: `http://${IP_ADDRESS}:3002`,
  ML_SERVICE_URL: `http://${IP_ADDRESS}:5000`,
};

// Legacy exports for backward compatibility
export const AUTH_SERVICE_URL = CONFIG.AUTH_SERVICE_URL;
export const SEEKER_SERVICE_URL = CONFIG.SEEKER_SERVICE_URL;
export const ADMIN_SERVICE_URL = CONFIG.ADMIN_SERVICE_URL;
export const PROVIDER_SERVICE_URL = CONFIG.PROVIDER_SERVICE_URL;
export const ML_SERVICE_URL = CONFIG.ML_SERVICE_URL;
