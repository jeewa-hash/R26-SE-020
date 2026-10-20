import test from 'node:test';
import assert from 'node:assert/strict';
import { startWindow, dueStartReminder } from '../src/services/bookingStartPolicy.js';
const start = new Date('2030-01-01T09:00:00+05:30');
const at = minutes => new Date(+start + minutes * 60000);
test('start opens exactly 30 min before and closes after 45 min', () => {
  for (const [minute, allowed] of [[-31,false],[-30,true],[-1,true],[0,true],[44,true],[45,true],[46,false]]) assert.equal(startWindow(start, at(minute)).allowed, allowed);
});
test('reminders advance through upcoming, due, final and expiry', () => {
  const b = { scheduledStartTime: start, bookingStatus: 'CONFIRMED' };
  for (const [minute, stage] of [[-31,null],[-30,'UPCOMING_START'],[-1,'UPCOMING_START'],[0,'START_DUE'],[15,'FINAL_START_REMINDER'],[45,'FINAL_START_REMINDER'],[46,'EXPIRED']]) assert.equal(dueStartReminder(b,at(minute)),stage);
});
test('travelling suppresses travel reminder but does not prevent expiry', () => {
  const b = { scheduledStartTime: start, bookingStatus: 'ON_THE_WAY' };
  assert.equal(dueStartReminder(b,at(-20)),null);
  assert.equal(dueStartReminder(b,at(46)),'EXPIRED');
});
test('started, completed and cancelled jobs do not receive start reminders', () => {
  for (const bookingStatus of ['IN_PROGRESS','DELAY_REPORTED','COMPLETED','CANCELLED']) assert.equal(dueStartReminder({scheduledStartTime:start,bookingStatus},at(46)),null);
  assert.equal(dueStartReminder({scheduledStartTime:start,bookingStatus:'CONFIRMED',actualStartTime:at(-10)},at(46)),null);
});
test('unapproved reschedule cannot prevent start-window expiry', () => {
  assert.equal(dueStartReminder({scheduledStartTime:start,bookingStatus:'RESCHEDULE_REQUESTED'},at(46)),'EXPIRED');
});
