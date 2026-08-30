export const IP_ADDRESS = '192.168.8.101';

export const API_BASE_URL = `http://${IP_ADDRESS}:6000`;
export const SOCKET_URL = `http://${IP_ADDRESS}:6000`;

export const AUTH_SERVICE_URL = `http://${IP_ADDRESS}:4003`;

export const SEEKER_SERVICE_URL = `http://${IP_ADDRESS}:6000`;
export const PROVIDER_SERVICE_API_URL = `http://${IP_ADDRESS}:3002`;
export const COORDINATION_SERVICE_URL = `http://${IP_ADDRESS}:5010`;

// Legacy endpoints retained for screens that still use the portfolio service.
export const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:5000/portfolio/all-providers`;
export const PROVIDER_API_BASE = `http://${IP_ADDRESS}:5000`;

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
