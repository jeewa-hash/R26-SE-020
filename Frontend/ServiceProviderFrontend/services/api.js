// Seeker_Mobile_App/services/api.js
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base API URL
const BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      const keysToClear = [
        'userToken',
        'token',
        'authToken',
        'accessToken',
        'userId',
        'providerId',
        'seekerId',
        'userRole',
        'role',
        'user',
        'currentUser',
        'provider',
        'seeker',
      ];
      AsyncStorage.multiRemove(keysToClear).then(() => {
        console.log('LOGOUT: all auth keys cleared');
      }).catch(() => {});
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
};

// Posts endpoints
export const postsAPI = {
  createPost: (postData) => api.post('/posts', postData),
  getPosts: () => api.get('/posts'),
  getPostById: (id) => api.get(`/posts/${id}`),
};

// Provider Requests endpoints
export const providerRequestsAPI = {
  createRequest: (requestData) => api.post('/provider-requests', requestData),
  getRequests: () => api.get('/provider-requests'),
  acceptRequest: (id) => api.put(`/provider-requests/${id}/accept`),
  rejectRequest: (id) => api.put(`/provider-requests/${id}/reject`),
};

// Bookings endpoints
export const bookingsAPI = {
  getBookings: () => api.get('/bookings'),
  createBooking: (bookingData) => api.post('/bookings', bookingData),
  rescheduleBooking: (id, newData) => api.put(`/bookings/${id}/reschedule`, newData),
  getBookingById: (id) => api.get(`/bookings/${id}`),
};

export default api;