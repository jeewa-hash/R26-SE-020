import mongoose from 'mongoose';
import axios from 'axios';
import { timingSafeEqual } from 'node:crypto';

const schema = new mongoose.Schema({
  _id: String,
  payload: { type: mongoose.Schema.Types.Mixed, required: true },
  state: { type: String, enum: ['PENDING', 'DELIVERED', 'FAILED'], default: 'PENDING' },
  attempts: { type: Number, default: 0 },
  nextAttemptAt: { type: Date, default: () => new Date(0) },
  leaseUntil: { type: Date, default: () => new Date(0) },
  lastError: String,
  deliveredAt: Date,
  expiresAt: Date,
}, { timestamps: true });
schema.index({ state: 1, nextAttemptAt: 1, leaseUntil: 1 });
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Outbox = mongoose.models.LifecycleNotificationOutbox || mongoose.model('LifecycleNotificationOutbox', schema);
let running = false, timer = null, warnedConfig = false;

export function notificationDeliveryConfig() {
  return {
    origin: (process.env.AUTH_SERVICE_URL || (process.env.NODE_ENV === 'production' ? 'https://r26-auth-service.onrender.com' : '')).replace(/\/+$/, ''),
    secret: process.env.NOTIFICATION_SERVICE_SECRET,
  };
}
export async function deliverLifecycleNotification(payload) {
  const { origin, secret } = notificationDeliveryConfig();
  if (!origin || !secret) throw Object.assign(new Error('Notification service configuration missing'), { code: 'NOTIFICATION_CONFIG_MISSING' });
  await axios.post(`${origin}/internal/notifications`, payload, { headers: { 'x-notification-secret': secret }, timeout: 20000 });
}
export async function enqueueLifecycleNotification(payload) {
  if (!payload?.eventId || !payload.recipientId || !['Seeker', 'ServiceProvider'].includes(payload.role) || !payload.title || !payload.message || !payload.type) return false;
  try {
    // String _id is a built-in unique index: HTTP and worker retries reuse the same event identity.
    await Outbox.updateOne({ _id: payload.eventId }, { $setOnInsert: { payload, state: 'PENDING', attempts: 0, nextAttemptAt: new Date(0), leaseUntil: new Date(0) } }, { upsert: true });
    void processNotificationOutbox().catch(error => console.warn('Notification worker unavailable:', error.name));
    return true; // Durable handoff; not a claim that the recipient has already received it.
  } catch (error) {
    if (error.code === 11000) return true;
    console.warn('Notification could not be queued:', error.name);
    return false;
  }
}
export async function processNotificationOutbox(now = new Date()) {
  if (running || mongoose.connection.readyState !== 1) return;
  const { origin, secret } = notificationDeliveryConfig();
  if (!origin || !secret) {
    if (!warnedConfig) console.warn('Notification delivery paused: configure AUTH_SERVICE_URL and NOTIFICATION_SERVICE_SECRET. Queued events are retained.');
    warnedConfig = true;
    return;
  }
  warnedConfig = false;
  running = true;
  try {
    const batch = [];
    for (let i = 0; i < 5; i++) {
      const job = await Outbox.findOneAndUpdate({ state: 'PENDING', nextAttemptAt: { $lte: now }, leaseUntil: { $lte: now } }, {
        $set: { leaseUntil: new Date(+now + 60000) }, $inc: { attempts: 1 },
      }, { new: true, sort: { createdAt: 1 } });
      if (!job) break;
      batch.push(job);
    }
    await Promise.all(batch.map(async job => {
      try {
        await deliverLifecycleNotification(job.payload);
        await Outbox.updateOne({ _id: job._id, leaseUntil: job.leaseUntil }, { $set: { state: 'DELIVERED', deliveredAt: new Date(), expiresAt: new Date(Date.now() + 7 * 86400000), lastError: '' } });
      } catch (error) {
        const status = error.response?.status;
        const invalid = status === 400 || status === 413;
        const nextAttemptAt = new Date(Date.now() + Math.min(300000, 5000 * 2 ** Math.min(job.attempts, 6)));
        await Outbox.updateOne({ _id: job._id, leaseUntil: job.leaseUntil }, { $set: {
          state: invalid ? 'FAILED' : 'PENDING', nextAttemptAt, leaseUntil: new Date(0), lastError: String(status || error.code || 'DELIVERY_UNAVAILABLE'),
        } });
        // Status codes only; never log credentials, message bodies, or upstream response data.
        console.warn('Notification delivery deferred:', status || error.code || 'unavailable');
      }
    }));
  } finally { running = false; }
}
export function startNotificationOutboxWorker() {
  if (timer) return;
  const tick = () => { void processNotificationOutbox().catch(error => console.warn('Notification worker failed:', error.name)); };
  tick(); timer = setInterval(tick, 10000); timer.unref();
}
export async function notificationHealthHandler(req, res) {
  const { origin, secret } = notificationDeliveryConfig();
  const supplied = req.get('x-notification-secret') || '';
  if (!secret) return res.status(503).json({ status: 'not_configured' });
  if (Buffer.byteLength(secret) !== Buffer.byteLength(supplied) || !timingSafeEqual(Buffer.from(secret), Buffer.from(supplied))) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const connected = mongoose.connection.readyState === 1;
    const pending = connected ? await Outbox.countDocuments({ state: 'PENDING' }) : null;
    const failed = connected ? await Outbox.countDocuments({ state: 'FAILED' }) : null;
    res.status(origin && connected ? 200 : 503).json({ configured: Boolean(origin), databaseReady: connected, workerStarted: Boolean(timer), pending, failed });
  } catch { res.status(503).json({ status: 'unavailable' }); }
}
