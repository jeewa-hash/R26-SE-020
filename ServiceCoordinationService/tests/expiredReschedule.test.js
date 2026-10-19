import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { toScheduleParts } from '../src/utils/timeUtils.js';
const source = fs.readFileSync(new URL('../src/controllers/rescheduleController.js', import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup(role='Seeker') {
  const booking = { _id:'b', seekerId:'s', providerId:'p', bookingStatus:'EXPIRED', estimatedDurationHours:1, scheduledDate:'2026-01-01', startTime:'09:00', endTime:'10:00', timeline:[], save:async()=>{} };
  let created, saved;
  const context = { Date, console, toScheduleParts, Booking:{findById:async()=>booking}, RescheduleRequest:{findOne:async()=>null,create:async data=>(created={_id:'r',...data})}, suggestRescheduleSlots:async()=>{throw Error('Must not generate slots when customer proposes a time')}, notifyBookingLifecycle:async(_,status)=>{saved=status}, publishLifecycleNotification:async()=>{} };
  vm.runInNewContext(source+'\nthis.api={createRescheduleRequest,rejectRescheduleRequest};',context);
  const req={params:{bookingId:'b'},user:{id:role==='Seeker'?'s':'p',role},body:{requestedStartTime:'2035-01-01T09:00:00+05:30'}};
  let code, body; const res={status(n){code=n;return this},json(data){body=data;return this}};
  return {booking,req,res,context,get created(){return created},get code(){return code},get notified(){return saved}};
}
test('expired booking stays expired while a future customer time awaits review', async()=>{
  const x=setup();await x.context.api.createRescheduleRequest(x.req,x.res);
  assert.equal(x.code,201);assert.equal(x.booking.bookingStatus,'EXPIRED');assert.equal(x.created.previousBookingStatus,'EXPIRED');assert.equal(x.created.status,'PENDING_PROVIDER_REVIEW');assert.equal(x.booking.pendingRescheduleId,'r');assert.equal(x.notified,'RESCHEDULE_REQUESTED');
  assert.equal(x.created.suggestedSlots[0].startTime,'09:00');
});
test('provider cannot reopen an expired booking without customer proposal', async()=>{
  const x=setup('ServiceProvider');await x.context.api.createRescheduleRequest(x.req,x.res);assert.equal(x.code,400);
});
test('past proposed time is rejected and expiry is preserved', async()=>{
  const x=setup();x.req.body.requestedStartTime='2020-01-01T09:00:00+05:30';await x.context.api.createRescheduleRequest(x.req,x.res);assert.equal(x.code,400);assert.equal(x.booking.bookingStatus,'EXPIRED');
});
test('declining an expired booking proposal clears pending request and preserves expiry', async()=>{
  const x=setup();x.booking.pendingRescheduleId='r';
  x.context.RescheduleRequest.findById=async()=>({_id:'r',providerId:'p',seekerId:'s',bookingId:'b',status:'PENDING_PROVIDER_REVIEW',previousBookingStatus:'EXPIRED',save:async()=>{}});
  await x.context.api.rejectRescheduleRequest({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'}},x.res);
  assert.equal(x.code,200);assert.equal(x.booking.bookingStatus,'EXPIRED');assert.equal(x.booking.pendingRescheduleId,null);
});
function setupApproval(valid=true) {
 const x=setup(); x.booking.acceptedRescheduleRequests=[];x.booking.pendingRescheduleId='r';
 const request={_id:'r',bookingId:'b',status:'PENDING_PROVIDER_REVIEW',previousBookingStatus:'EXPIRED',currentSchedule:{date:'2026-01-01',startTime:'09:00'},save:async()=>{}};
 x.context.RescheduleRequest.findById=async()=>request;
 x.context.validateProviderSchedule=async args=>{assert.equal(args.requestedStartTime,'09:00');return {isValid:valid}};
 x.context.Booking.findOne=()=>({sort:async()=>null});
 x.context.Booking.findOneAndUpdate=async()=>x.booking;
 return x;
}
test('provider approval validates a future time then restores scheduled service and preserves timeline',async()=>{
 const x=setupApproval();
 // Export acceptance separately from the same controller module for this test.
 vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00',endTime:'10:00'}}},x.res);
 assert.equal(x.code,200);assert.equal(x.booking.bookingStatus,'RESCHEDULED');assert.equal(x.booking.pendingRescheduleId,null);assert.equal(x.booking.expiredAt,null);assert.equal(x.booking.timeline[0].status,'RESCHEDULED');assert.equal(toScheduleParts(x.booking.scheduledStartTime).time,'09:00');
});
test('unavailable proposed time cannot reopen an expired service',async()=>{
 const x=setupApproval(false);vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00',endTime:'10:00'}}},x.res);
 assert.equal(x.code,409);assert.equal(x.booking.bookingStatus,'EXPIRED');
});
