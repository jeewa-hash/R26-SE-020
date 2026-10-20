import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { toScheduleParts } from '../src/utils/timeUtils.js';
const source = fs.readFileSync(new URL('../src/controllers/rescheduleController.js', import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup(role='Seeker') {
  const booking = { _id:'b', seekerId:'s', providerId:'p', bookingStatus:'EXPIRED', estimatedDurationHours:1, scheduledDate:'2026-01-01', startTime:'09:00', endTime:'10:00', timeline:[], save:async()=>{} };
  let created, saved;
  const context = { predictRescheduleDuration: async()=>({durationHours:1,evidence:{predictedDurationMins:60,source:'TRAINED_DURATION_MODEL',modelVersion:'test'}}), Date, console, toScheduleParts, Booking:{findById:async()=>booking}, RescheduleRequest:{findOne:async()=>null,create:async data=>(created={_id:'r',...data})}, suggestRescheduleSlots:async()=>{throw Error('Must not generate slots when customer proposes a time')}, notifyBookingLifecycle:async(_,status)=>{saved=status}, publishLifecycleNotification:async()=>{} };
  context.validateRescheduleTime = async args => context.validateProviderSchedule ? context.validateProviderSchedule({ requestedStartTime: toScheduleParts(new Date(args.startTime)).time }) : ({ isValid: true });
  vm.runInNewContext(source+'\nthis.api={createRescheduleRequest,rejectRescheduleRequest};',context);
  const req={params:{bookingId:'b'},user:{id:role==='Seeker'?'s':'p',role},body:{requestedStartTime:'2035-01-01T09:00:00+05:30'}};
  let code, body; const res={status(n){code=n;return this},json(data){body=data;return this}};
  return {booking,req,res,context,get created(){return created},get code(){return code},get body(){return body},get notified(){return saved}};
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
 const x=setupApproval(false);x.context.suggestRescheduleSlots=async()=>[];vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00',endTime:'10:00'}}},x.res);
 assert.equal(x.code,409);assert.equal(x.booking.bookingStatus,'EXPIRED');
});

test('conflicting customer time returns alternatives without creating a pending request',async()=>{
 const x=setup();x.context.validateRescheduleTime=async()=>({isValid:false,message:'Outside working hours'});x.context.suggestRescheduleSlots=async()=>[{date:'2035-01-02',startTime:'09:00',endTime:'10:00'}];
 await x.context.api.createRescheduleRequest(x.req,x.res);assert.equal(x.code,409);assert.equal(x.created,undefined);assert.equal(x.booking.pendingRescheduleId,undefined);assert.equal(x.booking.bookingStatus,'EXPIRED');
});

test('approval accepts start only, reruns prediction and validates its fresh duration', async()=>{
 const x=setupApproval(); let calls=0,checked;
 x.context.predictRescheduleDuration=async()=>{calls++;return {durationHours:2,evidence:{predictedDurationMins:120,source:'TRAINED_DURATION_MODEL',modelVersion:'fresh'}}};
 x.context.validateRescheduleTime=async args=>{checked=args;return {isValid:true,message:'Time is available.'}};
 vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00'}}},x.res);
 assert.equal(x.code,200);assert.equal(calls,1);assert.equal(checked.durationHours,2);
 assert.equal(x.booking.predictedDurationMins,120);assert.equal(x.booking.durationModelVersion,'fresh');
 assert.equal(toScheduleParts(x.booking.scheduledEndTime).time,'11:15');
 assert.equal(x.body.data.modelEvidence.predictedDurationMins,120);
});
test('a longer fresh prediction blocks approval before booking writes',async()=>{
 const x=setupApproval();let written=false;
 x.context.Booking.findOneAndUpdate=async()=>{written=true};
 x.context.predictRescheduleDuration=async()=>({durationHours:3,evidence:{predictedDurationMins:180}});
 x.context.validateRescheduleTime=async args=>({isValid:args.durationHours<2,message:'New duration overlaps next booking'});
 x.context.suggestRescheduleSlots=async()=>[];
 vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00',endTime:'09:01'}}},x.res);
 assert.equal(x.code,409);assert.equal(written,false);assert.equal(x.booking.bookingStatus,'EXPIRED');
});

test('availability preview recalculates on every click and never confirms a booking', async()=>{
 const x=setupApproval();let predictions=0,checks=0,writes=0;
 x.context.predictRescheduleDuration=async()=>{predictions++;return {durationHours:1,evidence:{predictedDurationMins:60}}};
 x.context.validateRescheduleTime=async()=>{checks++;return {isValid:true,travelChecks:{previous:{estimatedTravelTimeMins:45}}}};
 x.context.Booking.findOneAndUpdate=async()=>{writes++};
 vm.runInNewContext('this.preview=checkRescheduleAvailability;',x.context);
 const req={params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00'}}};
 await x.context.preview(req,x.res);await x.context.preview(req,x.res);
 assert.equal(x.code,200);assert.equal(predictions,2);assert.equal(checks,2);assert.equal(writes,0);
 assert.equal(x.booking.bookingStatus,'EXPIRED');assert.equal(x.body.data.validation.travelChecks.previous.estimatedTravelTimeMins,45);
 assert.equal(x.body.data.modelEvidence.predictedDurationMins,60);
});
test('unavailable preview returns duration and route evidence for review without applying time', async()=>{
 const x=setupApproval();x.context.validateRescheduleTime=async()=>({isValid:false,message:'Travel too far',travelChecks:{previous:{estimatedTravelTimeMins:90}}});
 vm.runInNewContext('this.preview=checkRescheduleAvailability;',x.context);
 await x.context.preview({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00'}}},x.res);
 assert.equal(x.code,200);assert.equal(x.body.data.validation.isValid,false);assert.equal(x.body.data.modelEvidence.predictedDurationMins,60);assert.equal(x.booking.bookingStatus,'EXPIRED');
});
test('another provider cannot preview a reschedule',async()=>{
 const x=setupApproval();let predicted=false;x.context.predictRescheduleDuration=async()=>{predicted=true};
 vm.runInNewContext('this.preview=checkRescheduleAvailability;',x.context);
 await x.context.preview({params:{rescheduleId:'r'},user:{id:'other',role:'ServiceProvider'},body:{}},x.res);
 assert.equal(x.code,403);assert.equal(predicted,false);
});

test('seeker accepts a provider proposal only after fresh prediction and availability checks',async()=>{
 const x=setupApproval();let models=0,checks=0;
 const originalFind=x.context.RescheduleRequest.findById;
 x.context.RescheduleRequest.findById=async()=>{const request=await originalFind();request.status='PENDING_SEEKER_REVIEW';request.requestedStartTime='2035-01-01T09:00:00+05:30';return request};
 x.context.predictRescheduleDuration=async()=>{models++;return {durationHours:1,evidence:{predictedDurationMins:60}}};
 x.context.validateRescheduleTime=async()=>{checks++;return {isValid:true}};
 vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'s',role:'Seeker'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00'}}},x.res);
 assert.equal(x.code,200);assert.equal(models,1);assert.equal(checks,1);assert.equal(x.booking.bookingStatus,'RESCHEDULED');assert.match(x.booking.timeline[0].message,/Customer approved/);
});
test('provider cannot accept their own proposal while the seeker must review it',async()=>{
 const x=setupApproval();const find=x.context.RescheduleRequest.findById;
 x.context.RescheduleRequest.findById=async()=>({...await find(),status:'PENDING_SEEKER_REVIEW'});
 vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'p',role:'ServiceProvider'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00'}}},x.res);
 assert.equal(x.code,403);assert.equal(x.booking.bookingStatus,'EXPIRED');
});
test('seeker acceptance cannot bypass a new travel conflict',async()=>{
 const x=setupApproval();const find=x.context.RescheduleRequest.findById;
 x.context.RescheduleRequest.findById=async()=>({...await find(),status:'PENDING_SEEKER_REVIEW'});
 x.context.validateRescheduleTime=async()=>({isValid:false,message:'Previous job is too far away'});x.context.suggestRescheduleSlots=async()=>[];
 vm.runInNewContext('this.accept=acceptRescheduleSlot;',x.context);
 await x.context.accept({params:{rescheduleId:'r'},user:{id:'s',role:'Seeker'},body:{selectedSlot:{date:'2035-01-01',startTime:'09:00'}}},x.res);
 assert.equal(x.code,409);assert.equal(x.booking.bookingStatus,'EXPIRED');
});
