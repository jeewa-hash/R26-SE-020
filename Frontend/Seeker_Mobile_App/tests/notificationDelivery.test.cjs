const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const helpers = fs.readFileSync(path.join(root, 'utils/seekerNotifications.js'), 'utf8').replace(/export /g, '');
const source = fs.readFileSync(path.join(root, 'context/NotificationContext.js'), 'utf8')
  .replace(/^import .*;\n/gm, '').replace(/export /g, '')
  .replace(/  return <NotificationContext.Provider[^\n]+/, '  return { syncNotifications };');
const flush = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
async function setup({ inbox = [], quotes = [], failInbox = false, failQuotes = false } = {}) {
  const state = { inbox, quotes, failInbox, failQuotes };
  const popups = [], effects = [], sockets = [], storage = new Map([['userToken', 'test-token']]);
  const context = {
    Date, Set, Map, Promise, JSON, String, Array, Error, Number,
    createContext: () => ({}), useContext: () => ({}),
    useState: value => [value, () => {}], useRef: value => ({ current: value }),
    useCallback: fn => fn, useEffect: fn => effects.push(fn),
    useAuth: () => ({ user: { id: 'seeker' }, isReady: true }), getUserIdFromJwt: () => 'seeker',
    AUTH_SERVICE_URL: 'https://auth.test', PROVIDER_SERVICE_URL: 'https://provider.test',
    AsyncStorage: {
      getItem: async key => storage.get(key) ?? null,
      setItem: async (key, value) => storage.set(key, value),
      multiGet: async keys => keys.map(key => [key, storage.get(key) ?? null]),
    },
    fetch: async url => ({ ok: url.includes('/seeker/notifications') ? !state.failInbox : !state.failQuotes,
      json: async () => url.includes('/seeker/notifications') ? state.inbox : { data: state.quotes } }),
    Toast: { show: payload => popups.push(payload) }, navigate: () => {},
    io: (url, options) => { const socket = { options, handlers: {}, on(name, fn) { this.handlers[name] = fn; }, disconnect() {} }; sockets.push(socket); return socket; },
    setInterval: () => 1, clearInterval: () => {},
  };
  vm.runInNewContext(helpers + '\n' + source + '\nthis.api = NotificationProvider({children:null});', context);
  const cleanup = effects[0](); await flush();
  return { ...context.api, state, popups, socket: sockets[0], cleanup, flush };
}
const available = id => ({ _id: id, type: 'provider_available', title: 'A provider is available', message: 'Provider is ready', createdAt: '2000-01-01T00:00:00Z', metadata: { postId: 'post' }, isRead: false });

test('historical inbox stays quiet, live availability ignores phone/server clock differences and is deduplicated', async () => {
  const x = await setup({ inbox: [available('old')] });
  assert.equal(x.popups.length, 0);
  const item = available('live');
  x.socket.handlers.notification(item); await x.flush();
  assert.equal(x.popups.length, 1); assert.equal(x.popups[0].props.data._id, 'live');
  x.socket.handlers.notification(item); await x.flush(); assert.equal(x.popups.length, 1);
  assert.deepEqual(Array.from(x.socket.options.transports), ['polling', 'websocket']); assert.equal(x.socket.options.tryAllTransports, true);
  x.cleanup();
});
test('quotation API failure cannot block new provider availability found by inbox polling', async () => {
  const x = await setup({ inbox: [available('old')], failQuotes: true });
  x.state.inbox = [available('new'), available('old')];
  await x.syncNotifications(true);
  assert.equal(x.popups.length, 1); assert.equal(x.popups[0].props.data._id, 'new');
  await x.syncNotifications(true); assert.equal(x.popups.length, 1);
  x.cleanup();
});
test('late recovery of a failed source silently seeds its old items, then alerts on new items', async () => {
  const x = await setup({ failInbox: true });
  x.state.failInbox = false; x.state.inbox = [available('historical')];
  await x.syncNotifications(true); assert.equal(x.popups.length, 0);
  x.state.inbox = [available('fresh'), available('historical')];
  await x.syncNotifications(true); assert.equal(x.popups.length, 1); x.cleanup();
});
test('reconnect catches missed live notifications without silently consuming them', async () => {
  const x = await setup({ inbox: [available('old')] });
  x.state.inbox = [available('offline-gap'), available('old')];
  await x.socket.handlers.connect();
  assert.equal(x.popups.length, 1); assert.equal(x.popups[0].props.data._id, 'offline-gap');
  x.cleanup();
});
test('already-read socket events remain quiet and account cleanup rejects late delivery', async () => {
  const x = await setup();
  x.socket.handlers.notification({ ...available('read'), isRead: true }); await x.flush();
  assert.equal(x.popups.length, 0);
  x.cleanup(); x.socket.handlers.notification(available('late')); await x.flush();
  assert.equal(x.popups.length, 0);
});
