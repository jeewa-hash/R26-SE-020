import axios from 'axios';
import { COORDINATION_SERVICE_URL } from '../config';

const coordinationApi = axios.create({
  baseURL: COORDINATION_SERVICE_URL,
  timeout: 10000,
});

export const getProviderCalendar = async (providerId) => {
  const response = await coordinationApi.get(`/calendar/provider/${providerId}`);
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