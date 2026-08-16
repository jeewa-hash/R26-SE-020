import axios from 'axios';
import { COORDINATION_SERVICE_URL } from '../config';

const providerRequestApi = axios.create({
  baseURL: COORDINATION_SERVICE_URL,
  timeout: 10000,
});

export const createProviderRequest = async (payload) => {
  const response = await providerRequestApi.post('/requests', payload);
  return response.data;
};

export const getProviderRequestsByProvider = async (providerId) => {
  const response = await providerRequestApi.get(`/requests/provider/${providerId}`);
  return response.data;
};

export default providerRequestApi;
