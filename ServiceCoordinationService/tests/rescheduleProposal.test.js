import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { toScheduleParts } from '../src/utils/timeUtils.js';
const source=fs.readFileSync(new URL('../src/controllers/rescheduleProposalController.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup({seeker=false,status='PENDING_PROVIDER_REVIEW',valid=true,cancelled=false,race=false}={}) {
 const booking={_id:'b',providerId:'p',seekerId:'s',pendingRescheduleId:'r',bookingStatus:cancelled?'CANCELLED':'EXPIRED',scheduledStartTime:'2030-01-01T00:00:00Z'};
 const request={_id:'r',bookingId:'b',status,updatedAt:new Date('2030-01-01'),requestedStartTime:'2035-01-01T12:30:00+05:30'};
 let updated,anchor;const events=[];let predictions=0;
 const c={Date,toScheduleParts,Booking:{findById:async()=>booking},RescheduleRequest:{findById:async()=>request,findOneAndUpdate:async(query,update)=>{assert.equal(query.status,status);if(race)return null;updated=update.$set;return {...request,...updated,updatedAt:new Date('2030-01-02')}}},
 predictRescheduleDuration:async()=>{predictions++;return {durationHours:1,evidence:{predictedDurationMins:60}}},
 validateRescheduleTime:async()=>({isValid:valid,message:'Travel does not fit',travelChecks:{previous:{earliestArrival:'2035-01-01T12:33:00+05:30'}}}),
 suggestRescheduleSlots:async args=>{anchor=args.originalStartTime;return [{date:'2035-01-01',startTime:'12:45',endTime:'13:45'}]},
 publishLifecycleNotification:async e=>events.push(e)};
 vm.runInNewContext(source+'\nthis.api={getRescheduleAlternatives,sendRescheduleProposal}',c);
 const req={params:{rescheduleId:'r'},user:{id:seeker?'s':'p',role:seeker?'Seeker':'ServiceProvider'},body:{requestedStartTime:'2035-01-01T12:45:00+05:30'}};
 const res={code:200,status(n){this.code=n;return this},json(body){this.body=body;return this}};
 return {c,req,res,booking,events,get updated(){return updated},get anchor(){return anchor},get predictions(){return predictions}};
}
test('provider alternatives start after the previous booking arrival and never change schedule',async()=>{
 const x=setup();await x.c.api.getRescheduleAlternatives(x.req,x.res);assert.equal(x.res.code,200);assert.equal(toScheduleParts(x.anchor).time,'12:33');assert.equal(x.updated,undefined);assert.equal(x.booking.bookingStatus,'EXPIRED');
});
test('provider suggestion waits for seeker agreement and sends seeker notification',async()=>{
 const x=setup();await x.c.api.sendRescheduleProposal(x.req,x.res);assert.equal(x.res.code,200);assert.equal(x.updated.status,'PENDING_SEEKER_REVIEW');assert.equal(x.booking.scheduledStartTime,'2030-01-01T00:00:00Z');assert.equal(x.events[0].recipientId,'s');assert.equal(x.events[0].role,'Seeker');assert.equal(x.predictions,1);
});
test('seeker counterproposal returns to provider review without changing the appointment',async()=>{
 const x=setup({seeker:true,status:'PENDING_SEEKER_REVIEW'});await x.c.api.sendRescheduleProposal(x.req,x.res);assert.equal(x.res.code,200);assert.equal(x.updated.status,'PENDING_PROVIDER_REVIEW');assert.equal(x.events[0].recipientId,'p');assert.equal(x.booking.bookingStatus,'EXPIRED');
});
test('conflicting suggestion never replaces the pending proposal or sends a notification',async()=>{
 const x=setup({valid:false});await x.c.api.sendRescheduleProposal(x.req,x.res);assert.equal(x.res.code,409);assert.equal(x.updated,undefined);assert.equal(x.events.length,0);
});
test('outsiders, cancelled bookings and out-of-turn proposals cannot change request',async()=>{
 for (const options of [{cancelled:true},{status:'PENDING_SEEKER_REVIEW'},{seeker:true}]) {const x=setup(options);await x.c.api.sendRescheduleProposal(x.req,x.res);assert.equal(x.res.code,409);assert.equal(x.updated,undefined);}
 const x=setup();x.req.user.id='outsider';await x.c.api.sendRescheduleProposal(x.req,x.res);assert.equal(x.res.code,403);
});
test('concurrent proposal changes return a conflict without sending misleading notifications',async()=>{
 const x=setup({race:true});await x.c.api.sendRescheduleProposal(x.req,x.res);assert.equal(x.res.code,409);assert.equal(x.events.length,0);
});
