import axios from 'axios';

function connection() {
  if (!process.env.REWARD_SERVICE_KEY) throw Object.assign(new Error('Star Points service is not configured.'), { status: 503 });
  const base = (process.env.SEEKER_SERVICE_URL || process.env.SEEKER_SERVICE_BASE_URL || 'http://127.0.0.1:6000').replace(/\/$/, '');
  return { base, options: { headers: { 'x-reward-service-key': process.env.REWARD_SERVICE_KEY }, timeout: 15000 } };
}
export async function readBookingRedemption(bookingId) {
  const { base, options } = connection();
  return (await axios.get(`${base}/api/rewards/internal/bookings/${bookingId}/redemption`, options)).data.receipt;
}
export async function spendBookingPoints(booking, points) {
  const { base, options } = connection();
  return (await axios.post(`${base}/api/rewards/internal/bookings/redeem`, {
    bookingId: String(booking._id), seekerId: String(booking.seekerId), providerId: String(booking.providerId),
    finalAmount: booking.finalAmount, currency: booking.currency, bookingStatus: booking.bookingStatus, points,
  }, options)).data.receipt;
}
