import { enqueueLifecycleNotification, deliverLifecycleNotification } from './notificationOutbox.js';

export async function publishLifecycleNotification(payload) {
  // Start reminders already have a state-aware retry worker. Keep them there so an old
  // appointment reminder cannot be delivered after the job starts or is rescheduled.
  if (String(payload?.eventId || '').startsWith('booking-start:')) {
    try { await deliverLifecycleNotification(payload); return true; }
    catch (error) { console.warn('Start reminder delivery deferred:', error.response?.status || error.code || 'unavailable'); return false; }
  }
  return enqueueLifecycleNotification(payload);
}
