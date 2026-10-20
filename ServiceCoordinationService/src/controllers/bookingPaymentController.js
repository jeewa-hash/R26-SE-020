import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import { readBookingRedemption, spendBookingPoints } from '../clients/bookingRewardClient.js';
import { publishLifecycleNotification } from '../utils/lifecycleNotifications.js';

async function ownedBooking(req, role) {
  if (!mongoose.isValidObjectId(req.params.bookingId)) throw Object.assign(new Error('Invalid service ID.'), { status: 400 });
  const booking = await Booking.findById(req.params.bookingId);
  if (!booking) throw Object.assign(new Error('Service not found.'), { status: 404 });
  const field = req.user.role === 'Seeker' ? 'seekerId' : req.user.role === 'ServiceProvider' ? 'providerId' : null;
  if (!field || (role && req.user.role !== role) || String(booking[field]) !== String(req.user.id)) throw Object.assign(new Error('Access denied.'), { status: 403 });
  if (booking.bookingStatus !== 'COMPLETED') throw Object.assign(new Error('Payment is available after the service is completed.'), { status: 409 });
  return booking;
}
function fail(res, error) {
  const upstreamStatus = error.response?.status;
  const status = error.status || (upstreamStatus === 400 ? 400 : 503);
  return res.status(status).json({ success: false, message: error.status ? error.message : upstreamStatus === 400 ? error.response.data?.error : 'Unable to confirm payment details. Please retry; Star Points will not be deducted twice.' });
}
export function paymentFromReceipt(booking, receipt) {
  if (booking.currency !== 'LKR' || !Number.isFinite(booking.finalAmount) || booking.finalAmount < 0 || !receipt || String(receipt.bookingId) !== String(booking._id) || String(receipt.seekerId) !== String(booking.seekerId) || String(receipt.providerId) !== String(booking.providerId) || receipt.agreedAmount !== booking.finalAmount || receipt.currency !== 'LKR' ||
      !mongoose.isValidObjectId(receipt._id) || !Number.isSafeInteger(receipt.pointsRedeemed) || receipt.pointsRedeemed < 0 || receipt.pointsRedeemed > Math.floor(booking.finalAmount) || receipt.platformAmountOwed !== receipt.pointsRedeemed || receipt.customerAmountDue !== Math.round((booking.finalAmount - receipt.pointsRedeemed) * 100) / 100) {
    throw Object.assign(new Error('Unable to verify the payment allocation.'), { status: 503 });
  }
  return { redemptionId: receipt._id, agreedAmount: receipt.agreedAmount, pointsRedeemed: receipt.pointsRedeemed,
    customerAmountDue: receipt.customerAmountDue, platformAmountOwed: receipt.platformAmountOwed, currency: 'LKR',
    customerPaymentStatus: 'AWAITING_PAYMENT', platformSettlementStatus: receipt.platformAmountOwed > 0 ? 'PENDING' : 'NOT_REQUIRED', preparedAt: receipt.createdAt };
}
async function paymentNotification(booking, phase) {
  await Promise.all([['Seeker', booking.seekerId], ['ServiceProvider', booking.providerId]].map(([role, id]) => publishLifecycleNotification({
    recipientId: String(id), role, eventId: `service-payment:${booking._id}:${phase}:${id}`, type: 'booking',
    title: phase === 'PREPARED' ? 'Service payment ready' : 'Customer payment confirmed',
    message: phase === 'PREPARED' ? `Customer pays LKR ${booking.payment.customerAmountDue}. Star Points cover LKR ${booking.payment.platformAmountOwed}. Open the service for payment details.` : `The provider confirmed the customer payment.${booking.payment.platformAmountOwed > 0 ? ' The Star Points portion is still owed by the platform.' : ''}`,
    metadata: { bookingId: String(booking._id), status: 'COMPLETED' },
  })));
}
async function persistReceipt(booking, receipt) {
  const payment = paymentFromReceipt(booking, receipt);
  const updated = await Booking.findOneAndUpdate({ _id: booking._id, bookingStatus: 'COMPLETED', payment: null }, {
    $set: { payment }, $push: { timeline: { status: 'PAYMENT_PREPARED', message: `Payment prepared: ${payment.pointsRedeemed} Star Points; customer pays LKR ${payment.customerAmountDue}`, at: new Date() } },
  }, { new: true, runValidators: true });
  if (updated) { await paymentNotification(updated, 'PREPARED'); return updated; }
  return Booking.findById(booking._id);
}
export async function getBookingPayment(req, res) {
  try {
    let booking = await ownedBooking(req);
    // Recover a committed debit even if the previous request lost its response or the coordination write failed.
    if (!booking.payment) {
      const receipt = await readBookingRedemption(String(booking._id));
      if (receipt) booking = await persistReceipt(booking, receipt);
    }
    res.json({ success: true, payment: booking.payment || null, agreedAmount: booking.finalAmount });
  } catch (error) { fail(res, error); }
}
export async function prepareBookingPayment(req, res) {
  try {
    let booking = await ownedBooking(req, 'Seeker');
    const points = req.body.points;
    if (!Number.isSafeInteger(points) || points < 0 || points > Math.floor(booking.finalAmount)) throw Object.assign(new Error('Choose whole Star Points within the service amount.'), { status: 400 });
    if (!booking.payment) booking = await persistReceipt(booking, await spendBookingPoints(booking, points));
    res.json({ success: true, payment: booking.payment });
  } catch (error) { fail(res, error); }
}
export async function confirmCustomerPayment(req, res) {
  try {
    const booking = await ownedBooking(req, 'ServiceProvider');
    if (!booking.payment) throw Object.assign(new Error('The seeker must confirm payment details first.'), { status: 409 });
    if (booking.payment.customerPaymentStatus === 'RECEIVED') return res.json({ success: true, payment: booking.payment });
    const method = req.body.method;
    if (booking.payment.customerAmountDue === 0 ? method !== 'POINTS_ONLY' : !['CASH', 'BANK_TRANSFER'].includes(method)) throw Object.assign(new Error('Select the payment method actually received.'), { status: 400 });
    const updated = await Booking.findOneAndUpdate({ _id: booking._id, 'payment.customerPaymentStatus': 'AWAITING_PAYMENT' }, {
      $set: { 'payment.customerPaymentStatus': 'RECEIVED', 'payment.customerPaymentMethod': method, 'payment.customerPaymentReceivedAt': new Date(), 'payment.customerPaymentReceivedBy': req.user.id },
      $push: { timeline: { status: 'CUSTOMER_PAYMENT_RECEIVED', message: method === 'POINTS_ONLY' ? 'Provider confirmed no customer payment due; platform reimbursement pending' : `Provider confirmed customer payment received by ${method === 'CASH' ? 'cash' : 'bank transfer'}`, at: new Date() } },
    }, { new: true, runValidators: true });
    if (updated) await paymentNotification(updated, 'RECEIVED');
    res.json({ success: true, payment: (updated || await Booking.findById(booking._id)).payment });
  } catch (error) { fail(res, error); }
}
