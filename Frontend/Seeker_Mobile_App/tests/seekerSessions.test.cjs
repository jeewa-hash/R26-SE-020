const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/seekerSessions.js'), 'utf8').replace(/export /g, '') + '\nthis.api = { buildSeekerSessions, seekerSessionGuidance };', context);
const { buildSeekerSessions: build, seekerSessionGuidance: guide } = context.api;

test('request links quotation and booking even when later records lack a session identifier', () => {
  const sessions = build({ serviceSessions: [{ _id: 'session' }], requests: [{ _id: 'r', sessionId: 'session' }], quotations: [{ _id: 'q', providerRequestId: { _id: 'r' } }], bookings: [{ _id: 'b', externalQuotationId: 'q', bookingStatus: 'IN_PROGRESS' }] });
  assert.equal(sessions.length, 1);
  assert.equal(sessions[0].booking._id, 'b');
  assert.equal(sessions[0].guidance.title, 'Work in progress');
});
test('same post or service title cannot merge unrelated requests', () => {
  assert.equal(build({ requests: [{ _id: 'a', postId: 'same', title: 'Tap repair' }, { _id: 'b', postId: 'same', title: 'Tap repair' }] }).length, 2);
});
test('accepted offer requires confirmation; a provider request for a new time needs seeker action', () => {
  const accepted = guide({ quotations: [{ status: 'ACCEPTED' }] });
  assert.equal(accepted.step, 1);
  assert.equal(accepted.target, 'session');
  assert.equal(accepted.action, 'Continue Confirmation');
  const timing = guide({ requests: [{ status: 'quoted', rescheduleRequestedAt: '2026-10-18' }] });
  assert.equal(timing.owner, 'You');
  assert.equal(timing.action, 'Choose New Time');
});
test('closed offers are not presented as available; pending availability waits for provider', () => {
  assert.equal(guide({ requests: [{ status: 'rejected' }], quotations: [{ status: 'REJECTED', coordinationStatus: 'CAN_ACCEPT' }] }).tab, 'History');
  assert.equal(guide({ quotations: [{ status: 'SENT', coordinationStatus: 'NOT_CHECKED' }] }).owner, 'Provider');
});
test('rescheduling, delay and terminal bookings have distinct next steps', () => {
  for (const status of ['RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED', 'DELAY_REPORTED']) {
    const value = guide({ booking: { bookingStatus: status } });
    assert.equal(value.group, 'attention');
    assert.equal(value.target, 'booking');
  }
  for (const status of ['COMPLETED', 'CANCELLED', 'EXPIRED']) assert.equal(guide({ booking: { bookingStatus: status } }).tab, 'History');
});
test('newest duplicate booking is retained and active booking wins over closed history', () => {
  const [session] = build({ bookings: [
    { _id: 'b', sessionId: 's', bookingStatus: 'IN_PROGRESS', updatedAt: '2026-10-18' },
    { _id: 'b', sessionId: 's', bookingStatus: 'CONFIRMED', updatedAt: '2026-10-17' },
    { _id: 'old', sessionId: 's', bookingStatus: 'CANCELLED', updatedAt: '2026-10-19' },
  ] });
  assert.equal(session.bookingCount, 2);
  assert.equal(session.booking.bookingStatus, 'IN_PROGRESS');
});
test('sessions requiring a decision sort before waiting and closed sessions', () => {
  const sessions = build({ requests: [{ _id: 'waiting', status: 'pending' }, { _id: 'choose', rescheduleRequestedAt: '2026-10-18' }, { _id: 'closed', status: 'rejected' }] });
  assert.equal(sessions[0].requests[0]._id, 'choose');
  assert.equal(sessions[2].requests[0]._id, 'closed');
});
