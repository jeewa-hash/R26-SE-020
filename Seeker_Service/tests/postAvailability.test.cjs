const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../controllers/postController.js'), 'utf8');
const handler = source.slice(source.indexOf('export const applyPost'), source.indexOf('export const getPostResponses')).replace('export const applyPost', 'this.applyPost');
async function run(owner = 'seeker', provider = 'provider', attempts = 1, clearApplication = false, legacy = false) {
  const events = []; let saved = false; let status;
  const post = { _id: 'post', userId: owner, appliedBy: legacy ? [{ applicantId: provider }] : [], save: async () => { saved = true; }, toObject() { return { ...this }; } };
  let sequence = 0;
  const context = { randomUUID: () => `application-${++sequence}`, Post: { findById: async () => post }, getUserById: async () => ({}), buildUserInfo: () => ({ name: 'Provider Name' }), getViewerId: () => provider, sanitizePost: p => p, console, publishLifecycleNotification: async e => { assert.ok(saved); events.push(e); } };
  vm.runInNewContext(handler, context);
  const res = { status(n) { status = n; return this; }, json() {} };
  for (let i = 0; i < attempts; i++) {
    if (i && clearApplication) post.appliedBy = [];
    await context.applyPost({ params: { id: 'post' }, body: { providerId: provider } }, res);
  }
  assert.equal(status, 200);
  return events;
}
test('saved provider interest notifies post owner with stable duplicate-safe identity', async () => {
  const [event] = await run();
  assert.equal(event.recipientId, 'seeker');
  assert.equal(event.type, 'provider_available');
  assert.equal(event.metadata.postId, 'post');
  assert.equal(event.eventId, 'post:post:available:provider:application-1');
});
test('responding to own post does not notify oneself', async () => {
  assert.equal((await run('provider')).length, 0);
});

test('retrying an existing application retains the same event identity', async () => {
  const events = await run('seeker', 'provider', 2);
  assert.equal(events.length, 2);
  assert.equal(events[0].eventId, events[1].eventId);
});
test('reapplying after removing appliedBy creates a fresh notification identity', async () => {
  const events = await run('seeker', 'provider', 2, true);
  assert.notEqual(events[0].eventId, events[1].eventId);
});
test('legacy applications retain the previously delivered event identity', async () => {
  const events = await run('seeker', 'provider', 2, false, true);
  assert.equal(events[0].eventId, 'post:post:available:provider');
  assert.equal(events[0].eventId, events[1].eventId);
});
