// Set EXPO_PUBLIC_API_HOST to your computer's LAN IP when testing on a
// physical device (for example: 192.168.1.103). Android emulators use 10.0.2.2.
export const IP_ADDRESS = process.env.EXPO_PUBLIC_API_HOST || '192.168.8.101'; //'192.168.56.1'; //'192.168.1.38' 169.254.230.160; '172.28.31.24'; 

export const CONFIG = {
  API_BASE_URL: 'https://r26-se-020-production-db02.up.railway.app',
  SEEKER_SERVICE_URL: 'https://r26-se-020-production-db02.up.railway.app',
  // Live Cloud Render Services 🚀
  AUTH_SERVICE_URL: 'https://r26-auth-service.onrender.com',
  ADMIN_SERVICE_URL: 'https://r26-admin-service.onrender.com',

  // Deployed services
  PROVIDER_SERVICE_URL: 'https://r26-se-020-production.up.railway.app',
  PROVIDER_SERVICE_API_URL: 'https://r26-se-020-production.up.railway.app',
  ML_SERVICE_URL: 'https://r26-se-020-production-faf9.up.railway.app',
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
//export const AUTH_SERVICE_URL = CONFIG.AUTH_SERVICE_URL;
export const API_BASE_URL = CONFIG.API_BASE_URL;
