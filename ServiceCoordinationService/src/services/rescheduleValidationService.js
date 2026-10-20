import Booking from '../models/Booking.js';
import { validateProviderSchedule } from './scheduleValidationService.js';
import { toScheduleParts } from '../utils/timeUtils.js';
import { getRoadDistanceAndTime } from './routing/routingService.js';

const active = ['CONFIRMED', 'RESCHEDULED', 'ON_THE_WAY', 'IN_PROGRESS', 'DELAY_REPORTED', 'RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED'];
const coordinates = row => ({ lat: row?.location?.lat ?? row?.serviceLatitude, lng: row?.location?.lng ?? row?.serviceLongitude });
export async function validateRescheduleTime({ booking, startTime, durationHours, bufferMinutes = 15 }) {
  const start = new Date(startTime), end = new Date(+start + Number(durationHours) * 3600000);
  const bufferedEnd = new Date(+end + bufferMinutes * 60000);
  const failure = message => ({ isValid: false, message });
  if (!Number.isFinite(+start) || start <= new Date() || !(Number(durationHours) > 0)) return failure('Choose a valid future date and time.');
  const parts = toScheduleParts(start);
  if (parts.date !== toScheduleParts(bufferedEnd).date) return failure('The whole job and 15-minute buffer must fit within the same working day.');
  const schedule = await validateProviderSchedule({ providerId: booking.providerId, requestedDate: parts.date, requestedStartTime: parts.time, requestedEndTime: toScheduleParts(bufferedEnd).time, excludeBookingId: booking._id });
  if (!schedule.isValid) return schedule;
  const base = { providerId: booking.providerId, _id: { $ne: booking._id }, scheduledDate: parts.date };
  const [previous, next] = await Promise.all([
    Booking.findOne({ ...base, bookingStatus: { $in: [...active, 'COMPLETED'] }, scheduledStartTime: { $lt: start } }).sort({ scheduledStartTime: -1 }),
    Booking.findOne({ ...base, bookingStatus: { $in: active }, scheduledStartTime: { $gte: start } }).sort({ scheduledStartTime: 1 }),
  ]);
  const warnings = schedule.validationStatus === 'VALIDATED_WITH_CAUTION' ? [schedule.message] : [];
  const travelMinutes = async (from, to) => {
    const a = coordinates(from), b = coordinates(to);
    if ([a.lat, a.lng, b.lat, b.lng].some(value => value == null)) { warnings.push('Travel could not be verified because location coordinates are missing.'); return null; }
    const route = await getRoadDistanceAndTime(a.lat, a.lng, b.lat, b.lng);
    if (!Number.isFinite(route.estimatedTravelTimeMins)) { warnings.push('Travel estimate is unavailable.'); return null; }
    return route.estimatedTravelTimeMins;
  };
  if (previous) {
    const finish = previous.actualEndTime || previous.delayInfo?.expectedEndTime || previous.scheduledEndTime;
    const travel = await travelMinutes(previous, booking);
    // Scheduled end already includes the booking buffer; actual/reported finishes do not.
    const extraBuffer = previous.actualEndTime || previous.delayInfo?.expectedEndTime ? bufferMinutes : 0;
    if (finish && +new Date(finish) + ((travel ?? 0) + extraBuffer) * 60000 > +start) return failure('This time is too close to the previous job’s finish and travel time.');
  }
  if (next) {
    const travel = await travelMinutes(booking, next);
    if (+bufferedEnd + (travel ?? 0) * 60000 > +new Date(next.scheduledStartTime)) return failure('This time does not leave enough time to finish and travel to the next booking.');
  }
  return { isValid: true, message: warnings.length ? warnings.join(' ') : 'Time is available.', warnings };
}
