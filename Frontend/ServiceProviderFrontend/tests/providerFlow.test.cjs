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

const loadSessions = () => import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(root, 'utils/providerSessions.js'), 'utf8')));
test('one service session joins request, quote and booking without duplicate cards', async () => {
  const { buildProviderSessions } = await loadSessions();
  const rows = buildProviderSessions([{_id:'r',sessionId:'session-1',status:'quoted'}], [{_id:'q',providerRequestId:'r',status:'ACCEPTED'}], [{_id:'b',externalQuotationId:'q',bookingStatus:'CONFIRMED'}]);
  assert.equal(rows.length,1); assert.equal(rows[0].guidance.kind,'booking'); assert.equal(rows[0].guidance.group,'booked');
  assert.equal(rows[0].guidance.step,2);
});
test('accepted quotation is waiting, never a confirmed booking', async () => {
  const { sessionGuidance } = await loadSessions();
  const state = sessionGuidance({quotation:{status:'ACCEPTED'}});
  assert.equal(state.kind,'quotation'); assert.equal(state.group,'waiting'); assert.equal(state.step,1); assert.equal(state.owner,'Seeker');
});
test('reschedule waiting, validation attention and completed sessions explain the next owner', async () => {
  const { sessionGuidance } = await loadSessions();
  assert.equal(sessionGuidance({request:{status:'pending',rescheduleRequestedAt:'now'}}).owner,'Seeker');
  const conflict = sessionGuidance({quotation:{status:'SENT',coordinationStatus:'RESCHEDULE_REQUIRED'}});
  assert.equal(conflict.owner,'You'); assert.equal(conflict.group,'attention');
  const done = sessionGuidance({booking:{bookingStatus:'COMPLETED'}});
  assert.equal(done.group,'closed'); assert.equal(done.step,3); assert.equal(done.owner,'No action');
});
test('unrelated requests sharing a post are separate; repeated booking snapshots are deduplicated', async () => {
  const { buildProviderSessions } = await loadSessions();
  const sessions = buildProviderSessions([{_id:'r1',postId:'p'},{_id:'r2',postId:'p'}],[],[{_id:'b',bookingStatus:'CONFIRMED'},{_id:'b',bookingStatus:'IN_PROGRESS',updatedAt:'2026-10-18'}]);
  assert.equal(sessions.length,3); assert.equal(sessions.filter(s=>s.booking).length,1);
  assert.equal(sessions.find(s=>s.booking).guidance.group,'working');
});
test('action-needed sessions sort before waiting and history', async () => {
  const { buildProviderSessions } = await loadSessions();
  const sessions = buildProviderSessions([{_id:'new',status:'pending'}],[{_id:'q',status:'ACCEPTED'}],[{_id:'b',bookingStatus:'COMPLETED'}]);
  assert.deepEqual(sessions.map(s=>s.guidance.group),['attention','waiting','closed']);
});

test('native cancellation caused by a timeout becomes a useful retry message', async () => {
  const http = await import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(root,'utils/providerHttp.js'),'utf8')));
  assert.equal(http.PROVIDER_REQUEST_TIMEOUT_MS,15000);
  const previous = global.fetch;
  global.fetch = async (_, options) => new Promise((resolve,reject) => {
    options.signal.addEventListener('abort', () => reject(new Error('FetchRequestCanceledException')));
  });
  try { await assert.rejects(http.fetchProviderWithTimeout('http://test',{},10), error => error.code === 'REQUEST_TIMEOUT' && /backend is running/.test(error.message)); }
  finally { global.fetch = previous; }
});

test('simultaneous bookings and ongoing reads share one request without /ongoing', async () => {
  let source=fs.readFileSync(path.join(root,'services/providerFlowApi.js'),'utf8').replace(/import[\s\S]*?from ['"][^'"]+['"];?/g,'');
  source = `const CONFIG={COORDINATION_SERVICE_URL:'http://coordination',SEEKER_SERVICE_URL:'http://seeker',PROVIDER_SERVICE_API_URL:'http://provider'}; const IP_ADDRESS='test'; const PROVIDER_REQUEST_TIMEOUT_MS=15000; const AsyncStorage={getItem:async()=>null}; const Linking={}; const Platform={OS:'web'}; const fetchWithTimeout=(...args)=>globalThis.__providerFetch(...args);\n` + source;
  let calls=0;
  global.__providerFetch=async url=>{calls++;assert.equal(url,'http://coordination/bookings/provider/me');return {ok:true,json:async()=>({data:[{_id:'b',bookingStatus:'IN_PROGRESS'}]})};};
  try {
    const api=await import('data:text/javascript,'+encodeURIComponent(source));
    const [all,active]=await Promise.all([api.getProviderBookings('p'),api.getProviderOngoingBookings('p')]);
    assert.equal(calls,1);assert.equal(all.length,1);assert.equal(active.length,1);
    await api.getProviderBookings('p');assert.equal(calls,2); // refresh is not a stale cache
  } finally {delete global.__providerFetch;}
});
