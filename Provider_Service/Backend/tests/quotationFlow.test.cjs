const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../../..');
const requestId = '111111111111111111111111';
const future = new Date(Date.now() + 86400000).toISOString();
function load(file, names, dependencies) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import[\s\S]*?from\s+["'][^"']+["'];\s*/gm, '').replace(/export const /g, 'const ');
  return vm.runInNewContext(source + '\n({' + names.join(',') + '})', { process: { env: {} }, console: { error() {}, warn() {}, log() {} }, ...dependencies });
}
function response() { return { code: 200, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } }; }
function quotationHarness(options = {}) {
  let saved = null;
  const calls = [];
  const request = { _id: requestId, providerId: 'provider', seekerId: 'seeker', sessionId: 'session', preferredStartTime: future, status: 'pending', detectedCategory: 'Electrical Services', detectedObject: 'Install Ceiling Fan', ...options.request };
  const dependencies = {
    mongoose: { Types: { ObjectId: { isValid: id => /^[a-f0-9]{24}$/i.test(id || '') } } },
    Quotation: { init: async () => {}, findOne: async () => options.existing || null, create: async payload => { if (options.duplicateRace) throw { code: 11000 }; saved = { _id: 'quote', ...payload }; return saved; }, findById: async () => ({ ...saved, coordinationStatus: 'CAN_ACCEPT', coordinationId: 'coordination' }) },
    publishLifecycleNotification: async () => {},
    Notification: { create: async () => ({}) }, sendRealtimeNotification() {},
    axios: { get: async url => url.endsWith('/profile') ? ({ data: { provider: { _id: options.profileId || 'provider', durationTaskProfiles: options.noExperience ? [] : [{ serviceCategory: 'Repairing', serviceType: 'Electrical Repair', taskName: 'Install Ceiling Fan', yearsExperience: 6, taskFrequencyPerMonth: 8 }] } } }) : url.endsWith('/model-tasks') ? ({ data: { data: [{ service_category: 'Repairing', service_type: 'Electrical Repair', task_name: 'Install Ceiling Fan' }] } }) : url.endsWith('/provider-task-history') ? (options.historyUnavailable ? Promise.reject(new Error('Offline')) : { data: { tasks: [], windowStart: '2026-09-19', windowEnd: '2026-10-19', unmatchedCompletedJobs: 0, source: 'Completed platform bookings in the last 30 days' } }) : ({ data: { request } }), post: async (url, payload) => { calls.push({ url, payload }); if (options.conflict && url.endsWith('validate-quotation')) throw { response: { status: 409, data: { code: 'RESCHEDULE_REQUIRED', message: 'Outside working hours' } } }; if (options.validationFailure && url.endsWith('/check')) throw new Error('Unavailable'); return { data: {} }; }, patch: async () => ({}) },
  };
  const { createQuotation } = load('Provider_Service/Backend/controllers/quotationController.js', ['createQuotation'], dependencies);
  return { async run(body = {}) { const res = response(); await createQuotation({ user: { id: 'provider' }, headers: { authorization: 'Bearer provider-token' }, app: { get: () => null }, body: { providerRequestId: requestId, price: 5000, durationTaskContext: { serviceCategory: 'Repairing', serviceType: 'Electrical Repair', taskName: 'Install Ceiling Fan' }, ...body } }, res); return res; }, saved: () => saved, calls };
}
test('one quotation uses authoritative seeker time and identity, then runs validation', async () => {
  const h = quotationHarness(); const res = await h.run({ seekerId: 'forged', externalSessionId: 'forged' });
  assert.equal(res.code, 201); assert.equal(h.saved().seekerId, 'seeker'); assert.equal(h.saved().externalSessionId, 'session'); assert.equal(h.saved().proposedStartTime, future);
  assert.equal(h.calls[0].url.endsWith('/bid-coordinations/validate-quotation'), true); assert.equal(h.calls[1].url.endsWith('/bid-coordinations/check'), true);
  assert.equal(res.body.data.coordinationStatus, 'CAN_ACCEPT');
});
for (const value of [0, -1, 'abc', Infinity]) test(`invalid price ${value} is rejected`, async () => { const h = quotationHarness(); assert.equal((await h.run({price:value})).code, 400); assert.equal(h.saved(), null); });
test('provider cannot replace the seeker start time', async () => { const h = quotationHarness(); assert.equal((await h.run({proposedStartTime: new Date(Date.now()+172800000).toISOString()})).code,400); assert.equal(h.saved(),null); });
test('provider cannot quote another provider request', async () => { const h=quotationHarness({request:{providerId:'other'}}); assert.equal((await h.run()).code,403); });
test('a second quotation for the same session is blocked', async () => { const h=quotationHarness({existing:{_id:'old-quote'}}); assert.equal((await h.run()).code,409); assert.equal(h.saved(),null); });
test('concurrent duplicate index rejection becomes 409', async () => { const h=quotationHarness({duplicateRace:true}); assert.equal((await h.run()).code,409); });
test('availability conflict blocks quotation creation', async () => { const h=quotationHarness({conflict:true}); const res=await h.run(); assert.equal(res.code,409); assert.equal(res.body.code,'RESCHEDULE_REQUIRED'); assert.equal(h.saved(),null); });
test('reschedule waiting blocks quotation creation', async () => { const h=quotationHarness({request:{rescheduleRequestedAt:future}}); assert.equal((await h.run()).code,409); assert.equal(h.saved(),null); });
test('missing or past seeker time blocks submission', async () => { for(const time of [null,'invalid','2020-01-01']) { const h=quotationHarness({request:{preferredStartTime:time}}); assert.equal((await h.run()).code,400); }});
test('coordination outage preserves one saved quote and reports pending validation', async () => { const h=quotationHarness({validationFailure:true}); const res=await h.run(); assert.equal(res.code,201); assert.equal(res.body.validationPending,true); assert.ok(h.saved()); });
function timeHarness() {
 const request={_id:requestId, providerId:'provider', seekerId:'seeker', status:'pending', rescheduleReason:'Busy',rescheduleRequestedAt:future, save:async()=>{}};
 const handlers=load('Seeker_Service/controllers/requestQuotationController.js',['requestQuotationReschedule','updateQuotationRequestedTime'],{RequestQuotation:{findById:async()=>request},mongoose:{},axios:{},publishLifecycleNotification:async()=>{}});
 return { request, async run(handler,role,id,body={}) { const res=response(); await handlers[handler]({params:{id:requestId},user:{role,id},body,headers:{}},res); return res; } };
}
test('only the seeker can choose a new requested start',async()=>{const h=timeHarness();assert.equal((await h.run('updateQuotationRequestedTime','ServiceProvider','provider',{preferredStartTime:future})).code,403);assert.equal((await h.run('updateQuotationRequestedTime','Seeker','other',{preferredStartTime:future})).code,403);const res=await h.run('updateQuotationRequestedTime','Seeker','seeker',{preferredStartTime:future});assert.equal(res.code,200);assert.equal(h.request.rescheduleRequestedAt,null);assert.equal(h.request.rescheduleReason,'');});
test('provider asks for reschedule without setting a time or price',async()=>{const h=timeHarness();const res=await h.run('requestQuotationReschedule','ServiceProvider','provider',{reason:'Not working that day',preferredStartTime:'forged',price:1});assert.equal(res.code,200);assert.equal(h.request.rescheduleReason,'Not working that day');assert.equal(h.request.preferredStartTime,undefined);assert.equal(h.request.price,undefined);});
test('closed requests cannot be rescheduled',async()=>{const h=timeHarness();h.request.status='accepted';assert.equal((await h.run('requestQuotationReschedule','ServiceProvider','provider')).code,409);assert.equal((await h.run('updateQuotationRequestedTime','Seeker','seeker',{preferredStartTime:future})).code,409);});
function scheduleHarness(options = {}) {
 const request={providerId:'provider',status:'pending',preferredStartTime:future,...options.request};
 let evaluated;
 const deps={mongoose:{},getRequestQuotationById:async()=>request,buildDurationPredictionPayload:()=>({serviceCategory:'cleaning',serviceType:'house',taskName:'clean'}),predictDuration:async()=>options.noModel?null:{predictedDurationMins:90},estimateServiceDuration:()=>({averageDurationHours:2}),evaluateBidSchedule:async args=>{evaluated=args;return {conflictDetected:Boolean(options.conflict),conflictReason:'Outside working hours',requiredWindowStart:new Date(future),requiredWindowEnd:new Date(new Date(future).getTime()+(options.overnight?86400000:3600000))};}};
 const handlers=load('ServiceCoordinationService/src/controllers/bidCoordinationController.js',['validateQuotationSchedule'],deps);
 return {async run(){const res=response();await handlers.validateQuotationSchedule({user:{id:'provider'},body:{providerRequestId:requestId}},res);return res;},evaluated:()=>evaluated};
}
test('schedule validation uses seeker time and predicted duration',async()=>{const h=scheduleHarness();assert.equal((await h.run()).code,200);assert.equal(h.evaluated().predictedDurationMins,90);assert.equal(h.evaluated().proposedStartTime.toISOString(),future);});
test('unavailable model uses existing reference duration',async()=>{const h=scheduleHarness({noModel:true});assert.equal((await h.run()).code,200);assert.equal(h.evaluated().predictedDurationMins,120);});
test('conflicting schedule instructs provider to reschedule',async()=>{const h=scheduleHarness({conflict:true});const res=await h.run();assert.equal(res.code,409);assert.equal(res.body.code,'RESCHEDULE_REQUIRED');});
test('cross-midnight work is not accepted as a single daily slot',async()=>{
 const { evaluateBidSchedule } = load('ServiceCoordinationService/src/services/scheduleEvaluationService.js',['evaluateBidSchedule'],{
  toScheduleParts: value => { const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Colombo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(value).map(p=>[p.type,p.value]));return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`}; },
  validateProviderSchedule:async()=>{throw Error('Must reject crossing days before availability lookup');},
 });
 const result=await evaluateBidSchedule({providerId:'p',proposedStartTime:'2030-01-01T23:00:00+05:30',predictedDurationMins:120,bufferMinutes:30});assert.equal(result.conflictDetected,true);
});
test('availability validation rejects another provider',async()=>{const h=scheduleHarness({request:{providerId:'other'}});assert.equal((await h.run()).code,403);});
test('changing requested time revalidates the existing quotation without changing its price', async()=>{
 const quote={_id:'quote',providerRequestId:requestId,seekerId:'seeker',price:5000,status:'SENT',save:async()=>{}};
 const {syncQuotationRequestedTime}=load('Provider_Service/Backend/controllers/quotationController.js',['syncQuotationRequestedTime'],{Quotation:{findOne:async()=>quote,findById:async()=>quote},axios:{get:async()=>({data:{request:{preferredStartTime:future}}}),post:async()=>({})}});
 const res=response();await syncQuotationRequestedTime({params:{requestId},user:{id:'seeker'}},res);
 assert.equal(res.code,200);assert.equal(quote.price,5000);assert.equal(quote.proposedStartTime.toISOString(),future);
});
test('provider cannot change a submitted quotation requested time',async()=>{
 const quote={seekerId:'seeker',status:'SENT'};
 const {syncQuotationRequestedTime}=load('Provider_Service/Backend/controllers/quotationController.js',['syncQuotationRequestedTime'],{Quotation:{findOne:async()=>quote}});
 const res=response();await syncQuotationRequestedTime({params:{requestId},user:{id:'provider'}},res);assert.equal(res.code,403);
});
test('accepted quotation times cannot be overwritten through request rescheduling',async()=>{
 const quote={seekerId:'seeker',status:'ACCEPTED'};
 const {syncQuotationRequestedTime}=load('Provider_Service/Backend/controllers/quotationController.js',['syncQuotationRequestedTime'],{Quotation:{findOne:async()=>quote}});
 const res=response();await syncQuotationRequestedTime({params:{requestId},user:{id:'seeker'}},res);assert.equal(res.code,409);
});

test('declared model inputs are persisted and included in availability preflight', async () => {
 const h=quotationHarness();const context={serviceCategory:'Repairing',serviceType:'Electrical Repair',taskName:'Install Ceiling Fan'};
 const response=await h.run({yearsExperience:6,taskFrequencyPerMonth:8,plannedTeamSize:2,durationTaskContext:context});
 assert.equal(response.code,201);assert.equal(h.saved().yearsExperience,6);assert.equal(h.saved().plannedTeamSize,2);
 const call=h.calls.find(c=>c.url.endsWith('validate-quotation'));
 assert.equal(call.payload.modelContext.yearsExperience,6);
 assert.equal(call.payload.modelContext.durationTaskContext.taskName,'Install Ceiling Fan');
 assert.equal(h.saved().durationTaskContext.taskName,'Install Ceiling Fan');
});
test('invalid numeric model inputs cannot silently become defaults',async()=>{
 for(const body of [{yearsExperience:-1},{taskFrequencyPerMonth:'abc'},{plannedTeamSize:0},{plannedTeamSize:1.5}]){const h=quotationHarness();assert.equal((await h.run(body)).code,400);assert.equal(h.saved(),null);}
});

test('saved experience and observed platform frequency are resolved automatically, team defaults to one', async () => {
 const h=quotationHarness(); assert.equal((await h.run()).code,201);
 assert.equal(h.saved().yearsExperience,6);assert.equal(h.saved().taskFrequencyPerMonth,0);assert.equal(h.saved().plannedTeamSize,1);
 assert.equal(h.saved().modelInputSources.yearsExperience,'Saved provider task profile');
 assert.equal(h.saved().taskHistorySnapshot.completedCount,0);
});
test('client task choice cannot replace authoritative request classification',async()=>{const h=quotationHarness();assert.equal((await h.run({durationTaskContext:{serviceCategory:'General',serviceType:'Fix pipeline',taskName:'Fix pipeline'}})).code,201);assert.equal(h.saved().durationTaskContext.taskName,'Install Ceiling Fan');});
test('profile identity is verified against authenticated provider',async()=>{const h=quotationHarness({profileId:'another-provider'});assert.equal((await h.run()).code,403);assert.equal(h.saved(),null);});

test('missing experience does not block a quotation and stays explicitly missing',async()=>{const h=quotationHarness({noExperience:true});assert.equal((await h.run()).code,201);assert.equal(h.saved().yearsExperience,null);assert.equal(h.saved().modelInputSources.yearsExperience,'Missing · training median');});
test('history outage cannot masquerade as zero completed jobs',async()=>{const h=quotationHarness({historyUnavailable:true});assert.equal((await h.run()).code,201);assert.equal(h.saved().taskFrequencyPerMonth,null);assert.equal(h.saved().taskHistorySnapshot.source,'Unavailable');});
test('request task auto-matches only a unique exact catalogue task',async()=>{const h=quotationHarness({request:{detectedObject:'Install Ceiling Fan'}});assert.equal((await h.run({durationTaskContext:null})).code,201);assert.equal(h.saved().durationTaskContext.taskName,'Install Ceiling Fan');const unknown=quotationHarness({request:{detectedObject:'A fan problem'}});assert.equal((await unknown.run({durationTaskContext:null})).code,201);assert.equal(unknown.saved().durationTaskContext.taskName,'A fan problem');});
test('client frequency cannot replace authoritative completed-job history',async()=>{const h=quotationHarness();assert.equal((await h.run({taskFrequencyPerMonth:999})).code,201);assert.equal(h.saved().taskFrequencyPerMonth,0);});

test('provider-post labels supply task and plumbing category automatically',async()=>{const h=quotationHarness({request:{serviceContext:{category:'plumbing',serviceType:'Full house pipe design',taskName:'Full house pipe design',source:'Provider post'}}});assert.equal((await h.run({durationTaskContext:null})).code,201);assert.equal(h.saved().durationTaskContext.serviceCategory,'Repairing');assert.equal(h.saved().durationTaskContext.serviceType,'Plumbing Repair');assert.equal(h.saved().durationTaskContext.taskName,'Full house pipe design');assert.equal(h.saved().modelInputSources.serviceCategory,'Provider post · category');});
