import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG, IP_ADDRESS } from '../config';

const baseURL =
  CONFIG?.COORDINATION_SERVICE_URL ||
  `http://${IP_ADDRESS}:5005/api/coordination`;

const coordinationClient = axios.create({
  baseURL,
  timeout: 10000,
});

coordinationClient.interceptors.request.use(async (requestConfig) => {
  const token =
    (await AsyncStorage.getItem('userToken')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('authToken'));

  if (token) {
    requestConfig.headers = requestConfig.headers || {};
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

export const checkBidCoordination = async (payload) => {
  const response = await coordinationClient.post('/bid-coordination/check', payload);
  return response.data;
};

export const acceptBidCoordination = async (bidCoordinationId) => {
  const response = await coordinationClient.put(
    `/bid-coordination/${bidCoordinationId}/accept`
  );
  return response.data;
};

export const rejectBidCoordination = async (bidCoordinationId) => {
  const response = await coordinationClient.put(
    `/bid-coordination/${bidCoordinationId}/reject`
  );
  return response.data;
};

export const createBookingFromBid = async (bidCoordinationId) => {
  const response = await coordinationClient.post(
    `/bookings/from-bid/${bidCoordinationId}`
  );
  return response.data;
};

export const getSeekerCalendar = async (seekerId = null) => {
  const endpoint = seekerId ? `/calendar/seeker/${seekerId}` : '/calendar/seeker/me';
  const response = await coordinationClient.get(endpoint);
  return response.data;
};

export const getProviderCalendar = async (providerId) => {
  const response = await coordinationClient.get(`/calendar/provider/${providerId}`);
  return response.data;
};

export default coordinationClient;
