import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS, API_BASE_URL, PROVIDER_API_BASE } from '../../../config';

const SEEKER_SERVICE_URL = API_BASE_URL || `http://${IP_ADDRESS}:6000`;
const PROVIDER_SERVICE_BASE = PROVIDER_API_BASE || `http://${IP_ADDRESS}:5000`;
const SERVICE_COORDINATION_SERVICE_URL = `http://${IP_ADDRESS}:5010`;

const authHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseJson = async (response) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.message || `Request failed: ${response.status}`);
  }
  return data;
};

export const getSeekerRequestQuotations = async (seekerId) => {
  const response = await fetch(`${SEEKER_SERVICE_URL}/request-quotations/seeker/${seekerId}`, {
    headers: await authHeaders(),
  });
  return parseJson(response);
};

export const getProviderQuotations = async (seekerId) => {
  const response = await fetch(`${PROVIDER_SERVICE_BASE}/quotations/seeker/${seekerId}`, {
    headers: await authHeaders(),
  });
  return parseJson(response);
};

export const checkBidCoordination = async ({ externalRequestQuotationId, externalQuotationId }) => {
  const response = await fetch(`${SERVICE_COORDINATION_SERVICE_URL}/bid-coordinations/check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
    body: JSON.stringify({ externalRequestQuotationId, externalQuotationId }),
  });
  return parseJson(response);
};

export const selectSuggestedSlot = async ({ coordinationId, slotId }) => {
  const response = await fetch(
    `${SERVICE_COORDINATION_SERVICE_URL}/bid-coordinations/${coordinationId}/suggested-slots/${slotId}/select`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
      },
    }
  );
  return parseJson(response);
};

export const createBookingFromCoordination = async (coordinationId) => {
  const response = await fetch(`${SERVICE_COORDINATION_SERVICE_URL}/bookings/coordination/${coordinationId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
    },
  });
  return parseJson(response);
};

export const getSeekerBookings = async (seekerId) => {
  const response = await fetch(`${SERVICE_COORDINATION_SERVICE_URL}/bookings/seeker/${seekerId}`, {
    headers: await authHeaders(),
  });
  return parseJson(response);
};
