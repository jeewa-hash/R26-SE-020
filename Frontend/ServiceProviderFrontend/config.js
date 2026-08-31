// Set EXPO_PUBLIC_API_HOST to your computer's LAN IP when testing on a
// physical device (for example: 192.168.1.103). Android emulators use 10.0.2.2.
export const IP_ADDRESS =
  process.env.EXPO_PUBLIC_API_HOST ||  '192.168.8.100'; //'192.168.1.38';

export const CONFIG = {
  API_BASE_URL: `http://${IP_ADDRESS}:6000`,
  SEEKER_SERVICE_URL: `http://${IP_ADDRESS}:6000`,
  AUTH_SERVICE_URL: `http://${IP_ADDRESS}:4003`,
  ADMIN_SERVICE_URL: `http://${IP_ADDRESS}:5002`,
  PROVIDER_SERVICE_URL: `http://${IP_ADDRESS}:3002`,
  PROVIDER_SERVICE_API_URL: `http://${IP_ADDRESS}:3002`,
  ML_SERVICE_URL: `http://${IP_ADDRESS}:5000`,
  COORDINATION_SERVICE_URL: `http://${IP_ADDRESS}:5010`,
};

export const ADMIN_SERVICE_URL = CONFIG.ADMIN_SERVICE_URL;
export const ML_SERVICE_URL = CONFIG.ML_SERVICE_URL;
