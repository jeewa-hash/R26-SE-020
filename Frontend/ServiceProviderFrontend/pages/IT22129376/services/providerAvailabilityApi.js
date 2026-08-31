import { COORDINATION_SERVICE_URL } from '../../../config';
import { getStoredProviderAuth } from './providerAuthStorage';

const request = async (path, options = {}) => {
  const { token } = await getStoredProviderAuth();
  const response = await fetch(`${COORDINATION_SERVICE_URL}${path}`, {
    ...options,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  let payload = {};
  try { payload = await response.json(); } catch (error) {}
  if (!response.ok) {
    const error = new Error(payload?.message || 'Unable to update availability right now.');
    error.status = response.status;
    throw error;
  }
  return payload?.data || payload;
};

export const getMyAvailability = async () => {
  const { providerId } = await getStoredProviderAuth();
  try { return await request('/availability/provider/me'); }
  catch (error) {
    if (error.status === 404 && providerId) {
      try { return await request(`/availability/provider/${providerId}`); }
      catch (fallbackError) { if (fallbackError.status === 404) return null; throw fallbackError; }
    }
    throw error;
  }
};

export const getProviderAvailability = (providerId) => request(`/availability/provider/${providerId}`);
export const createAvailabilitySlot = (payload) => request('/availability/provider/me', { method: 'POST', body: JSON.stringify(payload) });
export const updateAvailabilitySlot = (availabilityId, payload) => request(`/availability/${availabilityId}`, { method: 'PUT', body: JSON.stringify(payload) });
export const deleteAvailabilitySlot = (availabilityId) => request(`/availability/${availabilityId}`, { method: 'DELETE' });
export const getProviderAvailabilityStatus = async () => {
  const availability = await getMyAvailability();
  return availability?.isActive !== false;
};
export const updateProviderAvailabilityStatus = (isAvailable) => request('/availability/provider/me/status', { method: 'PATCH', body: JSON.stringify({ isAvailable }) });
