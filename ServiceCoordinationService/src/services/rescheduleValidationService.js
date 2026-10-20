import Booking from '../models/Booking.js';
import { validateProviderSchedule } from './scheduleValidationService.js';
import { toScheduleParts } from '../utils/timeUtils.js';
import { getRoadDistanceAndTime } from './routing/routingService.js';

const active = ['CONFIRMED', 'RESCHEDULED', 'ON_THE_WAY', 'IN_PROGRESS', 'DELAY_REPORTED', 'RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED'];
const coordinates = row => ({ lat: row?.location?.lat ?? row?.serviceLatitude, lng: row?.location?.lng ?? row?.serviceLongitude });
const validPoint = point => Number.isFinite(point.lat) && Math.abs(point.lat) <= 90 && Number.isFinite(point.lng) && Math.abs(point.lng) <= 180;
const validDate = value => value && Number.isFinite(+new Date(value)) ? new Date(value) : null;
function previousFinish(row, bufferMinutes) {
  const actual = validDate(row.actualEndTime);
  if (actual) return new Date(+actual + bufferMinutes * 60000);
  const start = validDate(row.actualStartTime) || validDate(row.scheduledStartTime);
  const minutes = Number(row.predictedDurationMins || row.mlPredictedDurationMins ||
    Number(row.predictedDurationHours || row.mlPredictedDurationHours || row.estimatedDurationHours) * 60);
  const projected = start && minutes > 0 ? new Date(+start + (minutes + bufferMinutes) * 60000) : null;
  const delayed = validDate(row.delayInfo?.expectedEndTime);
  const scheduled = validDate(row.scheduledEndTime);
  const candidates = [projected, delayed && new Date(+delayed + bufferMinutes * 60000), scheduled].filter(Boolean);
  return candidates.length ? new Date(Math.max(...candidates.map(Number))) : null;
}
export async function validateRescheduleTime({ booking, startTime, durationHours, bufferMinutes = 15 }) {
  const start = new Date(startTime), end = new Date(+start + Number(durationHours) * 3600000);
  const bufferedEnd = new Date(+end + bufferMinutes * 60000);
  const travelChecks = {};
  const failure = message => ({ isValid: false, message, travelChecks });
  if (!Number.isFinite(+start) || start <= new Date() || !(Number(durationHours) > 0)) return failure('Choose a valid future date and time.');
  const parts = toScheduleParts(start);
  if (parts.date !== toScheduleParts(bufferedEnd).date) return failure('The whole job and 15-minute buffer must fit within the same working day.');
  const schedule = await validateProviderSchedule({ providerId: booking.providerId, requestedDate: parts.date, requestedStartTime: parts.time, requestedEndTime: toScheduleParts(bufferedEnd).time, excludeBookingId: booking._id });
  const base = { providerId: booking.providerId, _id: { $ne: booking._id } };
  const [previous, next] = await Promise.all([
    Booking.findOne({ ...base, bookingStatus: { $in: [...active, 'COMPLETED'] }, scheduledStartTime: { $lt: start } }).sort({ scheduledStartTime: -1 }),
    Booking.findOne({ ...base, scheduledDate: parts.date, bookingStatus: { $in: active }, scheduledStartTime: { $gte: start } }).sort({ scheduledStartTime: 1 }),
  ]);
  const warnings = schedule.validationStatus === 'VALIDATED_WITH_CAUTION' ? [schedule.message] : [];
  const travelMinutes = async (from, to, direction, departureTime) => {
    const a = coordinates(from), b = coordinates(to);
    if (!validPoint(a) || !validPoint(b)) return null;
    let route;
    try { route = await getRoadDistanceAndTime(a.lat, a.lng, b.lat, b.lng, { departureTime }); }
    catch { return null; }
    if (!Number.isFinite(route?.estimatedTravelTimeMins) || route.estimatedTravelTimeMins < 0 || route.source === 'NO_COORDINATES') return null;
    travelChecks[direction] = {
      fromBookingId: String(from._id), toBookingId: String(to._id),
      from: a, to: b, estimatedTravelTimeMins: route.estimatedTravelTimeMins,
      distanceKm: route.distanceKm ?? null, source: route.source || 'UNKNOWN',
      trafficAware: Boolean(route.trafficAware),
      departureTime: route.departureTime || departureTime?.toISOString() || null,
      routingPreference: route.routingPreference || null,
    };
    if (route.source === 'HAVERSINE_FALLBACK') warnings.push('Travel uses a distance estimate; road traffic could not be verified.');
    return route.estimatedTravelTimeMins;
  };
  if (previous) {
    const finish = previousFinish(previous, bufferMinutes);
    if (!finish) return failure('The previous booking finish time could not be verified. Update it before approving this time.');
    const travel = await travelMinutes(previous, booking, 'previous', finish);
    if (travel == null) return failure('Travel from the previous booking could not be verified. Add valid service coordinates and retry.');
    const departure = validDate(travelChecks.previous.departureTime) || finish;
    const arrival = new Date(Math.max(+finish, +departure) + travel * 60000);
    Object.assign(travelChecks.previous, { previousFinishWithBuffer: finish, earliestArrival: arrival, proposedStart: start });
    if (arrival > start) return failure('This time is too close to the previous job’s predicted finish, buffer and travel time.');
  }
  if (next) {
    const travel = await travelMinutes(booking, next, 'next', bufferedEnd);
    if (travel == null) return failure('Travel to the next booking could not be verified. Add valid service coordinates and retry.');
    if (+bufferedEnd + travel * 60000 > +new Date(next.scheduledStartTime)) return failure('This time does not leave enough time to finish and travel to the next booking.');
  }
  if (!schedule.isValid) return { ...schedule, travelChecks };
  return { isValid: true, message: warnings.length ? warnings.join(' ') : 'Time is available.', warnings, travelChecks };
}
