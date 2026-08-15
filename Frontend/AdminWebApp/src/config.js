// IP address logic for easy local testing across devices
export const IP_ADDRESS = 'localhost'; 

// Environment variables for deployment
export const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_URL || `http://${IP_ADDRESS}:4003`;
export const ADMIN_SERVICE_URL = import.meta.env.VITE_ADMIN_URL || `http://${IP_ADDRESS}:5001`;

// Base API URLs
export const API_BASE_URL = `${AUTH_SERVICE_URL}/admin`;
