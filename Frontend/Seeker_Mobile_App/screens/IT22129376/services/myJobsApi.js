import {
  IP_ADDRESS,
  API_BASE_URL,
  PROVIDER_API_BASE,
} from '../../../config';
import { buildAuthHeaders } from './seekerAuthStorage';

const SEEKER_SERVICE_URL = API_BASE_URL || `http://${IP_ADDRESS}:6000`;
const PROVIDER_SERVICE_BASE = PROVIDER_API_BASE || `http://${IP_ADDRESS}:5000`;
const SERVICE_COORDINATION_SERVICE_URL = `http://${IP_ADDRESS}:5010`;

const parseResponse = async (response) => {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = {
      success: false,
      message: text || 'Invalid server response',
    };
  }

  if (!response.ok) {
    const message =
      data?.message ||
      data?.error ||
      `Request failed with status ${response.status}`;

    throw new Error(message);
  }

  return data;
};

const normalizeList = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;

  return [];
};

export const getSeekerRequestQuotations = async (seekerId) => {
  if (!seekerId) {
    throw new Error('Seeker ID is required');
  }

  const headers = await buildAuthHeaders();

  const possibleUrls = [
    `${SEEKER_SERVICE_URL}/request-quotations/seeker/${seekerId}`,
    `${SEEKER_SERVICE_URL}/api/request-quotations/seeker/${seekerId}`,
    `${SEEKER_SERVICE_URL}/requests/seeker/${seekerId}`,
    `${SEEKER_SERVICE_URL}/api/requests/seeker/${seekerId}`,
  ];

  let lastError = null;

  for (const url of possibleUrls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await parseResponse(response);

      return {
        raw: data,
        requests: normalizeList(data, [
          'requestQuotations',
          'requests',
          'quotations',
        ]),
        usedUrl: url,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load seeker request quotations');
};

export const getProviderQuotationsForSeeker = async (seekerId) => {
  if (!seekerId) {
    throw new Error('Seeker ID is required');
  }

  const headers = await buildAuthHeaders();

  const possibleUrls = [
    `${PROVIDER_SERVICE_BASE}/api/provider/quotations/seeker/${seekerId}`,
    `${PROVIDER_SERVICE_BASE}/api/provider/quotations/by-seeker/${seekerId}`,
    `${PROVIDER_SERVICE_BASE}/api/provider/quotations?seekerId=${seekerId}`,
  ];

  let lastError = null;

  for (const url of possibleUrls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await parseResponse(response);

      return {
        raw: data,
        quotations: normalizeList(data, ['quotations', 'providerQuotations']),
        usedUrl: url,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load provider quotations');
};

export const getSeekerBookings = async (seekerId) => {
  if (!seekerId) {
    throw new Error('Seeker ID is required');
  }

  const headers = await buildAuthHeaders();

  const possibleUrls = [
    `${SERVICE_COORDINATION_SERVICE_URL}/bookings/seeker/${seekerId}`,
    `${SERVICE_COORDINATION_SERVICE_URL}/calendar/seeker/${seekerId}`,
  ];

  let lastError = null;

  for (const url of possibleUrls) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await parseResponse(response);

      return {
        raw: data,
        bookings: normalizeList(data, ['bookings', 'calendar', 'jobs']),
        usedUrl: url,
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error('Unable to load seeker bookings');
};

export const checkBidCoordination = async ({
  externalRequestQuotationId,
  externalQuotationId,
}) => {
  const headers = await buildAuthHeaders();

  const response = await fetch(
    `${SERVICE_COORDINATION_SERVICE_URL}/bid-coordinations/check`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        externalRequestQuotationId,
        externalQuotationId,
      }),
    }
  );

  return parseResponse(response);
};

export const selectSuggestedSlot = async (coordinationId, slotId) => {
  const headers = await buildAuthHeaders();

  const response = await fetch(
    `${SERVICE_COORDINATION_SERVICE_URL}/bid-coordinations/${coordinationId}/suggested-slots/${slotId}/select`,
    {
      method: 'PATCH',
      headers,
    }
  );

  return parseResponse(response);
};

export const createBookingFromCoordination = async (coordinationId) => {
  const headers = await buildAuthHeaders();

  const response = await fetch(
    `${SERVICE_COORDINATION_SERVICE_URL}/bookings/coordination/${coordinationId}`,
    {
      method: 'POST',
      headers,
    }
  );

  return parseResponse(response);
};

export default {
  getSeekerRequestQuotations,
  getProviderQuotationsForSeeker,
  getSeekerBookings,
  checkBidCoordination,
  selectSuggestedSlot,
  createBookingFromCoordination,
};