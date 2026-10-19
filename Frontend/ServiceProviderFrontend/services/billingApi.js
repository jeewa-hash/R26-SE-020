import axios from 'axios';
import { getStoredProviderAuth } from '../pages/IT22129376/services/providerAuthStorage';
import { CONFIG } from '../config';

const PROVIDER_SERVICE_URL = CONFIG?.PROVIDER_SERVICE_URL || 'https://r26-se-020-production.up.railway.app';

const billingApi = axios.create({
  baseURL: `${PROVIDER_SERVICE_URL}/api/provider/billing`,
  timeout: 15000,
});

// Attach Authorization Bearer token to all outgoing billing requests
billingApi.interceptors.request.use(async (config) => {
  const { token } = await getStoredProviderAuth();
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

export const getCompletedJobEarnings = async () => {
  const { token, providerId, isLoggedIn, user } = await getStoredProviderAuth();
  if (!token || !providerId || !isLoggedIn) throw new Error('Please sign in again to view earnings.');
  const response = await axios.get(`${CONFIG.COORDINATION_SERVICE_URL}/bookings/provider/${encodeURIComponent(providerId)}/earnings`, { headers: { Authorization: `Bearer ${token.replace(/^Bearer\s+/i, '')}` }, timeout: 15000 });
  const data = response.data?.data;
  if (!response.data?.success || !data || String(data.providerId) !== String(providerId) || !Array.isArray(data.bookings) || !Number.isFinite(data.totalIncome) || !Number.isInteger(data.completedBookingsCount)) throw new Error('Unable to verify earnings for the signed-in provider.');
  if (data.completedBookingsCount !== data.bookings.length || data.bookings.some(row => row.bookingStatus !== 'COMPLETED')) throw new Error('The earnings response is incomplete. Please refresh.');
  return { ...data, accountLabel: user?.fullName || user?.name || user?.businessName || `Provider · ${String(providerId).slice(-6)}` };
};
