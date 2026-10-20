import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/controllers/bookingController.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('export const markBookingOnTheWay'),source.indexOf('export const startBooking')).replace('export const markBookingOnTheWay','this.markBookingOnTheWay');
function setup(status='CONFIRMED') {
 const booking={_id:'b',providerId:'p',bookingStatus:status,scheduledStartTime:new Date(Date.now()+24*3600000),actualStartTime:null,timeline:[]};
 let writes=0,notifications=0,conflict=false;
 const context={Date,getComparableId:String,getStartWindowError:()=>{throw Error('Travel must not check start time')},expireBookingIfMissed:()=>{throw Error('Travel must not enforce a time window')},notifyBookingLifecycle:async()=>notifications++,Booking:{findById:async()=>booking,findOneAndUpdate:async(filter,update)=>{
  if(conflict)return null;assert.ok(filter.bookingStatus.$in.includes(booking.bookingStatus));assert.equal(filter.actualStartTime,null);
  writes++;Object.assign(booking,update.$set);booking.timeline.push(update.$push.timeline);return booking;
 }}};
 vm.runInNewContext(handler,context);
 async function run(id='p') {let code,body;const res={status(n){code=n;return this},json(data){body=data;return this}};await context.markBookingOnTheWay({params:{bookingId:'b'},user:{id}},res);return{code,body};}
 return{booking,run,get writes(){return writes},get notifications(){return notifications},conflict(){conflict=true}};
}
test('travel is allowed well before the start window for confirmed and rescheduled jobs',async()=>{
 for(const status of ['CONFIRMED','RESCHEDULED']){const x=setup(status);assert.equal((await x.run()).code,200);assert.equal(x.booking.bookingStatus,'ON_THE_WAY');assert.equal(x.notifications,1);}
});
test('travel has no clock check, remains idempotent, and does not create a duplicate event',async()=>{
 const x=setup();x.booking.scheduledStartTime=new Date(Date.now()-3600000);assert.equal((await x.run()).code,200);assert.equal((await x.run()).code,200);assert.equal(x.writes,1);assert.equal(x.notifications,1);
});
test('only the assigned provider can update travel; closed or started services cannot be reopened',async()=>{
 const x=setup();assert.equal((await x.run('other')).code,403);assert.equal(x.writes,0);
 for(const status of ['IN_PROGRESS','COMPLETED','CANCELLED','EXPIRED']){const y=setup(status);assert.equal((await y.run()).code,400);assert.equal(y.writes,0);}
});
test('a concurrent start or expiry cannot be overwritten by a travel update',async()=>{
 const x=setup();x.conflict();assert.equal((await x.run()).code,409);assert.equal(x.notifications,0);
});
