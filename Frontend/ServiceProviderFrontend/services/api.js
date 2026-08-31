import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const createApi = (baseURL) => {
  const instance = axios.create({ baseURL, timeout: 15000 });

  instance.interceptors.request.use(async (config) => {
    const token =
      (await AsyncStorage.getItem('userToken')) ||
      (await AsyncStorage.getItem('token')) ||
      (await AsyncStorage.getItem('accessToken')) ||
      (await AsyncStorage.getItem('authToken'));

    if (token) {
      const cleanToken = String(token).replace(/^Bearer\s+/i, '').trim();
      config.headers.Authorization = `Bearer ${cleanToken}`;
    }
    config.headers.Accept = 'application/json';
    return config;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        const keysToClear = [
          'userToken', 'token', 'authToken', 'accessToken',
          'userId', 'providerId', 'seekerId', 'userRole', 'role',
          'user', 'currentUser', 'provider', 'seeker',
        ];
        await AsyncStorage.multiRemove(keysToClear).catch(() => {});
        console.log('LOGOUT: all auth keys cleared');
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const authApi = createApi(CONFIG.AUTH_SERVICE_URL);
const seekerApi = createApi(CONFIG.SEEKER_SERVICE_URL || CONFIG.API_BASE_URL);
const providerApi = createApi(CONFIG.PROVIDER_SERVICE_API_URL || CONFIG.PROVIDER_SERVICE_URL);
const coordinationApi = createApi(CONFIG.COORDINATION_SERVICE_URL);

export const authAPI = {
  login: (credentials) => authApi.post('/login', credentials),
};

export const postsAPI = {
  createPost: (postData) => providerApi.post('/api/provider/ads', postData),
  getPosts: () => providerApi.get('/api/provider/ads'),
  getPostById: (id) => providerApi.get(`/api/provider/ads/${id}`),
};

export const providerRequestsAPI = {
  createRequest: (requestData) => seekerApi.post('/request-quotations', requestData),
  getRequests: (providerId) =>
    providerId
      ? seekerApi.get(`/request-quotations/provider-filtered/${providerId}`)
      : seekerApi.get('/request-quotations/provider/me'),
  updateRequestStatus: (id, status) => seekerApi.patch(`/request-quotations/${id}/status`, { status }),
  acceptRequest: (id) => seekerApi.patch(`/request-quotations/${id}/status`, { status: 'accepted' }),
  rejectRequest: (id) => seekerApi.patch(`/request-quotations/${id}/status`, { status: 'rejected' }),
};

export const quotationsAPI = {
  getProviderQuotations: () => providerApi.get('/api/provider/quotations/provider/me'),
  submitQuotation: (quotationData) => providerApi.post('/api/provider/quotations', quotationData),
  getQuotationById: (id) => providerApi.get(`/api/provider/quotations/${id}`),
};

export const bookingsAPI = {
  getBookings: (providerId) =>
    providerId
      ? coordinationApi.get(`/bookings/provider/${providerId}`)
      : coordinationApi.get('/bookings/provider/me'),
  getOngoingBookings: (providerId) =>
    providerId
      ? coordinationApi.get(`/bookings/provider/${providerId}/ongoing`)
      : coordinationApi.get('/bookings/provider/me/ongoing'),
  createBooking: (bookingData) => coordinationApi.post('/bookings', bookingData),
  getBookingById: (id) => coordinationApi.get(`/bookings/${id}`),
  confirmReady: (id) => coordinationApi.put(`/bookings/${id}/confirm-ready`),
  startBooking: (id) => coordinationApi.put(`/bookings/${id}/start`),
  reportDelay: (id, payload) => coordinationApi.put(`/bookings/${id}/report-delay`, payload),
  completeBooking: (id) => coordinationApi.put(`/bookings/${id}/complete`),
  rescheduleBooking: (id, newData) => coordinationApi.put(`/bookings/${id}/reschedule`, newData),
};

export default providerApi;
