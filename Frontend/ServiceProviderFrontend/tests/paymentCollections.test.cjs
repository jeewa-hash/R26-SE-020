const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const load = () => import('data:text/javascript,' + encodeURIComponent(fs.readFileSync(path.join(__dirname, '../utils/completedEarnings.js'), 'utf8')));
test('gross work value is separate from customer cash and platform reimbursement', async () => {
  const { summarizePaymentCollections, summarizeCompletedEarnings } = await load();
  const rows = [
    { bookingStatus: 'COMPLETED', scheduledDate: '2026-10-19', finalAmount: 2000, payment: { customerPaymentStatus: 'RECEIVED', customerAmountDue: 1700, platformAmountOwed: 300 } },
    { bookingStatus: 'COMPLETED', scheduledDate: '2026-10-19', finalAmount: 1000, payment: { customerPaymentStatus: 'AWAITING_PAYMENT', customerAmountDue: 900, platformAmountOwed: 100 } },
    { bookingStatus: 'COMPLETED', scheduledDate: '2026-10-19', finalAmount: 500 },
    { bookingStatus: 'IN_PROGRESS', scheduledDate: '2026-10-19', finalAmount: 10000 },
  ];
  const now = new Date('2026-10-20T12:00:00Z');
  assert.deepEqual(summarizePaymentCollections(rows, 'Month', now), { customerReceived: 1700, customerPending: 900, platformOwed: 400, unrecorded: 500 });
  assert.equal(summarizeCompletedEarnings(rows, 'Month', now).totalIncome, 3500);
  assert.deepEqual(summarizePaymentCollections(rows, 'Month', new Date('2026-11-20')), { customerReceived: 0, customerPending: 0, platformOwed: 0, unrecorded: 0 });
});
test('invalid allocations and legacy jobs are not presented as money received', async () => {
  const { summarizePaymentCollections } = await load();
  const result = summarizePaymentCollections([{ bookingStatus: 'COMPLETED', finalAmount: 2000, payment: { customerPaymentStatus: 'RECEIVED', customerAmountDue: 2000, platformAmountOwed: 300 } }]);
  assert.equal(result.customerReceived, 0); assert.equal(result.unrecorded, 2000);
});
