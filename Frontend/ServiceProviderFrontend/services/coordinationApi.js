import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const coordinationApi = axios.create({
  baseURL: CONFIG.COORDINATION_SERVICE_URL,
  timeout: 15000,
});

coordinationApi.interceptors.request.use(async (config) => {
  const token =
    (await AsyncStorage.getItem('userToken')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('authToken'));

  if (token) {
    config.headers.Authorization = `Bearer ${String(token).replace(/^Bearer\s+/i, '').trim()}`;
  }
  config.headers.Accept = 'application/json';
  return config;
});

export const getProviderCalendar = async (providerId) => {
  const response = await coordinationApi.get(`/calendar/provider/${providerId}`);
  return response.data;
};

export const getProviderBookings = async (providerId) => {
  const response = await coordinationApi.get(providerId ? `/bookings/provider/${providerId}` : '/bookings/provider/me');
  return response.data;
};

export const getProviderOngoingBookings = async (providerId) => {
  const response = await coordinationApi.get(providerId ? `/bookings/provider/${providerId}/ongoing` : '/bookings/provider/me/ongoing');
  return response.data;
};

export const getBookingById = async (bookingId) => {
  const response = await coordinationApi.get(`/bookings/${bookingId}`);
  return response.data;
};

export const confirmProviderReady = async (bookingId) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/confirm-ready`);
  return response.data;
};

export const startBooking = async (bookingId) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/start`);
  return response.data;
};

export const reportDelay = async (bookingId, payload) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/report-delay`, payload);
  return response.data;
};

export const completeBooking = async (bookingId) => {
  const response = await coordinationApi.put(`/bookings/${bookingId}/complete`);
  return response.data;
};

export const generateRescheduleSuggestions = async (payload) => {
  const response = await coordinationApi.post('/reschedules/suggest', payload);
  return response.data;
};

export default coordinationApi;
