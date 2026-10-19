import axios from 'axios';

let warnedMissingConfig = false;

// Server-to-server only. Notification failure must not undo a saved job action.
export async function publishLifecycleNotification(payload) {
  const base = process.env.AUTH_SERVICE_URL;
  const secret = process.env.NOTIFICATION_SERVICE_SECRET;
  if (!base || !secret) {
    if (!warnedMissingConfig) console.warn('Lifecycle notifications disabled: configure AUTH_SERVICE_URL and NOTIFICATION_SERVICE_SECRET');
    warnedMissingConfig = true;
    return;
  }
  try {
    await axios.post(`${base.replace(/\/$/, '')}/internal/notifications`, payload, {
      headers: { 'x-notification-secret': secret }, timeout: 5000,
    });
  } catch (error) {
    console.warn('Lifecycle notification delivery failed', error.response?.status || error.code || 'unavailable');
  }
}
