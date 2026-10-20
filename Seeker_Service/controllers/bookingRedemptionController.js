import BookingRewardRedemption from '../models/BookingRewardRedemption.js';
import { redeemBookingPoints } from '../services/bookingRedemptionService.js';

export function requireRewardService(req, res, next) {
  if (!process.env.REWARD_SERVICE_KEY || req.get('x-reward-service-key') !== process.env.REWARD_SERVICE_KEY) return res.status(401).json({ error: 'Unauthorized service request' });
  next();
}
export async function createBookingRedemption(req, res) {
  try { res.status(200).json({ receipt: await redeemBookingPoints(req.body) }); }
  catch (error) {
    const invalid = /Invalid|Only completed|whole points|Insufficient|does not match/.test(error.message);
    res.status(invalid ? 400 : 503).json({ error: invalid ? error.message : 'Unable to redeem points. Retry safely; points will not be deducted twice.' });
  }
}
export async function getBookingRedemption(req, res) {
  try {
    const receipt = await BookingRewardRedemption.findOne({ bookingId: req.params.bookingId });
    res.json({ receipt });
  } catch { res.status(503).json({ error: 'Unable to check redemption. Please retry.' }); }
}
