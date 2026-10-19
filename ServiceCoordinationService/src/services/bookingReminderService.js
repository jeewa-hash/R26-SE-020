import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import { publishLifecycleNotification } from '../utils/lifecycleNotifications.js';
import { dueStartReminder, WAITING_TO_START } from './bookingStartPolicy.js';

const deliverySchema = new mongoose.Schema({
  _id: String, bookingId: mongoose.Schema.Types.ObjectId, scheduledStart: Date, stage: String,
  payload: mongoose.Schema.Types.Mixed, deliveredAt: Date, retryAt: Date, leaseUntil: Date,
}, { timestamps: true });
const Delivery = mongoose.model('BookingReminderDelivery', deliverySchema);
const copy = {
  UPCOMING_START: ['Your service starts soon', 'The service starts in 30 minutes or less. Provider: confirm your travel status, or start work if you have arrived. Customer: travel has not been confirmed yet.'],
  START_DUE: ['Service start time reached', 'Work has not been marked as started. Update the job status, contact each other, or request another time. The booking expires 45 minutes after its scheduled start if work has not started.'],
  FINAL_START_REMINDER: ['Please update this service', 'Work has not been marked as started. This booking expires 45 minutes after its scheduled start. Start work if on site, contact each other, or arrange another time.'],
  EXPIRED: ['Booking expired', 'Work was not started within 45 minutes of the scheduled time. The customer can request a new time from My Services. Provider approval is required.'],
};
export async function queueStartNotice(booking, stage) {
  const start = new Date(booking.scheduledStartTime).toISOString();
  await Promise.all([['ServiceProvider', booking.providerId], ['Seeker', booking.seekerId]].map(async ([role, recipientId]) => {
    const eventId = `booking-start:${booking._id}:${start}:${stage}:${recipientId}`;
    await Delivery.updateOne({ _id: eventId }, { $setOnInsert: {
      bookingId: booking._id, scheduledStart: booking.scheduledStartTime, stage,
      payload: { eventId, recipientId: String(recipientId), role, type: 'booking', title: copy[stage][0], message: copy[stage][1], metadata: { bookingId: String(booking._id), status: stage } },
      retryAt: new Date(0), leaseUntil: new Date(0),
    } }, { upsert: true });
  }));
}
export async function processBookingReminders(now = new Date()) {
  for await (const booking of Booking.find({ bookingStatus: { $in: WAITING_TO_START }, actualStartTime: null, scheduledStartTime: { $ne: null, $lte: new Date(+now + 30 * 60000) } }).cursor()) {
    const stage = dueStartReminder(booking, now);
    if (!stage) continue;
    if (stage === 'EXPIRED') {
      // This state predicate protects a concurrently started or rescheduled job.
      const expired = await Booking.findOneAndUpdate({ _id: booking._id, bookingStatus: { $in: WAITING_TO_START }, actualStartTime: null, scheduledStartTime: booking.scheduledStartTime }, {
        $set: { bookingStatus: 'EXPIRED', expiredAt: now },
        $push: { timeline: { status: 'EXPIRED', message: 'Start window closed without work starting.', at: now } },
      }, { new: true });
      if (expired) await queueStartNotice(expired, stage);
    } else await queueStartNotice(booking, stage);
  }
  // Recover expiry notifications after a crash or an expiry performed by a read endpoint.
  for await (const booking of Booking.find({ bookingStatus: 'EXPIRED', expiredAt: { $gte: new Date(+now - 24 * 3600000) }, scheduledStartTime: { $ne: null } }).cursor()) await queueStartNotice(booking, 'EXPIRED');
  for (let i = 0; i < 100; i++) {
    const job = await Delivery.findOneAndUpdate({ deliveredAt: null, retryAt: { $lte: now }, leaseUntil: { $lte: now } }, { $set: { leaseUntil: new Date(+now + 30000) } }, { new: true, sort: { createdAt: 1 } });
    if (!job) break;
    const current = await Booking.findById(job.bookingId);
    const stale = !current || +new Date(current.scheduledStartTime) !== +job.scheduledStart ||
      (job.stage === 'EXPIRED' ? current.bookingStatus !== 'EXPIRED' : dueStartReminder(current, now) !== job.stage);
    if (stale || await publishLifecycleNotification(job.payload)) await Delivery.updateOne({ _id: job._id }, { $set: { deliveredAt: new Date() } });
    else await Delivery.updateOne({ _id: job._id }, { $set: { retryAt: new Date(+now + 60000), leaseUntil: new Date(0) } });
  }
}
export function startBookingReminderWorker() {
  let running = false;
  const tick = async () => {
    if (running || mongoose.connection.readyState !== 1) return;
    running = true;
    try { await processBookingReminders(); } catch (error) { console.warn('Booking reminder worker failed:', error.name); }
    finally { running = false; }
  };
  tick();
  const timer = setInterval(tick, 30000); timer.unref();
  return () => clearInterval(timer);
}
