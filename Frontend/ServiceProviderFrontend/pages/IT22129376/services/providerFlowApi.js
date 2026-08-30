// pages/IT22129376/services/providerFlowApi.js
import { IP_ADDRESS, CONFIG } from '../../../config';
import { buildAuthHeaders } from './providerAuthStorage';

const trimSlash = (url) => String(url || '').replace(/\/+$/, '');
const uniqueUrls = (urls) => [...new Set(urls.filter(Boolean).map(trimSlash))];

const SEEKER_URLS = uniqueUrls([
  CONFIG?.SEEKER_SERVICE_URL,
  CONFIG?.API_BASE_URL,
  `http://${IP_ADDRESS}:6000`,
]);

const PROVIDER_URLS = uniqueUrls([
  CONFIG?.PROVIDER_SERVICE_URL,
  `http://${IP_ADDRESS}:3002`,
]);

const COORDINATION_URLS = uniqueUrls([
  CONFIG?.COORDINATION_SERVICE_URL,
  `http://${IP_ADDRESS}:5010`,
]);

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
    const err = new Error(
      data?.message || data?.error || `Request failed with status ${response.status}`
    );
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};

const requestJson = async (url, options = {}) => {
  const headers = await buildAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
  });

  return parseResponse(response);
};

const requestJsonNoAuth = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
  });

  return parseResponse(response);
};

const firstSuccess = async (candidates) => {
  let lastError = null;

  for (const candidate of candidates) {
    const { url, options = {}, auth = true } = candidate;

    try {
      console.log('Trying Provider Flow API:', url);

      const data = auth
        ? await requestJson(url, options)
        : await requestJsonNoAuth(url, options);

      console.log('Provider Flow API success:', url);

      return {
        data,
        usedUrl: url,
      };
    } catch (error) {
      lastError = error;
      console.log('Provider Flow API failed:', url, error?.message);
    }
  }

  throw lastError || new Error('No backend route responded successfully.');
};

const normalizeList = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.items)) return data.items;

  return [];
};

export const getProviderRequests = async (providerId) => {
  if (!providerId) {
    throw new Error('Provider ID is required');
  }

  const candidates = [
    ...SEEKER_URLS.map((base) => ({
      url: `${base}/request-quotations/provider/${providerId}`,
      auth: false,
    })),

    // Coordination Service provider request route is protected and uses token user.
    ...COORDINATION_URLS.map((base) => ({
      url: `${base}/requests/provider/me`,
      auth: true,
    })),
  ];

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    requests: normalizeList(data, [
      'requests',
      'requestQuotations',
      'providerRequests',
      'data',
    ]),
  };
};

export const getProviderQuotations = async () => {
  // Provider Service route is /api/provider/quotations/provider/me.
  // It is protected and uses the logged-in ServiceProvider from the token.
  const candidates = PROVIDER_URLS.map((base) => ({
    url: `${base}/api/provider/quotations/provider/me`,
    auth: true,
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    quotations: normalizeList(data, [
      'quotations',
      'providerQuotations',
      'data',
    ]),
  };
};

export const getProviderJobs = async () => {
  // Coordination Service routes are protected /me routes.
  const candidates = [
    ...COORDINATION_URLS.map((base) => ({
      url: `${base}/calendar/provider/me`,
      auth: true,
    })),
    ...COORDINATION_URLS.map((base) => ({
      url: `${base}/bookings/provider/me`,
      auth: true,
    })),
  ];

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    jobs: normalizeList(data, [
      'bookings',
      'calendar',
      'jobs',
      'providerBookings',
      'data',
    ]),
  };
};

export const getProviderMissedInquiries = async () => {
  const candidates = COORDINATION_URLS.map((base) => ({
    url: `${base}/bookings/provider/me/missed-inquiries`,
    auth: true,
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    missedInquiries: normalizeList(data, [
      'missedInquiries',
      'inquiries',
      'data',
    ]),
  };
};

export const createProviderQuotation = async (payload) => {
  const candidates = PROVIDER_URLS.map((base) => ({
    url: `${base}/api/provider/quotations`,
    auth: true,
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    quotation: data?.data || data?.quotation || data,
  };
};

export const getQuotationById = async (quotationId) => {
  if (!quotationId) {
    throw new Error('Quotation ID is required');
  }

  const candidates = PROVIDER_URLS.map((base) => ({
    url: `${base}/api/provider/quotations/${quotationId}`,
    auth: true,
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    quotation: data?.data || data?.quotation || data,
  };
};

export const getBookingById = async (bookingId) => {
  if (!bookingId) {
    throw new Error('Booking ID is required');
  }

  const candidates = COORDINATION_URLS.map((base) => ({
    url: `${base}/bookings/${bookingId}`,
    auth: true,
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
    booking: data?.data || data?.booking || data,
  };
};

export const startProviderJob = async (bookingId) => {
  if (!bookingId) {
    throw new Error('Booking ID is required');
  }

  const candidates = COORDINATION_URLS.map((base) => ({
    url: `${base}/bookings/${bookingId}/start`,
    auth: true,
    options: {
      method: 'PUT',
    },
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
  };
};

export const completeProviderJob = async (bookingId) => {
  if (!bookingId) {
    throw new Error('Booking ID is required');
  }

  const candidates = COORDINATION_URLS.map((base) => ({
    url: `${base}/bookings/${bookingId}/complete`,
    auth: true,
    options: {
      method: 'PUT',
    },
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
  };
};

export const reportProviderDelay = async (bookingId, delayReason = '') => {
  if (!bookingId) {
    throw new Error('Booking ID is required');
  }

  const candidates = COORDINATION_URLS.map((base) => ({
    url: `${base}/bookings/${bookingId}/report-delay`,
    auth: true,
    options: {
      method: 'PUT',
      body: JSON.stringify({
        delayReason,
        reason: delayReason,
      }),
    },
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
  };
};

export const cancelProviderBooking = async (bookingId, reason = '') => {
  if (!bookingId) {
    throw new Error('Booking ID is required');
  }

  const candidates = COORDINATION_URLS.map((base) => ({
    url: `${base}/bookings/${bookingId}/cancel`,
    auth: true,
    options: {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    },
  }));

  const { data, usedUrl } = await firstSuccess(candidates);

  return {
    raw: data,
    usedUrl,
  };
};

export const buildQuotationPayload = ({
  request,
  providerId,
  price,
  proposedStartTime,
  estimatedDurationHours,
  notes,
}) => {
  const durationNumber = Number(estimatedDurationHours || 0);

  return {
    externalRequestQuotationId:
      request?._id ||
      request?.id ||
      request?.requestQuotationId ||
      request?.externalRequestQuotationId,

    externalSessionId:
      request?.sessionId ||
      request?.externalSessionId ||
      request?.serviceSessionId,

    seekerId:
      request?.seekerId ||
      request?.customerId ||
      request?.userId,

    providerId,

    serviceCategory:
      request?.category ||
      request?.serviceCategory ||
      request?.detectedCategory ||
      'General',

    serviceSubcategory:
      request?.subcategory ||
      request?.serviceSubcategory ||
      request?.object ||
      request?.detectedObject ||
      'Service',

    price: Number(price || 0),

    proposedStartTime,

    estimatedDurationHours: durationNumber,

    durationText: `${durationNumber} Hours`,

    notes: notes || '',

    status: 'SENT',
  };
};

export default {
  getProviderRequests,
  getProviderQuotations,
  getProviderJobs,
  getProviderMissedInquiries,
  createProviderQuotation,
  getQuotationById,
  getBookingById,
  startProviderJob,
  completeProviderJob,
  reportProviderDelay,
  cancelProviderBooking,
  buildQuotationPayload,
};
