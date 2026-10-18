const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'utils/seekerNavigation.js'), 'utf8').replace(/export /g, '') + '\nthis.api = { SEEKER_TABS, seekerActiveTab, openSeekerTab };', context);
const { SEEKER_TABS: tabs, seekerActiveTab: active, openSeekerTab: open } = context.api;
test('five main tabs expose service tracking and preserve the original Bookings destination', () => {
  assert.equal(tabs.length, 5);
  assert.equal(tabs[1].routeName, 'SeekerServices');
  assert.equal(tabs.find(t => t.id === 'Bookings').routeName, 'BookingsScreen');
  const app = fs.readFileSync(path.join(root, 'App.js'), 'utf8');
  assert.match(app, /name="BookingsScreen"\s+component=\{BookingsScreen\}/);
  const registered = new Set([...app.matchAll(/name="([^"]+)"/g)].map(m => m[1]));
  for (const tab of tabs) assert.ok(registered.has(tab.routeName), tab.routeName);
});
test('related screens highlight their parent destination', () => {
  for (const route of ['SeekerServices', 'SeekerServiceSessions', 'SeekerServiceSessionDetails', 'MyPostsScreen', 'PostResponsesScreen', 'SeekerCalendar', 'FindService', 'FeedScreen']) assert.equal(active(route), 'Services');
  assert.equal(active('BookingsScreen'), 'Bookings');
  assert.equal(active('RequestQuotationDetails'), 'Bookings');
  assert.equal(active('ProfileScreen'), 'Profile');
  assert.equal(active('ChatScreen'), null);
});
test('tab switching reuses an existing screen and works for new destinations', () => {
  const calls = [];
  const nav = { getState: () => ({ routes: [{ name: 'Home' }] }), popTo: name => calls.push(['pop', name]), navigate: name => calls.push(['navigate', name]) };
  open(nav, 'Home'); open(nav, 'SeekerServices');
  assert.deepEqual(calls, [['pop', 'Home'], ['navigate', 'SeekerServices']]);
  open({ isReady: () => false, navigate: () => { throw Error('Not ready'); } }, 'Home');
});
test('provider chat opens a real thread with the expected receiver and fails visibly on creation errors', async () => {
  const ctx = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'utils/seekerChat.js'), 'utf8').replace(/export /g, '') + '\nthis.open = openProviderConversation;', ctx);
  let destination;
  await ctx.open({ seekerId: 's', providerId: { _id: 'p' }, providerName: 'Provider', createOrGetChat: async (sender, receiver) => { assert.equal(sender, 's'); assert.equal(receiver, 'p'); return 'thread'; }, navigation: { navigate: (screen, params) => { destination = { screen, params }; } } });
  assert.equal(destination.screen, 'ChatScreen');
  assert.equal(destination.params.chatId, 'thread');
  assert.equal(destination.params.userId, 'p');
  await assert.rejects(ctx.open({ seekerId: 's', providerId: 'p', createOrGetChat: async () => null }), /Unable to open/);
});
