const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../controllers/postController.js'), 'utf8');
const handler = source.slice(source.indexOf('export const applyPost'), source.indexOf('export const getPostResponses')).replace('export const applyPost', 'this.applyPost');
async function run(owner = 'seeker', provider = 'provider') {
  const events = []; let saved = false; let status;
  const post = { _id: 'post', userId: owner, appliedBy: [], save: async () => { saved = true; }, toObject() { return { ...this }; } };
  const context = { Post: { findById: async () => post }, getUserById: async () => ({}), buildUserInfo: () => ({ name: 'Provider Name' }), getViewerId: () => provider, sanitizePost: p => p, console, publishLifecycleNotification: async e => { assert.ok(saved); events.push(e); } };
  vm.runInNewContext(handler, context);
  const res = { status(n) { status = n; return this; }, json() {} };
  await context.applyPost({ params: { id: 'post' }, body: { providerId: provider } }, res);
  assert.equal(status, 200);
  return events;
}
test('saved provider interest notifies post owner with stable duplicate-safe identity', async () => {
  const [event] = await run();
  assert.equal(event.recipientId, 'seeker');
  assert.equal(event.type, 'provider_available');
  assert.equal(event.metadata.postId, 'post');
  assert.equal(event.eventId, 'post:post:available:provider');
});
test('responding to own post does not notify oneself', async () => {
  assert.equal((await run('provider')).length, 0);
});
