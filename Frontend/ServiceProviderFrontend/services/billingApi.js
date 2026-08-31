import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

const PROVIDER_SERVICE_URL = CONFIG?.PROVIDER_SERVICE_URL || 'http://localhost:3002';

const billingApi = axios.create({
  baseURL: `${PROVIDER_SERVICE_URL}/api/provider/billing`,
  timeout: 15000,
});

// Attach Authorization Bearer token to all outgoing billing requests
billingApi.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Get provider billing overview, active month bill, and suspension status
 */
export const getBillingOverview = async () => {
  const response = await billingApi.get('/overview');
  return response.data;
};

/**
 * Get specific month's bill details (e.g. "2026-08")
 */
export const getBillingByMonth = async (month) => {
  const response = await billingApi.get(`/month/${month}`);
  return response.data;
};

/**
 * Refresh/recalculate monthly billing statement from completed bookings
 */
export const refreshMonthlyBill = async (month = null) => {
  const response = await billingApi.post('/refresh', { month });
  return response.data;
};

/**
 * Check if the current provider is suspended due to unpaid platform service charges
 */
export const getSuspensionStatus = async () => {
  const response = await billingApi.get('/suspension-status');
  return response.data;
};

/**
 * Create Stripe checkout session for 5% platform service charge payment
 */
export const createCommissionCheckoutSession = async (billingId = null, month = null) => {
  const response = await billingApi.post('/create-checkout-session', { billingId, month });
  return response.data;
};

/**
 * Confirm Stripe payment completion and restore provider account features
 */
export const confirmCommissionPayment = async (sessionId) => {
  const response = await billingApi.post(`/confirm-payment/${sessionId}`);
  return response.data;
};

export default billingApi;
