import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../src/controllers/bookingPaymentController.js', import.meta.url), 'utf8').replace(/^import .*;\n/gm, '').replace(/export /g, '');
const ids = { booking: 'a'.repeat(24), seeker: 'b'.repeat(24), provider: 'c'.repeat(24), redemption: 'd'.repeat(24) };
function setup() {
  const booking = { _id: ids.booking, seekerId: ids.seeker, providerId: ids.provider, bookingStatus: 'COMPLETED', finalAmount: 2000, currency: 'LKR', timeline: [] };
  let receipt = null, spent = 0, failWrite = false;
  const notices = [];
  const context = {
    Date, Number, String, Math, Promise,
    mongoose: { isValidObjectId: id => /^[a-f0-9]{24}$/.test(String(id)) },
    Booking: {
      findById: async () => booking,
      findOneAndUpdate: async (filter, update) => {
        if (failWrite) { failWrite = false; throw new Error('coordination database unavailable'); }
        if ('payment' in filter && booking.payment) return null;
        if (filter['payment.customerPaymentStatus'] && booking.payment.customerPaymentStatus !== filter['payment.customerPaymentStatus']) return null;
        for (const [key, value] of Object.entries(update.$set)) {
          if (key.startsWith('payment.')) booking.payment[key.split('.')[1]] = value;
          else booking[key] = value;
        }
        booking.timeline.push(update.$push.timeline);
        return booking;
      },
    },
    spendBookingPoints: async (_, points) => {
      if (!receipt) { spent += points; receipt = { _id: ids.redemption, bookingId: ids.booking, seekerId: ids.seeker, providerId: ids.provider, agreedAmount: 2000, pointsRedeemed: points, customerAmountDue: 2000 - points, platformAmountOwed: points, currency: 'LKR', createdAt: new Date() }; }
      return receipt;
    },
    readBookingRedemption: async () => receipt,
    publishLifecycleNotification: async payload => notices.push(payload),
  };
  vm.runInNewContext(source + '\nthis.api = {getBookingPayment, prepareBookingPayment, confirmCustomerPayment, paymentFromReceipt}', context);
  const req = (role = 'Seeker', body = { points: 300 }) => ({ params: { bookingId: ids.booking }, user: { id: role === 'Seeker' ? ids.seeker : ids.provider, role }, body });
  async function run(name, request = req()) {
    let code = 200, data;
    const response = { status(n) { code = n; return this; }, json(value) { data = value; return this; } };
    await context.api[name](request, response);
    return { code, data };
  }
  return { booking, context, req, run, notices, get spent() { return spent; }, breakNextWrite() { failWrite = true; } };
}

test('300 points reduce customer payment without reducing provider earnings or claiming a payout', async () => {
  const x = setup(); const result = await x.run('prepareBookingPayment');
  assert.equal(result.code, 200); assert.equal(x.spent, 300);
  assert.equal(x.booking.finalAmount, 2000); assert.equal(x.booking.payment.customerAmountDue, 1700);
  assert.equal(x.booking.payment.platformAmountOwed, 300); assert.equal(x.booking.payment.platformSettlementStatus, 'PENDING');
  assert.equal(x.booking.payment.customerPaymentStatus, 'AWAITING_PAYMENT');
  assert.equal(x.notices.length, 2);
});
test('retries and concurrent duplicate confirmations consume points once and keep the original allocation', async () => {
  const x = setup();
  await Promise.all([x.run('prepareBookingPayment'), x.run('prepareBookingPayment')]);
  await x.run('prepareBookingPayment', x.req('Seeker', { points: 1000 }));
  assert.equal(x.spent, 300); assert.equal(x.booking.payment.pointsRedeemed, 300);
  assert.equal(x.booking.timeline.length, 1); assert.equal(x.notices.length, 2);
});
test('a debit committed before a coordination failure is recovered by refreshing without spending again', async () => {
  const x = setup(); x.breakNextWrite();
  assert.equal((await x.run('prepareBookingPayment')).code, 503);
  assert.equal(x.spent, 300); assert.equal(x.booking.payment, undefined);
  assert.equal((await x.run('getBookingPayment')).code, 200);
  assert.equal(x.booking.payment.pointsRedeemed, 300); assert.equal(x.spent, 300);
});
test('ownership and completed-service checks protect every payment action', async () => {
  for (const action of ['getBookingPayment', 'prepareBookingPayment', 'confirmCustomerPayment']) {
    const x = setup(); const req = x.req(); req.user.id = 'f'.repeat(24);
    assert.equal((await x.run(action, req)).code, 403);
    x.booking.bookingStatus = 'IN_PROGRESS';
    assert.equal((await x.run(action)).code, action === 'confirmCustomerPayment' ? 403 : 409);
    assert.equal(x.spent, 0);
  }
});
test('invalid, fractional, excessive and nonnumeric point amounts cannot spend funds', async () => {
  for (const points of [-1, 0.5, 2001, '300', null, NaN]) {
    const x = setup(); assert.equal((await x.run('prepareBookingPayment', x.req('Seeker', { points }))).code, 400); assert.equal(x.spent, 0);
  }
});
test('only provider can record cash receipt, retries are idempotent, platform remains unpaid', async () => {
  const x = setup(); await x.run('prepareBookingPayment');
  assert.equal((await x.run('confirmCustomerPayment', x.req('Seeker', { method: 'CASH' }))).code, 403);
  assert.equal((await x.run('confirmCustomerPayment', x.req('ServiceProvider', { method: 'CARD' }))).code, 400);
  assert.equal((await x.run('confirmCustomerPayment', x.req('ServiceProvider', { method: 'CASH' }))).code, 200);
  await x.run('confirmCustomerPayment', x.req('ServiceProvider', { method: 'BANK_TRANSFER' }));
  assert.equal(x.booking.payment.customerPaymentStatus, 'RECEIVED'); assert.equal(x.booking.payment.customerPaymentMethod, 'CASH');
  assert.equal(x.booking.payment.platformSettlementStatus, 'PENDING'); assert.equal(x.booking.timeline.length, 2);
});
test('full points need no cash, while zero points require no platform reimbursement', async () => {
  const full = setup(); await full.run('prepareBookingPayment', full.req('Seeker', { points: 2000 }));
  assert.equal((await full.run('confirmCustomerPayment', full.req('ServiceProvider', { method: 'CASH' }))).code, 400);
  assert.equal((await full.run('confirmCustomerPayment', full.req('ServiceProvider', { method: 'POINTS_ONLY' }))).code, 200);
  const zero = setup(); await zero.run('prepareBookingPayment', zero.req('Seeker', { points: 0 }));
  assert.equal(zero.booking.payment.platformSettlementStatus, 'NOT_REQUIRED'); assert.equal(zero.booking.payment.customerAmountDue, 2000);
});
test('an unverified reward receipt cannot change the bill or provider balance', async () => {
  const x = setup(); x.context.spendBookingPoints = async () => ({ _id: ids.redemption, bookingId: ids.booking, seekerId: ids.seeker, providerId: 'f'.repeat(24), agreedAmount: 2000 });
  assert.equal((await x.run('prepareBookingPayment')).code, 503); assert.equal(x.booking.payment, undefined);
});
