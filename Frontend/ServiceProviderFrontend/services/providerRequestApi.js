import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const providerRequestApi = axios.create({
  baseURL: CONFIG.SEEKER_SERVICE_URL || CONFIG.API_BASE_URL,
  timeout: 15000,
});

providerRequestApi.interceptors.request.use(async (config) => {
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

export const createProviderRequest = async (payload) => {
  const response = await providerRequestApi.post('/request-quotations', payload);
  return response.data;
};

export const getProviderRequestsByProvider = async (providerId) => {
  const response = await providerRequestApi.get(`/request-quotations/provider-filtered/${providerId}`);
  return response.data;
};

export const updateRequestQuotationStatus = async (id, status) => {
  const response = await providerRequestApi.patch(`/request-quotations/${id}/status`, { status });
  return response.data;
};

export default providerRequestApi;
