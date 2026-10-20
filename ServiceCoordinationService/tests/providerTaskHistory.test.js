import test from 'node:test';
import assert from 'node:assert/strict';
import Booking from '../src/models/Booking.js';
import Evaluation from '../src/models/BidScheduleEvaluation.js';
import { getProviderTaskHistory } from '../src/controllers/providerTaskHistoryController.js';

test('rolling task frequency counts completed bookings once and exposes unmapped history', async () => {
 const originalBooking = Booking.find, originalEvaluation = Evaluation.find;
 let filter;
 Booking.find = query => { filter = query; return { select: () => ({ lean: async () => [{ _id:'a',bidCoordinationId:'one' },{ _id:'b',bidCoordinationId:'two' },{ _id:'c',bidCoordinationId:'old' }] }) }; };
 const payload = { serviceCategory:'Repairing',serviceType:'Plumbing Repair',taskName:'Repair Tap' };
 Evaluation.find = () => ({ select: () => ({ sort: () => ({ lean: async () => [ { bidCoordinationId:'one',modelEvidence:{submittedPayload:payload} },{bidCoordinationId:'one',modelEvidence:{submittedPayload:payload}},{bidCoordinationId:'two',modelEvidence:{submittedPayload:payload}} ] }) }) });
 try {
  let result;
  await getProviderTaskHistory({user:{id:'own-provider'}},{json: value => {result=value;},status(){return this;}});
  assert.equal(filter.providerId,'own-provider');assert.equal(filter.bookingStatus,'COMPLETED');
  assert.equal(filter.$or[0].completedAt.$lte-filter.$or[0].completedAt.$gte,30*86400000);
  assert.equal(result.tasks[0].completedCount,2);assert.equal(result.unmatchedCompletedJobs,1);
 } finally { Booking.find=originalBooking; Evaluation.find=originalEvaluation; }
});
