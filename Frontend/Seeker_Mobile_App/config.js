// config.js
// Use your machine's local IP (for physical devices) or '10.0.2.2' (for Android emulator)

export const IP_ADDRESS = '172.20.10.13';   // <-- no spaces!

// Chat service (port 6000)
export const API_BASE_URL = `http://${IP_ADDRESS}:6000`;   // used by ChatContext & ChatScreen
export const SOCKET_URL = `http://${IP_ADDRESS}:6000`;     // same for socket

// Other services
export const AUTH_SERVICE_URL = `http://${IP_ADDRESS}:4003`;
export const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:5000/portfolio/all-providers`;
export const PROVIDER_API_BASE = `http://${IP_ADDRESS}:5000`;  

// If you need a legacy CONFIG object (points to main backend on port 5002)
export const CONFIG = {
    API_BASE_URL: `http://${IP_ADDRESS}:5002`,
};