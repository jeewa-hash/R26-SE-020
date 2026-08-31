import {
  IP_ADDRESS,
  API_BASE_URL,
} from '../../../config';

import { buildAuthHeaders } from './seekerAuthStorage';

const SEEKER_SERVICE_URL = API_BASE_URL || `http://${IP_ADDRESS}:6000`;

// Real Provider Service backend port
const PROVIDER_SERVICE_BASE = `http://${IP_ADDRESS}:3002`;

// Real Coordination Service backend port
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

    const err = new Error(message);
    err.status = response.status;
    err.data = data;
    throw err;
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
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.requestQuotations)) return data.requestQuotations;
  if (Array.isArray(data?.quotations)) return data.quotations;
  if (Array.isArray(data?.providerQuotations)) return data.providerQuotations;
  if (Array.isArray(data?.bookings)) return data.bookings;
  if (Array.isArray(data?.calendar)) return data.calendar;
  if (Array.isArray(data?.jobs)) return data.jobs;

  return [];
};

export const getSeekerRequestQuotations = async (seekerId) => {
  if (!seekerId) {
    throw new Error('Seeker ID is required');
  }

  const headers = await buildAuthHeaders();

  const url = `${SEEKER_SERVICE_URL}/request-quotations/seeker/${seekerId}`;

  try {
    console.log('Trying seeker requests URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await parseResponse(response);

    console.log('Seeker requests loaded from:', url);

    return {
      raw: data,
      requests: normalizeList(data, [
        'requestQuotations',
        'requests',
        'data',
      ]),
      usedUrl: url,
    };
  } catch (error) {
    console.log('Seeker requests URL failed:', url, error.message);

    return {
      raw: null,
      requests: [],
      usedUrl: null,
    };
  }
};

export const getProviderQuotationsForSeeker = async () => {
  const headers = await buildAuthHeaders();

  // Actual backend route:
  // router.get("/seeker/me", protect(["Seeker"]), getSeekerQuotations)
  const url = `${PROVIDER_SERVICE_BASE}/api/provider/quotations/seeker/me`;

  try {
    console.log('Trying seeker quotations URL:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await parseResponse(response);

    console.log('Seeker quotations loaded from:', url);

    return {
      raw: data,
      quotations: normalizeList(data, [
        'quotations',
        'providerQuotations',
        'data',
      ]),
      usedUrl: url,
    };
  } catch (error) {
    console.log('Seeker quotations URL failed:', url, error.message);

    return {
      raw: null,
      quotations: [],
      usedUrl: null,
    };
  }
};

export const getSeekerBookings = async (seekerId) => {
  if (!seekerId) {
    throw new Error('Seeker ID is required');
  }

  const headers = await buildAuthHeaders();

  const possibleUrls = [
    `${SERVICE_COORDINATION_SERVICE_URL}/bookings/seeker/me`,
    `${SERVICE_COORDINATION_SERVICE_URL}/calendar/seeker/me`,
    `${SERVICE_COORDINATION_SERVICE_URL}/bookings/seeker/${seekerId}`,
    `${SERVICE_COORDINATION_SERVICE_URL}/calendar/seeker/${seekerId}`,
  ];

  for (const url of possibleUrls) {
    try {
      console.log('Trying seeker bookings URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await parseResponse(response);

      console.log('Seeker bookings loaded from:', url);

      return {
        raw: data,
        bookings: normalizeList(data, [
          'bookings',
          'calendar',
          'jobs',
          'data',
        ]),
        usedUrl: url,
      };
    } catch (error) {
      console.log('Seeker bookings URL failed:', url, error.message);
    }
  }

  return {
    raw: null,
    bookings: [],
    usedUrl: null,
  };
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