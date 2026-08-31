import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CONFIG,
  IP_ADDRESS,
} from '../config';

const uniqueUrls = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item)) return false;
    seen.add(item);
    return true;
  });
};

const SEEKER_URLS = uniqueUrls([
  CONFIG?.SEEKER_SERVICE_URL,
  CONFIG?.API_BASE_URL,
  `http://${IP_ADDRESS}:6000`,
]);

const PROVIDER_URLS = uniqueUrls([
  CONFIG?.PROVIDER_SERVICE_API_URL,
  CONFIG?.PROVIDER_SERVICE_URL,
  `http://${IP_ADDRESS}:3002`,
]);

const COORDINATION_URLS = uniqueUrls([
  CONFIG?.COORDINATION_SERVICE_URL,
  `http://${IP_ADDRESS}:5010`,
]);

export const normalizeArrayResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.requests)) return payload.requests;
  if (Array.isArray(payload?.quotations)) return payload.quotations;
  if (Array.isArray(payload?.bookings)) return payload.bookings;
  if (Array.isArray(payload?.result)) return payload.result;
  return [];
};

const getToken = async () => {
  const token =
    (await AsyncStorage.getItem('userToken')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('authToken'));

  return typeof token === 'string' ? token.replace(/^Bearer\s+/i, '').trim() : '';
};

export const buildAuthHeaders = async () => {
  const token = await getToken();
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const readJson = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    return {};
  }
};

const requestFirstSuccess = async ({ urls, paths, options = {}, label }) => {
  let lastError = null;
  const headers = await buildAuthHeaders();

  for (const baseUrl of urls) {
    for (const path of paths) {
      const url = `${baseUrl}${path}`;
      try {
        console.log(`Trying Provider Flow API: ${url}`);
        const response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            ...(options.headers || {}),
          },
        });
        const data = await readJson(response);
        if (response.ok) {
          console.log(`Provider Flow API success: ${url}`);
          return data;
        }
        const message = data?.message || data?.error || `HTTP ${response.status}`;
        console.log(`Provider Flow API failed: ${url} ${message}`);
        lastError = new Error(message);
      } catch (error) {
        console.log(`Provider Flow API failed: ${url} ${error?.message}`);
        lastError = error;
      }
    }
  }

  throw lastError || new Error(`${label || 'Provider Flow API'} failed`);
};

export const idsEqual = (a, b) => {
  if (!a || !b) return false;
  return String(a?._id || a).trim() === String(b?._id || b).trim();
};

export const getProviderRequests = async (providerId) => {
  const paths = [
    `/request-quotations/provider-filtered/${providerId}`,
    `/request-quotations/provider/${providerId}`,
  ];
  const payload = await requestFirstSuccess({ urls: SEEKER_URLS, paths, label: 'provider requests' });
  return normalizeArrayResponse(payload);
};

export const getProviderQuotations = async () => {
  const payload = await requestFirstSuccess({
    urls: PROVIDER_URLS,
    paths: ['/api/provider/quotations/provider/me'],
    label: 'provider quotations',
  });
  return normalizeArrayResponse(payload);
};

export const getProviderBookings = async (providerId) => {
  const payload = await requestFirstSuccess({
    urls: COORDINATION_URLS,
    paths: [
      '/bookings/provider/me',
      `/bookings/provider/${providerId}`,
      '/calendar/provider/me',
      `/calendar/provider/${providerId}`,
    ],
    label: 'provider bookings',
  });
  return normalizeArrayResponse(payload);
};

export const getProviderBookingById = async (bookingId) => {
  if (!bookingId) throw new Error('Booking ID is required.');
  const payload = await requestFirstSuccess({
    urls: COORDINATION_URLS,
    paths: [`/bookings/${bookingId}`],
    label: 'provider booking details',
  });
  return payload?.data || payload?.booking || payload;
};

export const getProviderOngoingBookings = async (providerId) => {
  try {
    const payload = await requestFirstSuccess({
      urls: COORDINATION_URLS,
      paths: [
        '/bookings/provider/me/ongoing',
        `/bookings/provider/${providerId}/ongoing`,
      ],
      label: 'provider ongoing bookings',
    });
    return normalizeArrayResponse(payload);
  } catch (error) {
    const all = await getProviderBookings(providerId);
    return all.filter(isOngoingBooking);
  }
};

export const updateBookingLifecycle = async (bookingId, action, body = {}) => {
  const payload = await requestFirstSuccess({
    urls: COORDINATION_URLS,
    paths: [`/bookings/${bookingId}/${action}`],
    options: {
      method: 'PUT',
      body: JSON.stringify(body),
    },
    label: `booking ${action}`,
  });
  return payload?.data || payload?.booking || payload;
};

export const submitProviderQuotation = async (payload) => {
  const responsePayload = await requestFirstSuccess({
    urls: PROVIDER_URLS,
    paths: ['/api/provider/quotations'],
    options: {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    label: 'submit quotation',
  });
  return responsePayload?.data || responsePayload;
};

export const getBookingId = (booking) => String(booking?._id || booking?.id || booking?.bookingId || '');

export const getBookingStatus = (booking) => String(booking?.bookingStatus || 'CONFIRMED').toUpperCase();

export const isOngoingBooking = (booking) => {
  const status = getBookingStatus(booking);
  if (status === 'IN_PROGRESS' || status === 'DELAY_REPORTED') return true;
  if (status !== 'CONFIRMED') return false;

  const start = getBookingStartDate(booking);
  if (!start) return false;

  const now = new Date();
  const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const today = now.toISOString().slice(0, 10);
  const startDay = start.toISOString().slice(0, 10);

  return startDay === today || (start >= now && start <= next24Hours);
};

export const getBookingStartDate = (booking) => {
  const raw = booking?.scheduledStartTime || booking?.startDateTime || booking?.dateTime;
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const datePart = booking?.scheduledDate || booking?.requestedDate || booking?.date;
  const timePart = booking?.startTime || booking?.requestedStartTime || booking?.displayStartTime;
  if (datePart && timePart) {
    const date = new Date(`${datePart}T${timePart}`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  return null;
};

export const getBookingEndDate = (booking) => {
  const raw = booking?.scheduledEndTime || booking?.endDateTime;
  if (raw) {
    const date = new Date(raw);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const datePart = booking?.scheduledDate || booking?.requestedDate || booking?.date;
  const timePart = booking?.endTime || booking?.displayEndTime;
  if (datePart && timePart) {
    const date = new Date(`${datePart}T${timePart}`);
    if (!Number.isNaN(date.getTime())) return date;
  }

  const start = getBookingStartDate(booking);
  const duration = Number(booking?.estimatedDurationHours || 0);
  if (start && duration > 0) {
    return new Date(start.getTime() + duration * 60 * 60 * 1000);
  }

  return null;
};

export const getBookingDateKey = (booking) => {
  if (booking?.scheduledDate) return String(booking.scheduledDate).slice(0, 10);
  const start = getBookingStartDate(booking);
  return start ? start.toISOString().slice(0, 10) : '';
};

export const isObjectId = (value) => typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);

const firstClean = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text && !isObjectId(text) && text !== '[object Object]') return text;
  }
  return '';
};

export const getHumanProviderName = (item) =>
  firstClean(
    item?.providerSnapshot?.businessName,
    item?.providerSnapshot?.name,
    item?.provider?.businessName,
    item?.provider?.name,
    item?.provider?.fullName,
    item?.providerName,
    item?.businessName
  ) || 'Service Provider';

export const getHumanSeekerName = (item) =>
  firstClean(
    item?.seekerSnapshot?.name,
    item?.seekerSnapshot?.fullName,
    item?.seeker?.name,
    item?.seeker?.fullName,
    item?.customerName,
    item?.seekerName
  ) || 'Customer';

export const getHumanServiceTitle = (item) =>
  firstClean(
    item?.serviceSubcategory,
    item?.detectedObject,
    item?.specificLabel,
    item?.serviceLabel,
    item?.subcategory,
    item?.serviceCategory,
    item?.detectedCategory,
    item?.category,
    item?.title
  ) || 'Service Request';

export const getHumanLocation = (item) =>
  firstClean(
    item?.serviceLocation,
    item?.location?.address,
    item?.location,
    item?.district
  ) || 'Location not provided';

export const statusLabel = (status) => {
  const value = String(status || '').toUpperCase();
  const map = {
    CONFIRMED: 'Scheduled',
    IN_PROGRESS: 'In Progress',
    DELAY_REPORTED: 'Delay Reported',
    RESCHEDULING_REQUIRED: 'Rescheduling Required',
    RESCHEDULED: 'Rescheduled',
    COMPLETED: 'Completed',
    CANCELLED: 'Cancelled',
    SENT: 'Waiting for Seeker',
    ACCEPTED: 'Booking Confirmed',
    REJECTED: 'Not Selected',
    EXPIRED: 'Expired',
    PENDING: 'Pending Request',
    QUOTED: 'Quoted',
  };
  return map[value] || value || 'Pending';
};
