import { getStoredSeekerAuth } from '../screens/IT22129376/services/seekerAuthStorage';
import {IP_ADDRESS} from '../config';
const COORDINATION_SERVICE_URL = `http://${IP_ADDRESS}:5010`;

const readJson = async (response) => {
  try { return await response.json(); } catch (error) { return {}; }
};

export const getSeekerLiveSummary = async () => {
  const { token, seekerId } = await getStoredSeekerAuth();
  if (!seekerId) throw new Error('Seeker authentication required.');

  const paths = ['/bookings/seeker/me/live-summary', `/bookings/seeker/${seekerId}/live-summary`];
  let lastError;
  for (const path of paths) {
    try {
      const response = await fetch(`${COORDINATION_SERVICE_URL}${path}`, {
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      const payload = await readJson(response);
      if (response.ok) return payload?.data || payload;
      lastError = new Error(payload?.message || `HTTP ${response.status}`);
    } catch (error) { lastError = error; }
  }
  throw lastError || new Error('Unable to load booking status.');
};

const cleanText = (...values) => {
  for (const value of values) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (text && !/^[a-f\d]{24}$/i.test(text)) return text;
  }
  return '';
};

export const getHumanProviderName = (item) => cleanText(
  item?.providerSnapshot?.businessName, item?.providerSnapshot?.name,
  item?.provider?.businessName, item?.provider?.name, item?.provider?.fullName,
  item?.providerName
) || 'Service Provider';

export const getHumanServiceTitle = (item) => cleanText(
  item?.serviceSubcategory, item?.detectedObject, item?.specificLabel,
  item?.serviceLabel, item?.subcategory, item?.serviceCategory,
  item?.detectedCategory, item?.category
) || 'Service Request';

export const getHumanLocation = (item) => cleanText(
  item?.serviceLocation, item?.location?.address,
  typeof item?.location === 'string' ? item.location : '', item?.district
) || 'Location not provided';

export const getBookingStartDate = (item) => {
  const direct = item?.scheduledStartTime;
  if (direct) {
    const date = new Date(direct);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (item?.scheduledDate && (item?.startTime || item?.displayStartTime)) {
    const date = new Date(`${item.scheduledDate}T${item.startTime || item.displayStartTime}`);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

export const getBookingEndDate = (item) => {
  const value = item?.delayInfo?.expectedEndTime || item?.scheduledEndTime;
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
};

export const getTimeRemainingLabel = (value) => {
  if (!value) return '';
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return '';
  const diffMins = Math.round((target.getTime() - Date.now()) / 60000);
  if (diffMins <= 0) return 'Starting now';
  if (diffMins < 60) return `Starts in ${diffMins} min`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  if (hours < 24) return mins ? `Starts in ${hours}h ${mins}m` : `Starts in ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Starts in ${days} day${days > 1 ? 's' : ''}`;
};
