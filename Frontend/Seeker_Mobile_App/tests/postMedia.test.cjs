const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ctx = { URL };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/postMedia.js'), 'utf8').replace(/export /g, '') + '\nthis.api = { resolvePostImageUrl, appendPostImage };', ctx);
const { resolvePostImageUrl: resolve, appendPostImage: append } = ctx.api;
test('post image paths resolve against the seeker upload server without duplicate slashes', () => {
  for (const value of ['uploads/photo 1.jpg', '/uploads/photo 1.jpg', '/app/Seeker_Service/uploads/photo 1.jpg', 'C:\\app\\uploads\\photo 1.jpg']) assert.equal(resolve(value, 'https://seeker.test/'), 'https://seeker.test/uploads/photo%201.jpg');
  assert.equal(resolve('https://cdn.test/p.png', 'https://seeker.test'), 'https://cdn.test/p.png');
  assert.equal(resolve(null, 'https://seeker.test'), null);
});
test('browser multipart gets an actual file/blob, not a React Native URI object', async () => {
  const blob = { size: 100, type: 'image/png' }, calls = [];
  await append({ append: (...args) => calls.push(args) }, { uri: 'blob:local', fileName: 'pic.png' }, 'web', async () => ({ blob: async () => blob }));
  assert.equal(calls[0][0], 'image'); assert.equal(calls[0][1], blob); assert.equal(calls[0][2], 'pic.png');
});
test('native multipart preserves the selected MIME type and filename', async () => {
  let value;
  await append({ append: (_, file) => { value = file; } }, { uri: 'file:///photo.png', mimeType: 'image/png', fileName: 'photo.png' }, 'ios');
  assert.equal(value.uri, 'file:///photo.png'); assert.equal(value.type, 'image/png'); assert.equal(value.name, 'photo.png');
});
test('empty browser photos cannot silently publish without an upload', async () => {
  await assert.rejects(append({ append: () => assert.fail('should not attach') }, { uri: 'blob:empty' }, 'web', async () => ({ blob: async () => ({ size: 0 }) })), /empty/);
});
