import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { dueStartReminder, WAITING_TO_START } from '../src/services/bookingStartPolicy.js';
const source = fs.readFileSync(new URL('../src/services/bookingReminderService.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/export /g,'');
function setup() {
 const jobs=new Map(), sent=[];
 const start=new Date('2030-01-01T09:00:00+05:30');
 const booking={_id:'b',providerId:'p',seekerId:'s',bookingStatus:'CONFIRMED',scheduledStartTime:start,actualStartTime:null,timeline:[]};
 const delivery={
  updateOne:async(q,u)=>{if(!jobs.has(q._id)&&u.$setOnInsert)jobs.set(q._id,{_id:q._id,...u.$setOnInsert});if(u.$set)Object.assign(jobs.get(q._id),u.$set)},
  findOneAndUpdate:async(q,u)=>{const item=[...jobs.values()].find(x=>!x.deliveredAt&&+x.retryAt<=+q.retryAt.$lte&&+x.leaseUntil<=+q.leaseUntil.$lte);if(item)Object.assign(item,u.$set);return item},
 };
 class Schema{};Schema.Types={ObjectId:String,Mixed:Object};
 const context={ Date,console,Promise, dueStartReminder,WAITING_TO_START, mongoose:{Schema,model:()=>delivery}, Booking:{
  find:q=>({cursor:async function*(){if(q.bookingStatus==='EXPIRED'?booking.bookingStatus==='EXPIRED':WAITING_TO_START.includes(booking.bookingStatus)&&!booking.actualStartTime)yield booking}}),
  findById:async()=>booking,
  findOneAndUpdate:async(q,u)=>{if(!WAITING_TO_START.includes(booking.bookingStatus)||booking.actualStartTime)return null;Object.assign(booking,u.$set);booking.timeline.push(u.$push.timeline);return booking},
 },publishLifecycleNotification:async p=>{sent.push(p);return true},setInterval,clearInterval};
 vm.runInNewContext(source+'\nthis.run=processBookingReminders;',context);
 return {context,booking,jobs,sent,at:m=>new Date(+start+m*60000)};
}
test('repeated scheduler scans deliver each stage once per participant',async()=>{
 const x=setup();await x.context.run(x.at(-30));await x.context.run(x.at(-29));assert.equal(x.sent.length,2);
 await x.context.run(x.at(0));await x.context.run(x.at(15));await x.context.run(x.at(46));await x.context.run(x.at(47));
 assert.equal(x.sent.length,8);assert.equal(x.booking.bookingStatus,'EXPIRED');assert.equal(x.booking.timeline.length,1);
 assert.equal(new Set(x.sent.map(p=>p.eventId)).size,8);
});
test('failed notification is retried with the same event identity',async()=>{
 const x=setup();x.context.publishLifecycleNotification=async()=>false;
 await x.context.run(x.at(-30));assert.equal([...x.jobs.values()].filter(j=>j.deliveredAt).length,0);
 x.context.publishLifecycleNotification=async p=>{x.sent.push(p);return true};
 await x.context.run(x.at(-28));assert.equal(x.sent.length,2);assert.equal(x.jobs.size,2);
});
test('starting work suppresses queued reminders and prevents expiry',async()=>{
 const x=setup();x.context.publishLifecycleNotification=async()=>false;await x.context.run(x.at(-30));
 x.booking.actualStartTime=x.at(-20);x.booking.bookingStatus='IN_PROGRESS';
 x.context.publishLifecycleNotification=async p=>{x.sent.push(p);return true};await x.context.run(x.at(46));
 assert.equal(x.sent.length,0);assert.equal(x.booking.bookingStatus,'IN_PROGRESS');
});
