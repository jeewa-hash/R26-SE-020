// Change this IP address to your computer's current local IP address
// The mobile apps call the auth service directly on port 4003.
export const IP_ADDRESS = '192.168.8.101';

export const AUTH_SERVICE_URL = `http://${IP_ADDRESS}:4003/api/auth`;
export const ADMIN_SERVICE_URL = `http://${IP_ADDRESS}:5001/admin`;
export const COORDINATION_SERVICE_URL = `http://${IP_ADDRESS}:5005/api/coordination`;
export const SEEKER_SERVICE_URL = `http://${IP_ADDRESS}:6000`;

// Temporary fallback provider ID when the logged-in token does not provide an ID.
export const DEMO_PROVIDER_ID = '69ffe6736234d2bc8cc28e5e';