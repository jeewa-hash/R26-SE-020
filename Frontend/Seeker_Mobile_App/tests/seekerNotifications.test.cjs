const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/seekerNotifications.js'), 'utf8').replace(/export /g, '') + '\nthis.api = { mergeSeekerNotifications, notificationKey, seekerNotificationDestination };', context);
const { mergeSeekerNotifications: merge, notificationKey: key, seekerNotificationDestination: destination } = context.api;
test('booking lifecycle alerts open their exact session instead of the general booking list', () => {
  for (const status of ['CONFIRMED', 'ON_THE_WAY', 'IN_PROGRESS', 'DELAY_REPORTED', 'RESCHEDULE_REQUESTED', 'COMPLETED', 'CANCELLED', 'EXPIRED']) {
    const target = destination({ _id: status, type: 'booking', metadata: { bookingId: 'booking', status } });
    assert.equal(target.name, 'SeekerServiceSessionDetails');
    assert.equal(target.params.session.booking._id, 'booking');
    assert.equal(target.params.notificationId, status);
  }
});
test('new quote and requested-time alerts resolve their linked request; legacy missing metadata has a safe destination', () => {
  const result = destination({ _id: 'n', type: 'quote', metadata: { providerRequestId: { _id: 'r' } } });
  assert.equal(result.params.session.requests[0]._id, 'r');
  assert.equal(result.name, 'SeekerServiceSessionDetails');
  assert.equal(destination({ type: 'quote' }).name, 'SeekerServices');
});
test('persisted and synthetic quote alerts share a popup identity and only appear once', () => {
  const fallback = { _id: 'quote_q', quoteId: 'q', type: 'quote', isRead: false };
  const saved = { _id: 'n', eventId: 'quotation:q:sent', metadata: { quotationId: 'q' }, type: 'quote', isRead: false };
  assert.equal(key(fallback), key(saved));
  assert.equal(merge([saved], [fallback]).length, 1);
  assert.equal(merge([saved], [fallback])[0]._id, 'n');
  assert.equal(key({ ...saved, _id: 'time-change', eventId: 'request:r:reschedule' }), 'time-change');
});
test('read updates are idempotent and clearing suppresses the legacy quote fallback after refetch', () => {
  const fallback = { _id: 'quote_q', quoteId: 'q', isRead: false };
  const read = new Set(['quote_q']);
  const rows = merge([], [fallback], read);
  assert.equal(rows.filter(n => !n.isRead).length, 0);
  assert.equal(merge([], rows, read).filter(n => !n.isRead).length, 0);
  assert.equal(merge([], [fallback], read, new Set(['quote_q'])).length, 0);
});
test('all notification destinations are registered in the app navigator', () => {
  const app = fs.readFileSync(path.join(__dirname, '../App.js'), 'utf8');
  const routes = new Set([...app.matchAll(/name="([^"]+)"/g)].map(m => m[1]));
  for (const type of ['booking', 'quote', 'bid', 'message', 'high_demand_alert', 'system']) assert.ok(routes.has(destination({ type }).name));
});

test('provider availability opens responses for the exact seeker post', () => {
  const target = destination({ type: 'provider_available', metadata: { postId: 'post-42', providerId: 'provider-7' } });
  assert.equal(target.name, 'PostResponsesScreen');
  assert.equal(target.params.postId, 'post-42');
});
