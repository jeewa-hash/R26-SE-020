import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { toScheduleParts } from '../src/utils/timeUtils.js';
const source=fs.readFileSync(new URL('../src/services/rescheduleValidationService.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup({previous=null,next=null,available=true}={}) {
 let schedule;
 const context={Date,toScheduleParts,validateProviderSchedule:async args=>{schedule=args;return {isValid:available,message:'Outside working hours'};},getRoadDistanceAndTime:async()=>({estimatedTravelTimeMins:20}),Booking:{findOne:q=>({sort:async()=>q.scheduledStartTime.$lt?previous:next})}};
 const validate=vm.runInNewContext(source+'\nvalidateRescheduleTime',context);
 return {run:()=>validate({booking:{_id:'current',providerId:'p',location:{lat:1,lng:2}},startTime:'2035-01-01T10:00:00+05:30',durationHours:1}),schedule:()=>schedule};
}
test('first job checks the complete window and excludes its old booking',async()=>{const h=setup();assert.equal((await h.run()).isValid,true);assert.equal(h.schedule().requestedEndTime,'11:15');assert.equal(h.schedule().excludeBookingId,'current');});
test('unavailable working hours reject the proposal',async()=>assert.equal((await setup({available:false}).run()).isValid,false));
test('reported previous delay prevents an impossible journey',async()=>{const h=setup({previous:{scheduledEndTime:'2035-01-01T09:00:00+05:30',delayInfo:{expectedEndTime:'2035-01-01T09:45:00+05:30'},location:{lat:1,lng:2}}});assert.equal((await h.run()).isValid,false);});
test('actual finish takes priority over the previous scheduled finish',async()=>{const h=setup({previous:{scheduledEndTime:'2035-01-01T11:00:00+05:30',actualEndTime:'2035-01-01T09:00:00+05:30',location:{lat:1,lng:2}}});assert.equal((await h.run()).isValid,true);});
test('travel to the next booking must fit after job and buffer',async()=>{assert.equal((await setup({next:{scheduledStartTime:'2035-01-01T11:25:00+05:30',location:{lat:1,lng:2}}}).run()).isValid,false);});
test('missing coordinates are disclosed rather than described as verified',async()=>{const result=await setup({previous:{scheduledEndTime:'2035-01-01T09:00:00+05:30'}}).run();assert.equal(result.isValid,true);assert.equal(result.warnings.length,1);});
