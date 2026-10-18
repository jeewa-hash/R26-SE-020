const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ctx = { URL };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/portfolioMedia.js'), 'utf8').replace('export ', '') + '\nthis.resolve = resolvePortfolioImage;', ctx);
test('relative portfolio uploads use the image backend instead of Metro', () => {
  assert.equal(ctx.resolve('temp_uploads/photo 1.jpg', 'https://images.test/'), 'https://images.test/temp_uploads/photo%201.jpg');
  assert.equal(ctx.resolve('/uploads/photo.jpg', 'https://images.test/'), 'https://images.test/uploads/photo.jpg');
});
test('obsolete bundled placeholder references use the category icon fallback', () => {
  for (const file of ['assets/images/default.jpg', './assets/images/default.jpg', '/assets/images/default.jpg']) assert.equal(ctx.resolve(file, 'https://images.test'), null);
});
test('actual remote and device images are preserved', () => {
  for (const file of ['https://cdn.test/photo.jpg', 'file:///photo.jpg', 'content://photo']) assert.equal(ctx.resolve(file, 'https://images.test'), file);
});
