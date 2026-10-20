import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { toScheduleParts } from '../src/utils/timeUtils.js';
const source=fs.readFileSync(new URL('../src/services/rescheduleValidationService.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup({previous=null,next=null,available=true,route={estimatedTravelTimeMins:20},routingError=false}={}) {
 let schedule; const queries=[],routes=[];
 const context={Date,toScheduleParts,validateProviderSchedule:async args=>{schedule=args;return {isValid:available,message:'Outside working hours'};},getRoadDistanceAndTime:async(...args)=>{routes.push(args);if(routingError)throw Error('Offline');return route;},Booking:{findOne:q=>{queries.push(q);return {sort:async()=>q.scheduledStartTime.$lt?previous:next}}}};
 const validate=vm.runInNewContext(source+'\nvalidateRescheduleTime',context);
 return {run:()=>validate({booking:{_id:'current',providerId:'p',location:{lat:1,lng:2}},startTime:'2035-01-01T10:00:00+05:30',durationHours:1}),schedule:()=>schedule,queries,routes};
}
test('first job checks the complete window and excludes its old booking',async()=>{const h=setup();assert.equal((await h.run()).isValid,true);assert.equal(h.schedule().requestedEndTime,'11:15');assert.equal(h.schedule().excludeBookingId,'current');});
test('unavailable working hours reject the proposal',async()=>assert.equal((await setup({available:false}).run()).isValid,false));
test('reported previous delay prevents an impossible journey',async()=>{const h=setup({previous:{scheduledEndTime:'2035-01-01T09:00:00+05:30',delayInfo:{expectedEndTime:'2035-01-01T09:45:00+05:30'},location:{lat:1,lng:2}}});assert.equal((await h.run()).isValid,false);});
test('actual finish takes priority over the previous scheduled finish',async()=>{const h=setup({previous:{scheduledEndTime:'2035-01-01T11:00:00+05:30',actualEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}}});assert.equal((await h.run()).isValid,true);});
test('travel to the next booking must fit after job and buffer',async()=>{assert.equal((await setup({next:{scheduledStartTime:'2035-01-01T11:25:00+05:30',location:{lat:1,lng:2}}}).run()).isValid,false);});
test('missing previous coordinates block approval',async()=>{const result=await setup({previous:{scheduledEndTime:'2035-01-01T09:00:00+05:30'}}).run();assert.equal(result.isValid,false);assert.match(result.message,/coordinates/);});

test('previous lookup includes earlier dates and excludes the booking being rescheduled',async()=>{
 const h=setup();await h.run();assert.equal(h.queries[0].scheduledDate,undefined);assert.equal(h.queries[0]._id.$ne,'current');assert.equal(h.queries[0].providerId,'p');
});
test('far-away previous booking blocks even when the scheduled gap has no overlap',async()=>{
 const h=setup({previous:{_id:'far',scheduledEndTime:'2035-01-01T09:00:00+05:30',location:{lat:7,lng:81}},route:{estimatedTravelTimeMins:90,distanceKm:80,source:'GOOGLE_ROUTES'}});
 const result=await h.run();assert.equal(result.isValid,false);assert.equal(result.travelChecks.previous.fromBookingId,'far');assert.equal(result.travelChecks.previous.earliestArrival.toISOString(),'2035-01-01T05:00:00.000Z');
});
test('previous predicted duration is used when its saved end is missing',async()=>{
 const result=await setup({previous:{scheduledStartTime:'2035-01-01T09:00:00+05:30',predictedDurationMins:60,location:{lat:1,lng:2}}}).run();assert.equal(result.isValid,false);
});
test('a later actual start shifts the previous predicted finish and blocks arrival',async()=>{
 const result=await setup({previous:{scheduledStartTime:'2035-01-01T08:00:00+05:30',actualStartTime:'2035-01-01T09:00:00+05:30',scheduledEndTime:'2035-01-01T09:15:00+05:30',predictedDurationMins:60,location:{lat:1,lng:2}}}).run();assert.equal(result.isValid,false);
});
test('missing previous finish and routing failures cannot silently approve',async()=>{
 assert.equal((await setup({previous:{location:{lat:1,lng:2}}}).run()).isValid,false);
 assert.equal((await setup({previous:{scheduledEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}},routingError:true}).run()).isValid,false);
 assert.equal((await setup({previous:{scheduledEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}},route:{estimatedTravelTimeMins:NaN}}).run()).isValid,false);
});
test('sufficient finish buffer and travel gap allow approval with recorded route evidence',async()=>{
 const result=await setup({previous:{_id:'earlier',scheduledEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}},route:{estimatedTravelTimeMins:30,source:'GOOGLE_ROUTES',distanceKm:12}}).run();
 assert.equal(result.isValid,true);assert.equal(result.travelChecks.previous.estimatedTravelTimeMins,30);
});

test('each conflicting availability check still calculates travel from the earlier location',async()=>{
 const h=setup({available:false,previous:{_id:'earlier',scheduledEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}}});
 const first=await h.run(),second=await h.run();assert.equal(first.isValid,false);assert.equal(second.travelChecks.previous.estimatedTravelTimeMins,20);assert.equal(h.queries.length,4);
});

test('traffic forecasts use the previous finish and the new buffered finish as departures',async()=>{
 const h=setup({previous:{_id:'previous',scheduledEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}},next:{_id:'next',scheduledStartTime:'2035-01-01T13:00:00+05:30',location:{lat:1,lng:2}}});
 assert.equal((await h.run()).isValid,true);
 assert.equal(h.routes[0][4].departureTime.toISOString(),'2035-01-01T03:30:00.000Z');
 assert.equal(h.routes[1][4].departureTime.toISOString(),'2035-01-01T05:45:00.000Z');
});
