const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../utils/providerNotificationPresentation.js'), 'utf8').replace('export function', 'function') + '\nthis.present = providerNotificationPresentation;', context);
test('job-flow notification actions open their linked records', () => {
  for (const [key, route, param, label] of [
    ['providerRequestId','IT22129376ProviderRequestDetails','requestId','Review Request'],
    ['quotationId','IT22129376ProviderQuotationDetails','quotationId','View Quotation'],
    ['bookingId','IT22129376ProviderJobDetails','bookingId','View Booking'],
  ]) {
    const action = context.present({ type: 'quote', metadata: { [key]: 'record' } });
    assert.equal(action.route, route); assert.equal(action.params[param], 'record'); assert.equal(action.label, label);
  }
});
test('missing metadata offers the notification inbox instead of resubmitting', () => {
  assert.equal(context.present({ type: 'quote' }).label, 'View Notification');
});
