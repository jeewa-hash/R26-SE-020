const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const vm = require('node:vm');
const express = require('express');
const jwt = require('jsonwebtoken');
const { io: client } = require('../../Frontend/Seeker_Mobile_App/node_modules/socket.io-client');

test('local HTTP hub delivers every lifecycle state to both authenticated sockets and deduplicates retries', async t => {
  const originalJwt = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'local-transport-test';
  const app = express(); app.use(express.json());
  const server = http.createServer(app);
  const io = require('../utils/socket').init(server); app.set('socketio', io);
  const stored = new Map();
  const model = { create: async data => {
    if (stored.has(data.eventId)) throw Object.assign(new Error('Duplicate'), { code: 11000 });
    const row = { _id: String(stored.size + 1), ...data }; stored.set(data.eventId, row);
    return { toObject: () => row };
  }};
  const context = { module: { exports: {} }, Buffer, process: { env: { NOTIFICATION_SERVICE_SECRET: 'test-service-key' } }, require: name => name.includes('Notification') ? model : require(name) };
  vm.runInNewContext(fs.readFileSync(require.resolve('../routes/lifecycleNotifications'), 'utf8'), context);
  app.use('/internal/notifications', context.module.exports);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const received = [[], []], sockets = [];
  t.after(async () => { sockets.forEach(s => s.disconnect()); await new Promise(resolve => io.close(resolve)); process.env.JWT_SECRET = originalJwt; });
  const roles = ['Seeker', 'ServiceProvider'];
  const ids = ['0123456789abcdef01234567', '1123456789abcdef01234567'];
  for (let i = 0; i < 2; i++) {
    const socket = client(origin, { transports: ['websocket'], auth: { token: jwt.sign({ id: ids[i], role: roles[i] }, process.env.JWT_SECRET) } });
    sockets.push(socket); socket.on('notification', row => received[i].push(row));
    await new Promise((resolve, reject) => { socket.once('connect', resolve); socket.once('connect_error', reject); });
  }
  const states = ['REQUESTED', 'QUOTED', 'ACCEPTED', 'CONFIRMED', 'READY', 'ON_THE_WAY', 'IN_PROGRESS', 'DELAY_REPORTED', 'RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED', 'EXPIRED'];
  for (const status of states) for (let i = 0; i < 2; i++) {
    const payload = { recipientId: ids[i], role: roles[i], eventId: `${status}:${ids[i]}`, title: status, message: 'Local transport test', type: 'booking', metadata: { status } };
    for (let retry = 0; retry < 2; retry++) {
      const response = await fetch(`${origin}/internal/notifications`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-notification-secret': 'test-service-key' }, body: JSON.stringify(payload) });
      assert.ok(response.ok);
    }
  }
  await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(stored.size, states.length * 2);
  for (let i = 0; i < 2; i++) {
    assert.deepEqual(received[i].map(row => row.metadata.status), states);
    assert.ok(received[i].every(row => String(row.seekerId || row.providerId) === ids[i]));
  }
});
