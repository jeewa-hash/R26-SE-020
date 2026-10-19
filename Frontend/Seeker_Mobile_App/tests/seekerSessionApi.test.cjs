const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
function load(responses) {
  const urls = [];
  const ctx = { CONFIG: { COORDINATION_SERVICE_URL: 'https://coordination', SEEKER_SERVICE_URL: 'https://seeker', PROVIDER_SERVICE_API_URL: 'https://provider' }, buildAuthHeaders: async () => ({ Authorization: 'Bearer test' }), fetchSeekerWithTimeout: async (url, options) => {
    urls.push(url); assert.equal(options.headers.Authorization, 'Bearer test');
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return { ok: response.status < 400, status: response.status, json: async () => response.body };
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../screens/IT22129376/services/seekerSessionApi.js'), 'utf8').replace(/^import .*;\n/gm, '').replace(/export /g, '') + '\nthis.api = { getSeekerBookings, getSeekerRequestQuotations, getProviderQuotationsForSeeker };', ctx);
  return { ...ctx.api, urls };
}
test('a successful empty inbox is different from unavailable or malformed data', async () => {
  const api = load([{ status: 200, body: { requests: [] } }, { status: 503, body: { message: 'Service offline' } }, { status: 200, body: {} }]);
  assert.equal((await api.getSeekerRequestQuotations('s')).requests.length, 0);
  await assert.rejects(api.getSeekerRequestQuotations('s'), /Service offline/);
  await assert.rejects(api.getSeekerRequestQuotations('s'), /incomplete information/);
});
test('booking reads fall back to the explicit owner route only when /me does not exist', async () => {
  const api = load([{ status: 404, body: {} }, { status: 200, body: { data: [{ _id: 'b' }] } }]);
  assert.equal((await api.getSeekerBookings('s')).bookings[0]._id, 'b');
  assert.deepEqual(api.urls, ['https://coordination/bookings/seeker/me', 'https://coordination/bookings/seeker/s']);
});
test('authentication and connection failures are not hidden by alternate endpoint requests', async () => {
  for (const failure of [{ status: 401, body: { message: 'Sign in again' } }, new Error('Timeout')]) {
    const api = load([failure]);
    await assert.rejects(api.getSeekerBookings('s'));
    assert.equal(api.urls.length, 1);
  }
});
