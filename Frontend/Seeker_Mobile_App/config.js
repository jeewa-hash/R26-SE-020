// config.js
// Use your machine's LAN IP when testing on a physical device.
// Android emulator can use 10.0.2.2.

export const IP_ADDRESS =
  process.env.EXPO_PUBLIC_API_HOST || '192.168.8.100';

const url = (port) => `http://${IP_ADDRESS}:${port}`;

export const AUTH_SERVICE_URL = url(4003);
export const SEEKER_SERVICE_URL = url(6000);
export const CHAT_SERVICE_URL = url(6000);
export const PROVIDER_SERVICE_URL = url(3002);
export const PROVIDER_API_BASE = PROVIDER_SERVICE_URL;
export const PROVIDER_PORTAL_URL = PROVIDER_SERVICE_URL;
export const ADMIN_SERVICE_URL = url(5002);
export const SERVICE_COORDINATION_SERVICE_URL = url(5010);
export const ML_SERVICE_URL = url(8000);

export const API_BASE_URL = CHAT_SERVICE_URL;
export const SOCKET_URL = CHAT_SERVICE_URL;

export const TEXT_PREDICT_URL = `${ADMIN_SERVICE_URL}/text-predict`;
export const TEXT_CHAT_URL = `${ADMIN_SERVICE_URL}/text-chat`;
export const IMAGE_PREDICT_URL = `${ML_SERVICE_URL}/predict`;
export const IMAGE_FLOW_NEXT_URL = `${ML_SERVICE_URL}/flow/next`;

export const CONFIG = {
  API_BASE_URL,
  SOCKET_URL,
  AUTH_SERVICE_URL,
  SEEKER_SERVICE_URL,
  CHAT_SERVICE_URL,
  PROVIDER_SERVICE_URL,
  PROVIDER_API_BASE,
  PROVIDER_PORTAL_URL,
  ADMIN_SERVICE_URL,
  SERVICE_COORDINATION_SERVICE_URL,
  ML_SERVICE_URL,
  TEXT_PREDICT_URL,
  TEXT_CHAT_URL,
  IMAGE_PREDICT_URL,
  IMAGE_FLOW_NEXT_URL,
};
