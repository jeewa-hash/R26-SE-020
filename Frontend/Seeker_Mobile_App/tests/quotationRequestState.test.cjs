const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/quotationRequestState.js'), 'utf8').replace(/export /g, '') + '\nthis.api = { quotationRequestKey, quotationRequestKeys };', ctx);
const { quotationRequestKey: key, quotationRequestKeys: keys } = ctx.api;
test('persisted requests match populated provider references and their own session', () => {
  const requested = keys([{ providerId: { _id: 'p' }, sessionId: 'AD-1' }]);
  assert.equal(requested.has(key('p', 'AD-1')), true);
  assert.equal(requested.has(key('p', 'AD-2')), false);
  assert.equal(requested.has(key('another-provider', 'AD-1')), false);
});
test('every existing request remains requested regardless of lifecycle status', () => {
  for (const status of ['pending', 'quoted', 'accepted', 'rejected', 'cancelled', 'expired']) assert.ok(keys([{ providerId: 'p', sessionId: 's', status }]).has(key('p', 's')));
});
test('repeated snapshots do not duplicate request state and unrelated records do not block actions', () => {
  assert.equal(keys([{ providerId: 'p', sessionId: 's' }, { providerId: 'p', sessionId: 's' }, { providerId: 'p' }]).size, 1);
});
