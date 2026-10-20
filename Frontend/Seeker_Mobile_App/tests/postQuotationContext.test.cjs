const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../screens/PostResponsesScreen.js'), 'utf8');
const handler = source.slice(source.indexOf('  const fetchResponses = async'), source.indexOf('  // ─── ENRICH RESPONSES'));
async function load(ok = true) {
  const urls = [], events = [];
  const post = { _id: 'post-1', category: 'Plumbing', title: 'Replace kitchen tap', preferredSchedule: { date: '2026-10-21', startTime: '13:00' }, location: { address: 'Borella', lat: 6.91, lng: 79.87 } };
  const context = {
    token: 'test', postId: 'post-1', API_BASE_URL: 'http://seeker.test:6001',
    fetch: async url => { urls.push(url); return { ok, json: async () => url.includes('/responses/') ? { success: true, responses: [{ applicantId: 'provider' }] } : { success: ok, post } }; },
    setPostLoadError() {}, setQuoteModalVisible() {},
    setLoadedPost: value => events.push(['post', value]), setResponses: value => events.push(['responses', value]),
    enrichResponses: async value => value, setLoading() {}, setRefreshing() {}, console: { log() {}, warn() {}, error() {} },
  };
  vm.runInNewContext(handler + '\nthis.run = fetchResponses;', context);
  await context.run();
  return { urls, events };
}
test('notification navigation with only a post ID loads the saved plumbing context before applicants', async () => {
  const { urls, events } = await load();
  assert.equal(urls[0], 'http://seeker.test:6001/posts/post-1');
  assert.equal(urls[1], 'http://seeker.test:6001/posts/responses/post-1');
  assert.equal(events[0][0], 'post');
  assert.equal(events[0][1].category, 'Plumbing');
  assert.equal(events[0][1].title, 'Replace kitchen tap');
  assert.equal(events[0][1].preferredSchedule.startTime, '13:00');
  assert.equal(events[0][1].location.address, 'Borella');
  assert.equal(events[1][0], 'responses');
});
test('failed post lookup does not present applicants with a fabricated General service', async () => {
  const { urls, events } = await load(false);
  assert.equal(urls.length, 1);
  assert.equal(events.find(([type]) => type === 'post')[1], null);
  assert.equal(events.find(([type]) => type === 'responses')[1].length, 0);
});
