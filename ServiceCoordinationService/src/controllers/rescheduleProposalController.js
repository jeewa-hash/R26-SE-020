import Booking from '../models/Booking.js';
import RescheduleRequest from '../models/RescheduleRequest.js';
import { predictRescheduleDuration } from '../services/rescheduleDurationService.js';
import { validateRescheduleTime } from '../services/rescheduleValidationService.js';
import { suggestRescheduleSlots } from '../services/rescheduleSlotService.js';
import { toScheduleParts } from '../utils/timeUtils.js';
import { publishLifecycleNotification } from '../utils/lifecycleNotifications.js';

async function context(req) {
  const request = await RescheduleRequest.findById(req.params.rescheduleId);
  if (!request) throw Object.assign(new Error('Reschedule request not found.'), { status: 404 });
  const booking = await Booking.findById(request.bookingId);
  if (!booking) throw Object.assign(new Error('Booking not found.'), { status: 404 });
  const provider = req.user.role === 'ServiceProvider' && String(booking.providerId) === String(req.user.id);
  const seeker = req.user.role === 'Seeker' && String(booking.seekerId) === String(req.user.id);
  if (!provider && !seeker) throw Object.assign(new Error('Access denied.'), { status: 403 });
  if (!['PENDING', 'PENDING_PROVIDER_REVIEW', 'PENDING_SEEKER_REVIEW'].includes(request.status) ||
      ['CANCELLED', 'COMPLETED', 'IN_PROGRESS', 'DELAY_REPORTED'].includes(booking.bookingStatus) ||
      String(booking.pendingRescheduleId) !== String(request._id)) throw Object.assign(new Error('This reschedule request is no longer active. Refresh the booking.'), { status: 409 });
  return { request, booking, provider, seeker };
}
const fail = (res, error) => res.status(error.status || 503).json({ message: error.message || 'Unable to check a new time. Retry.' });

export async function getRescheduleAlternatives(req, res) {
  try {
    const { request, booking, provider } = await context(req);
    if (!provider || request.status === 'PENDING_SEEKER_REVIEW') return res.status(403).json({ message: 'Wait for the customer to review your suggestion.' });
    const duration = await predictRescheduleDuration(booking);
    const proposed = new Date(request.requestedStartTime || Date.now());
    const check = await validateRescheduleTime({ booking, startTime: proposed, durationHours: duration.durationHours });
    const arrival = check.travelChecks?.previous?.earliestArrival;
    const anchor = new Date(Math.max(+proposed || 0, arrival ? +new Date(arrival) : 0, Date.now()));
    const suggestedSlots = await suggestRescheduleSlots({ providerId: booking.providerId, booking,
      currentDate: toScheduleParts(anchor).date, originalStartTime: anchor, estimatedDurationHours: duration.durationHours });
    res.json({ success: true, data: { suggestedSlots, modelEvidence: duration.evidence } });
  } catch (error) { fail(res, error); }
}

export async function sendRescheduleProposal(req, res) {
  try {
    const { request, booking, provider } = await context(req);
    if ((provider && request.status === 'PENDING_SEEKER_REVIEW') || (!provider && request.status !== 'PENDING_SEEKER_REVIEW')) {
      return res.status(409).json({ message: 'Wait for the other person to review the current proposal.' });
    }
    const start = new Date(req.body.requestedStartTime);
    if (!Number.isFinite(+start) || start <= new Date()) return res.status(400).json({ message: 'Choose a valid future start time.' });
    const duration = await predictRescheduleDuration(booking);
    const validation = await validateRescheduleTime({ booking, startTime: start, durationHours: duration.durationHours });
    if (!validation.isValid) return res.status(409).json({ message: validation.message, validation });
    const end = new Date(+start + duration.durationHours * 3600000);
    const slot = { date: toScheduleParts(start).date, startTime: toScheduleParts(start).time,
      endTime: toScheduleParts(end).time, reason: 'Alternative time checked against duration, availability and travel.' };
    const updated = await RescheduleRequest.findOneAndUpdate({ _id: request._id, status: request.status, updatedAt: request.updatedAt }, {
      $set: { requestedStartTime: start, suggestedSlots: [slot], status: provider ? 'PENDING_SEEKER_REVIEW' : 'PENDING_PROVIDER_REVIEW',
        requestedByType: provider ? 'PROVIDER' : 'SEEKER', requestedById: req.user.id, note: String(req.body.note || '').slice(0, 1000) },
    }, { returnDocument: 'after', runValidators: true });
    if (!updated) return res.status(409).json({ message: 'The proposal changed. Refresh before continuing.' });
    await publishLifecycleNotification({ recipientId: String(provider ? booking.seekerId : booking.providerId), role: provider ? 'Seeker' : 'ServiceProvider',
      eventId: `reschedule:${request._id}:proposal:${updated.updatedAt.toISOString()}`, type: 'booking', title: 'Another service time suggested',
      message: 'Review the suggested time in your service. The current appointment has not changed.', metadata: { bookingId: String(booking._id) } });
    res.json({ success: true, data: updated });
  } catch (error) { fail(res, error); }
}
