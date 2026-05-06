// Seeker_Mobile_App/services/api.js
import axios from 'axios';
import { CONFIG } from '../config';

const apiClient = axios.create({
    baseURL: CONFIG.API_BASE_URL,
    timeout: 5000, 
});

export default apiClient;