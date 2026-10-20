const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const files = ['Seeker_Service/utils/notificationOutbox.js', 'Provider_Service/Backend/utils/notificationOutbox.js', 'ServiceCoordinationService/src/utils/notificationOutbox.js'];
const root = path.join(__dirname, '../..');
const text = fs.readFileSync(path.join(root, files[0]), 'utf8');
const source = text.replace(/^import .*;\n/gm, '').replace(/export /g, '');
const event = { eventId: 'post:p:available:u', recipientId: 'seeker', role: 'Seeker', title: 'Provider available', message: 'Review their response', type: 'provider_available' };
function setup() {
  const rows = new Map(), delivered = [], env = { NODE_ENV: 'production' };
  let fail = null, failStorage = false;
  function Schema() {} Schema.Types = { Mixed: Object }; Schema.prototype.index = () => {};
  const store = {
    updateOne: async (filter, update, options) => {
      if (failStorage) throw new Error("storage unavailable");
      let row = rows.get(filter._id);
      if (filter.leaseUntil && row?.leaseUntil !== filter.leaseUntil) return;
      if (!row && options?.upsert) { row = { _id: filter._id, ...update.$setOnInsert }; rows.set(filter._id, row); }
      if (row && update.$set) Object.assign(row, update.$set);
    },
    findOneAndUpdate: async (filter, update) => {
      const row = [...rows.values()].find(r => r.state === filter.state && +r.nextAttemptAt <= +filter.nextAttemptAt.$lte && +r.leaseUntil <= +filter.leaseUntil.$lte);
      if (!row) return null;
      Object.assign(row, update.$set); row.attempts += update.$inc.attempts;
      return { ...row };
    },
    countDocuments: async filter => [...rows.values()].filter(row => row.state === filter.state).length,
  };
  const mongoose = { Schema, models: {}, model: () => store, connection: { readyState: 1 } };
  const context = { mongoose, axios: { post: async (url, payload, options) => { if (fail) throw fail; delivered.push({ url, payload, options }); } }, process: { env }, Date, Math, Number, String, Buffer, console: { warn() {} }, setInterval: () => ({ unref() {} }), timingSafeEqual: require('node:crypto').timingSafeEqual };
  vm.runInNewContext(source + '\nthis.api = { enqueueLifecycleNotification, processNotificationOutbox, notificationDeliveryConfig, notificationHealthHandler, startNotificationOutboxWorker };', context);
  return { ...context.api, env, rows, delivered, mongoose, setFailure(error) { fail = error; }, failStorage() { failStorage = true; } };
}
const flush = async () => { for (let i=0;i<5;i++) await new Promise(resolve => setImmediate(resolve)); };
test('all container-contained copies of the delivery worker stay identical', () => { for (const f of files) assert.equal(fs.readFileSync(path.join(root,f),'utf8'), text); });
test('missing production credentials retain the event; configuring them later drains the pending queue', async () => {
  const x=setup(); assert.equal(await x.enqueueLifecycleNotification(event),true); await flush();
  assert.equal(x.rows.get(event.eventId).state,'PENDING'); assert.equal(x.delivered.length,0);
  x.env.NOTIFICATION_SERVICE_SECRET='test-secret'; await x.processNotificationOutbox();
  assert.equal(x.delivered.length,1); assert.equal(x.rows.get(event.eventId).state,'DELIVERED');
  assert.equal(x.delivered[0].url,'https://r26-auth-service.onrender.com/internal/notifications');
});
test('timeouts and unauthorized credentials stay retryable; retries reuse the stable event ID', async () => {
  for (const failure of [{code:'ECONNABORTED'}, {response:{status:401}}]) {
    const x=setup(); x.env.NOTIFICATION_SERVICE_SECRET='test'; x.setFailure(failure);
    await x.enqueueLifecycleNotification(event); await flush();
    const row=x.rows.get(event.eventId); assert.equal(row.state,'PENDING'); assert.ok(+row.nextAttemptAt>Date.now());
    x.setFailure(null); await x.processNotificationOutbox(new Date(Date.now()+600000));
    assert.equal(row.state,'DELIVERED'); assert.equal(x.delivered[0].payload.eventId,event.eventId);
    await x.enqueueLifecycleNotification(event); await flush(); assert.equal(x.delivered.length,1);
  }
});
test('expired leases recover interrupted delivery and invalid payloads are retained for investigation', async () => {
  const x=setup(); await x.enqueueLifecycleNotification(event); await flush();
  const row=x.rows.get(event.eventId); row.leaseUntil=new Date(Date.now()-1000); x.env.NOTIFICATION_SERVICE_SECRET='test';
  x.setFailure({response:{status:400}}); await x.processNotificationOutbox();
  assert.equal(row.state,'FAILED'); assert.equal(row.expiresAt,undefined);
});
test('outbox storage failure reports failed handoff instead of claiming delivery', async () => {
  const x=setup(); x.failStorage();
  assert.equal(await x.enqueueLifecycleNotification(event),false); assert.equal(x.rows.size,0); assert.equal(x.delivered.length,0);
});
test('health diagnostics require the shared service key and expose counts without credentials', async () => {
  const x=setup(); x.env.NOTIFICATION_SERVICE_SECRET='test'; x.startNotificationOutboxWorker();
  const call=async secret=>{ let status=200,body;const res={status(n){status=n;return this},json(value){body=value;return this}};await x.notificationHealthHandler({get:()=>secret},res);return {status,body};};
  assert.equal((await call('wrong')).status,401);
  const result=await call('test');assert.equal(result.status,200);assert.equal(result.body.workerStarted,true);assert.equal(JSON.stringify(result.body).includes('test'),false);
});
