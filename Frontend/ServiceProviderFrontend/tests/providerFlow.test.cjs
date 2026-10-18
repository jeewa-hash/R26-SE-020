const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const loadState = () => import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(root, 'utils/providerFlowState.js'), 'utf8')));

test('booking controls match backend lifecycle states', async () => {
  const { bookingActions } = await loadState();
  const confirmed = bookingActions({ bookingStatus: 'CONFIRMED' });
  assert.equal(confirmed.ready, true); assert.equal(confirmed.travel, true); assert.equal(confirmed.start, true);
  assert.equal(confirmed.complete, false);
  assert.equal(bookingActions({ bookingStatus: 'CONFIRMED', providerReadyConfirmed: true }).ready, false);
  for (const status of ['IN_PROGRESS','DELAY_REPORTED']) {
    const a = bookingActions({ bookingStatus: status }); assert.equal(a.delay,true); assert.equal(a.complete,true); assert.equal(a.start,false);
  }
  for (const status of ['COMPLETED','CANCELLED','EXPIRED']) {
    const a = bookingActions({ bookingStatus: status }); assert.equal(a.closed,true);
    for (const action of ['ready','travel','start','delay','complete','reschedule']) assert.equal(a[action],false);
  }
  assert.equal(bookingActions({ bookingStatus: 'ON_THE_WAY' }).start,true);
  assert.equal(bookingActions({ bookingStatus: 'RESCHEDULED' }).start,true);
});
test('reschedule-pending and submitted requests cannot open a new quote', async () => {
  const { canQuoteRequest } = await loadState();
  assert.equal(canQuoteRequest({status:'pending'}),true);
  assert.equal(canQuoteRequest({status:'pending',rescheduleRequestedAt:'2026-10-18'}),false);
  for(const status of ['quoted','accepted','rejected','cancelled','expired']) assert.equal(canQuoteRequest({status}),false);
});
test('accepted quotes link only to their own confirmed booking', async () => {
  const { bookingForQuote } = await loadState();
  const bookings = [{_id:'b1',externalQuotationId:'q1'}, {_id:'b2',externalQuotationId:{_id:'q2'}}];
  assert.equal(bookingForQuote(bookings,{_id:'q2'})._id,'b2');
  assert.equal(bookingForQuote(bookings,{_id:'other'}),undefined);
  assert.equal(bookingForQuote(bookings,{}),undefined);
});
test('web confirmations run callbacks only after confirmation; nested navigation reaches root', async () => {
  const { default: vm } = await import('node:vm');
  const source = fs.readFileSync(path.join(root,'utils/providerFlowUi.js'),'utf8').replace("import { Alert, Platform } from 'react-native';", '').replace(/export const /g,'const ') + '\nthis.helpers = {confirm, openProviderTab, openProviderInbox};';
  let accepted=false, invoked=0;
  const context={Platform:{OS:'web'},Alert:{alert:()=>assert.fail('native dialog on web')},window:{confirm:()=>accepted,alert:()=>{}}};
  vm.runInNewContext(source,context);
  context.helpers.confirm('Start','Start?',()=>invoked++); assert.equal(invoked,0);
  accepted=true; context.helpers.confirm('Start','Start?',()=>invoked++); assert.equal(invoked,1);
  let destination;
  const rootNav={navigate:(...args)=>destination=args};
  const child={getParent:()=>rootNav};
  context.helpers.openProviderTab(child,'Bookings',{tab:'Quotes'});
  assert.equal(destination[0],'Main'); assert.equal(destination[1].screen,'Bookings'); assert.equal(destination[1].params.tab,'Quotes');
});
