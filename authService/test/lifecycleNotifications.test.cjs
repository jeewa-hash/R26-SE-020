const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function loadRoute() {
  let handler;
  const created = [], emitted = [];
  const models = Object.fromEntries(['Provider', 'Seeker'].map(role => [role, { create: async data => {
    created.push({ role, ...data });
    return { toObject: () => data };
  } }]));
  const context = { module: { exports: {} }, Buffer, process: { env: { NOTIFICATION_SERVICE_SECRET: 'test-secret' } }, require: name => {
    if (name === 'express') return { Router: () => ({ post: (_, fn) => { handler = fn; } }) };
    if (name === 'mongoose') return { isValidObjectId: id => /^[a-f0-9]{24}$/.test(id || '') };
    if (name.includes('ProviderNotification')) return models.Provider;
    if (name.includes('SeekerNotification')) return models.Seeker;
    return require(name);
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../routes/lifecycleNotifications.js'), 'utf8'), context);
  return { created, emitted, models, call: async (body, secret = 'test-secret') => {
    let status = 200;
    const res = { status: code => { status = code; return res; }, json: body => ({ status, body }) };
    return handler({ body, get: () => secret, app: { get: () => ({ to: room => ({ emit: (event, data) => emitted.push({ room, event, data }) }) }) } }, res);
  }};
}
const payload = { recipientId: '0123456789abcdef01234567', role: 'Seeker', eventId: 'booking:1:complete', type: 'booking', title: 'Completed', message: 'Work finished' };
test('service credentials are required; invalid recipients cannot persist or emit', async () => {
  const api = loadRoute();
  assert.equal((await api.call(payload, '')).status, 401);
  assert.equal((await api.call({ ...payload, role: 'Admin' })).status, 400);
  assert.equal(api.created.length, 0);
  assert.equal(api.emitted.length, 0);
});
test('seeker and provider notifications persist in their respective inbox and only emit to recipient room', async () => {
  const api = loadRoute();
  assert.equal((await api.call(payload)).status, 201);
  assert.equal((await api.call({ ...payload, role: 'ServiceProvider' })).status, 201);
  assert.equal(api.created[0].seekerId, payload.recipientId);
  assert.equal(api.created[1].providerId, payload.recipientId);
  assert.ok(api.emitted.every(e => e.room === payload.recipientId && e.event === 'notification'));
});
test('duplicate events succeed without emitting twice', async () => {
  const api = loadRoute();
  api.models.Seeker.create = async () => { throw Object.assign(new Error(), { code: 11000 }); };
  assert.equal((await api.call(payload)).body.duplicate, true);
  assert.equal(api.emitted.length, 0);
});
test('authenticated sockets cannot subscribe to another account and support multiple devices', () => {
  let middleware, connect;
  const server = { use: fn => { middleware = fn; }, on: (_, fn) => { connect = fn; } };
  const context = { module: { exports: {} }, process: { env: { JWT_SECRET: 'test' } }, require: name => {
    if (name === 'socket.io') return { Server: function () { return server; } };
    if (name === 'jsonwebtoken') return { verify: token => {
      if (token !== 'valid') throw new Error();
      return { user: { id: payload.recipientId, role: 'Seeker' } };
    }};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/socket.js'), 'utf8'), context);
  context.module.exports.init({});
  let denied;
  middleware({ handshake: { auth: {} } }, error => { denied = error; });
  assert.ok(denied);
  for (let i = 0; i < 2; i++) {
    const rooms = [], handlers = {};
    const socket = { handshake: { auth: { token: 'valid' } }, join: room => rooms.push(room), on: (name, fn) => { handlers[name] = fn; } };
    middleware(socket, error => assert.equal(error, undefined));
    connect(socket);
    handlers.join('another-user');
    handlers.join_notification_room('admin_room');
    assert.deepEqual(rooms, [payload.recipientId]);
  }
});
test('booking saves notify both participants only for lifecycle or readiness changes', async () => {
  const hooks = {}, published = [];
  function Schema() {}
  Schema.Types = { ObjectId: String };
  Schema.prototype.pre = (event, fn) => { hooks.pre = fn; };
  Schema.prototype.post = (event, fn) => { hooks.post = fn; };
  Schema.prototype.index = () => {};
  const context = { mongoose: { Schema, model: () => ({}) }, publishLifecycleNotification: async data => published.push(data) };
  const source = fs.readFileSync(path.join(__dirname, '../../ServiceCoordinationService/src/models/Booking.js'), 'utf8')
    .replace(/^import .*;\n/gm, '').replace(/export default mongoose.model[^\n]+/, '').replace(/export /g, '');
  vm.runInNewContext(source, context);
  const doc = { _id: 'booking-id', providerId: 'provider', seekerId: 'seeker', updatedAt: new Date(), bookingStatus: 'COMPLETED', $locals: {}, isNew: false, isModified: field => field === 'bookingStatus' };
  hooks.pre.call(doc);
  await hooks.post(doc);
  assert.equal(published.length, 2);
  assert.deepEqual(published.map(n => n.role), ['ServiceProvider', 'Seeker']);
  assert.ok(published.every(n => n.metadata.status === 'COMPLETED' && n.metadata.bookingId === 'booking-id'));
  doc.isModified = () => false;
  hooks.pre.call(doc);
  await hooks.post(doc);
  assert.equal(published.length, 2);
  doc.providerReadyConfirmed = true;
  doc.isModified = field => field === 'providerReadyConfirmed';
  hooks.pre.call(doc);
  await hooks.post(doc);
  assert.equal(published.length, 4);
  assert.ok(published.slice(2).every(n => n.metadata.status === 'READY'));
});

test('reschedule confirmation notifies both participants with the new appointment', async () => {
  const published = [];
  function Schema() {}
  Schema.Types = { ObjectId: String };
  Schema.prototype.pre = () => {};
  Schema.prototype.post = () => {};
  Schema.prototype.index = () => {};
  const context = { mongoose: { Schema, model: () => ({}) }, publishLifecycleNotification: async payload => published.push(payload) };
  const source = fs.readFileSync(path.join(__dirname, '../../ServiceCoordinationService/src/models/Booking.js'), 'utf8').replace(/^import .*;\n/gm, '').replace(/export default mongoose.model[^\n]+/, '').replace(/export /g, '');
  vm.runInNewContext(source, context);
  await context.notifyBookingLifecycle({ _id: 'booking', providerId: 'provider', seekerId: 'seeker', scheduledStartTime: '2030-01-01T03:30:00.000Z', updatedAt: new Date() }, 'RESCHEDULED');
  assert.equal(published.length, 2);
  assert.deepEqual(published.map(row => row.role), ['ServiceProvider', 'Seeker']);
  for (const row of published) {
    assert.equal(row.title, 'New service time confirmed');
    assert.match(row.message, /9:00 am/i);
    assert.equal(row.metadata.bookingId, 'booking');
    assert.equal(row.metadata.status, 'RESCHEDULED');
    assert.equal(row.metadata.scheduledStartTime, '2030-01-01T03:30:00.000Z');
  }
});
