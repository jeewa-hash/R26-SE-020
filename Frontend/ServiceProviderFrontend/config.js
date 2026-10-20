// Set EXPO_PUBLIC_API_HOST to your computer's LAN IP when testing on a
// physical device (for example: 192.168.1.103). Android emulators use 10.0.2.2.
export const IP_ADDRESS = process.env.EXPO_PUBLIC_API_HOST || '10.66.146.163';

export const CONFIG = {
  // Live Deployed Cloud Services 🚀
  PROVIDER_SERVICE_URL: process.env.EXPO_PUBLIC_PROVIDER_SERVICE_URL || 'https://r26-se-020-production.up.railway.app',
  PROVIDER_SERVICE_API_URL: process.env.EXPO_PUBLIC_PROVIDER_SERVICE_API_URL || 'https://r26-se-020-production.up.railway.app',
  ML_SERVICE_URL: process.env.EXPO_PUBLIC_ML_SERVICE_URL || 'https://r26-se-020-production-faf9.up.railway.app',
  SEEKER_SERVICE_URL: process.env.EXPO_PUBLIC_SEEKER_SERVICE_URL || 'https://r26-se-020-production-db02.up.railway.app',
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://r26-se-020-production-db02.up.railway.app',
  AUTH_SERVICE_URL: process.env.EXPO_PUBLIC_AUTH_SERVICE_URL || 'https://r26-auth-service.onrender.com',
  ADMIN_SERVICE_URL: process.env.EXPO_PUBLIC_ADMIN_SERVICE_URL || 'https://r26-admin-service.onrender.com',
  COORDINATION_SERVICE_URL: (process.env.EXPO_PUBLIC_COORDINATION_API_URL ||
  'http://k8s-default-coordina-f35bbe8d02-1683340780.ap-southeast-2.elb.amazonaws.com').replace(/\/+$/, ''),
};

export const ADMIN_SERVICE_URL = CONFIG.ADMIN_SERVICE_URL;
export const AUTH_SERVICE_URL = CONFIG.AUTH_SERVICE_URL;
export const ML_SERVICE_URL = CONFIG.ML_SERVICE_URL;
export const SEEKER_SERVICE_URL = CONFIG.SEEKER_SERVICE_URL;
export const PROVIDER_SERVICE_URL = CONFIG.PROVIDER_SERVICE_URL;
export const PROVIDER_SERVICE_API_URL = CONFIG.PROVIDER_SERVICE_API_URL;
export const COORDINATION_SERVICE_URL = CONFIG.COORDINATION_SERVICE_URL;
export const API_BASE_URL = CONFIG.API_BASE_URL;
