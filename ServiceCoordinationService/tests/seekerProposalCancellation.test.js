import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../src/controllers/bookingController.js',import.meta.url),'utf8');
const handler=source.slice(source.indexOf('export const cancelBooking'),source.indexOf('const isBookingOverdue24Hours')).replace('export const ','');
async function run(status){
 let saved=false;
 const booking={_id:'b',bookingStatus:status,pendingRescheduleId:'r',save:async()=>{saved=true}};
 const context={Date,console,Booking:{findById:async()=>booking},canAccessBooking:()=>true};
 vm.runInNewContext(handler+'\nthis.run=cancelBooking;',context);
 const res={code:200,status(n){this.code=n;return this},json(body){this.body=body;return this}};
 await context.run({params:{bookingId:'b'},user:{id:'s',role:'Seeker'},body:{reason:'Suggested time does not work'}},res);
 return {booking,res,saved};
}
test('seeker can cancel a pending reschedule without penalizing provider and pending review is cleared',async()=>{
 const x=await run('RESCHEDULE_REQUESTED');assert.equal(x.res.code,200);assert.equal(x.booking.bookingStatus,'CANCELLED');assert.equal(x.booking.pendingRescheduleId,null);assert.equal(x.booking.cancellationInfo.inquiryStatus,'NOT_REQUIRED');assert.equal(x.saved,true);
});
test('existing rules continue to prevent cancelling expired or completed bookings',async()=>{
 for(const state of ['EXPIRED','COMPLETED','CANCELLED']){const x=await run(state);assert.equal(x.res.code,400);assert.equal(x.saved,false);assert.equal(x.booking.bookingStatus,state)}
});
