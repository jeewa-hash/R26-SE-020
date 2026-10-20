import { enqueueLifecycleNotification } from './notificationOutbox.js';

// Persist before attempting network delivery; failures are retried after service restarts.
export const publishLifecycleNotification = enqueueLifecycleNotification;
