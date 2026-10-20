export const WAITING_TO_START = ['CONFIRMED', 'RESCHEDULED', 'ON_THE_WAY', 'RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED'];
export function startWindow(start, now = new Date()) {
  const scheduled = new Date(start).getTime();
  if (!start || !Number.isFinite(scheduled)) return { allowed: false, expired: false, message: 'A valid scheduled start time is required.' };
  const opensAt = scheduled - 15 * 60000, closesAt = scheduled + 45 * 60000;
  return { opensAt: new Date(opensAt), closesAt: new Date(closesAt), allowed: +now >= opensAt && +now <= closesAt, expired: +now > closesAt,
    message: +now < opensAt ? 'You can start work from 15 minutes before the scheduled start.' : +now > closesAt ? 'This booking has passed the 45-minute start window.' : '' };
}
export function dueStartReminder(booking, now = new Date()) {
  if (!WAITING_TO_START.includes(booking.bookingStatus) || booking.actualStartTime) return null;
  const window = startWindow(booking.scheduledStartTime, now);
  if (window.expired) return 'EXPIRED';
  const elapsed = (+now - +new Date(booking.scheduledStartTime)) / 60000;
  if (!Number.isFinite(elapsed)) return null;
  if (elapsed >= 15) return 'FINAL_START_REMINDER';
  if (elapsed >= 0) return 'START_DUE';
  if (elapsed >= -30 && booking.bookingStatus !== 'ON_THE_WAY') return 'UPCOMING_START';
  return null;
}
