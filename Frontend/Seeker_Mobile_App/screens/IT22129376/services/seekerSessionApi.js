import { CONFIG, AUTH_SERVICE_URL } from '../../../config';
import { fetchSeekerWithTimeout } from '../../../utils/seekerHttp';
import { buildAuthHeaders } from './seekerAuthStorage';

async function read(url, keys) {
  const response = await fetchSeekerWithTimeout(url, { headers: await buildAuthHeaders() });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw Object.assign(new Error(data?.message || 'Unable to load your latest service information.'), { status: response.status });
  const rows = Array.isArray(data) ? data : keys.map(key => data?.[key]).find(Array.isArray);
  if (!rows) throw new Error('The service returned incomplete information. Refresh to try again.');
  return { raw: data, rows };
}
export async function getSeekerRequestQuotations(seekerId) {
  const result = await read(`${CONFIG.SEEKER_SERVICE_URL}/request-quotations/seeker/${seekerId}`, ['requests', 'requestQuotations', 'data']);
  return { raw: result.raw, requests: result.rows };
}
export async function getProviderQuotationsForSeeker() {
  const result = await read(`${CONFIG.PROVIDER_SERVICE_API_URL}/api/provider/quotations/seeker/me`, ['quotations', 'providerQuotations', 'data']);
  return { raw: result.raw, quotations: result.rows };
}
export async function getSeekerBookings(seekerId) {
  let result;
  try { result = await read(`${CONFIG.COORDINATION_SERVICE_URL}/bookings/seeker/me`, ['bookings', 'data']); }
  catch (error) {
    if (error.status !== 404) throw error;
    result = await read(`${CONFIG.COORDINATION_SERVICE_URL}/bookings/seeker/${seekerId}`, ['bookings', 'data']);
  }
  return { raw: result.raw, bookings: result.rows };
}

let providerDirectoryCache = null;
let providerDirectoryLoadedAt = 0;
let providerDirectoryRequest = null;
export async function getSeekerProviderDirectory() {
  if (providerDirectoryCache && Date.now() - providerDirectoryLoadedAt < 60000) return providerDirectoryCache;
  if (providerDirectoryRequest) return providerDirectoryRequest;
  providerDirectoryRequest = read(`${AUTH_SERVICE_URL}/providers`, ['providers', 'data']).then(result => {
    providerDirectoryCache = result.rows.map(row => ({ _id: row._id || row.id, fullName: row.fullName, name: row.name, businessName: row.businessName, district: row.district, profileImage: row.profileImage }));
    providerDirectoryLoadedAt = Date.now();
    return providerDirectoryCache;
  }).finally(() => { providerDirectoryRequest = null; });
  return providerDirectoryRequest;
}

export async function getBookingTimeProposals(bookingId) {
  const result = await read(`${CONFIG.COORDINATION_SERVICE_URL}/reschedules/booking/${bookingId}`, ['data']);
  return result.rows;
}
export async function actOnBookingTimeProposal(rescheduleId, action, body = {}) {
  const response = await fetchSeekerWithTimeout(`${CONFIG.COORDINATION_SERVICE_URL}/reschedules/${rescheduleId}/${action}`, {
    method: action === 'check' ? 'POST' : 'PUT', headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.message || 'Unable to update the time request.'), { data });
  return data.data;
}
export async function cancelSeekerBooking(bookingId) {
  const response = await fetchSeekerWithTimeout(`${CONFIG.COORDINATION_SERVICE_URL}/bookings/${bookingId}/cancel`, {
    method: 'PUT', headers: { ...(await buildAuthHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason: 'Customer cancelled after reviewing an alternative service time.' }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Unable to cancel the booking.');
  return data.data;
}
