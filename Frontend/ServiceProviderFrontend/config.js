// Change this IP address to your computer's current local IP address
// The mobile apps call the auth service directly on port 4003.
export const IP_ADDRESS = '192.168.8.101';

export const AUTH_SERVICE_URL = `http://${IP_ADDRESS}:4000/api/auth`;
export const ADMIN_SERVICE_URL = `http://${IP_ADDRESS}:4003/admin`;
export const COORDINATION_SERVICE_URL = `http://${IP_ADDRESS}:5005/api/coordination`;

// Temporary provider ID for demo.
// Later replace with logged-in provider ID.
export const DEMO_PROVIDER_ID = 'chaveenProvider@gmail.com';