import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COORDINATION_SERVICE_URL } from '../config';

const coordinationApi = axios.create({
  baseURL: COORDINATION_SERVICE_URL,
  timeout: 10000,
});

coordinationApi.interceptors.request.use(async (requestConfig) => {
  const token =
    (await AsyncStorage.getItem('userToken')) ||
    (await AsyncStorage.getItem('providerToken')) ||
    (await AsyncStorage.getItem('authToken')) ||
    (await AsyncStorage.getItem('token'));

  if (token) {
    requestConfig.headers = requestConfig.headers || {};
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }

  return requestConfig;
});

export const getProviderCalendar = async (providerId = null) => {
  const endpoint = providerId
    ? `/calendar/provider/${providerId}`
    : '/calendar/provider/me';
  const response = await coordinationApi.get(endpoint);
  return response.data;
};

export const getBookingById = async (bookingId) => {
  const response = await coordinationApi.get(`/bookings/${bookingId}`);
  return response.data;
};

export const confirmBooking = async (bookingId) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/confirm`);
  return response.data;
};

export const startBooking = async (bookingId, actualStartTime) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/start`, {
    actualStartTime,
  });
  return response.data;
};

export const completeBooking = async (bookingId, actualEndTime) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/complete`, {
    actualEndTime,
  });
  return response.data;
};

export const reportStartDelay = async (payload) => {
  const response = await coordinationApi.post('/delays/start-delay', payload);
  return response.data;
};

export const reportExecutionDelay = async (payload) => {
  const response = await coordinationApi.post('/delays/execution-delay', payload);
  return response.data;
};

export const generateRescheduleSuggestions = async (payload) => {
  const response = await coordinationApi.post('/reschedule/suggest', payload);
  return response.data;
};

export default coordinationApi;