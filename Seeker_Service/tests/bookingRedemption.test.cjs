const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../services/bookingRedemptionService.js'), 'utf8').replace(/^import .*;\n/gm, '').replace(/export /g, '');
function setup(initialBalance = 500) {
  let balance = initialBalance, spent = 0, receipts = [], transactions = [], failLedger = false, queue = Promise.resolve();
  const context = {
    Number, Math, String,
    mongoose: { isValidObjectId: id => /^[a-f0-9]{24}$/.test(String(id)), startSession: async () => ({
      async withTransaction(fn) {
        const previous = queue; let release; queue = new Promise(resolve => release = resolve); await previous;
        const before = { balance, spent, receipts: receipts.slice(), transactions: transactions.slice() };
        try { await fn(); } catch (e) { ({ balance, spent, receipts, transactions } = before); throw e; } finally { release(); }
      }, endSession: async () => {},
    }) },
    RewardAccount: { findOneAndUpdate: async (filter, update) => {
      if (balance < filter.balance.$gte) return null;
      balance += update.$inc.balance; spent += update.$inc.lifetimeSpent; return { balance, lifetimeSpent: spent };
    } },
    BookingRewardRedemption: {
      init: async () => {},
      findOne: filter => { const item = receipts.find(r => Object.keys(filter).every(key => r[key] === filter[key])); return { session: async () => item, then: (yes, no) => Promise.resolve(item).then(yes, no) }; },
      create: async rows => { const receipt = { _id: 'd'.repeat(24), ...rows[0] }; receipts.push(receipt); return [receipt]; },
    },
    RewardTransaction: { create: async rows => { if (failLedger) throw new Error('ledger unavailable'); transactions.push(...rows); } },
  };
  vm.runInNewContext(source + '\nthis.api = { paymentAllocation, redeemBookingPoints };', context);
  const payload = { bookingId: 'a'.repeat(24), seekerId: 'b'.repeat(24), providerId: 'c'.repeat(24), finalAmount: 2000, currency: 'LKR', bookingStatus: 'COMPLETED', points: 300 };
  return { ...context.api, payload, get balance() { return balance; }, get spent() { return spent; }, get receipts() { return receipts; }, get transactions() { return transactions; }, failLedger() { failLedger = true; } };
}
test('1 point equals one rupee with decimal cash remainders preserved', () => {
  const x = setup(); const result = x.paymentAllocation(2000.75, 300);
  assert.equal(result.customerAmountDue, 1700.75); assert.equal(result.platformAmountOwed, 300);
  for (const [amount, points] of [[2000,-1],[2000,2001],[2000,1.5],[2000,'300'],[-1,0],[Infinity,0],[1.001,0]]) assert.throws(() => x.paymentAllocation(amount, points));
});
test('balance debit, immutable receipt and SPEND ledger are committed together', async () => {
  const x = setup(); await x.redeemBookingPoints(x.payload);
  assert.equal(x.balance, 200); assert.equal(x.spent, 300); assert.equal(x.receipts.length, 1);
  assert.equal(x.transactions.length, 1); assert.equal(x.transactions[0].amount, -300);
  assert.equal(x.transactions[0].metadata.pointValueLkr, 1);
});
test('same booking retried with different points returns the original receipt without another debit', async () => {
  const x = setup(); const receipt = await x.redeemBookingPoints(x.payload);
  const retry = await x.redeemBookingPoints({ ...x.payload, points: 100 });
  assert.equal(retry._id, receipt._id); assert.equal(retry.pointsRedeemed, 300); assert.equal(x.balance, 200); assert.equal(x.transactions.length, 1);
});
test('competing bookings cannot overspend one balance', async () => {
  const x = setup(); const results = await Promise.allSettled([x.redeemBookingPoints(x.payload), x.redeemBookingPoints({ ...x.payload, bookingId: 'e'.repeat(24) })]);
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1); assert.equal(x.balance, 200); assert.equal(x.receipts.length, 1); assert.equal(x.transactions.length, 1);
});
test('ledger failure rolls back points and receipt; insufficient balance does not create a payment', async () => {
  const x = setup(); x.failLedger(); await assert.rejects(x.redeemBookingPoints(x.payload), /ledger unavailable/);
  assert.equal(x.balance, 500); assert.equal(x.spent, 0); assert.equal(x.receipts.length, 0);
  const poor = setup(50); await assert.rejects(poor.redeemBookingPoints(poor.payload), /Insufficient/); assert.equal(poor.balance, 50); assert.equal(poor.receipts.length, 0);
});
test('zero-point payment works without a rewards account debit', async () => {
  const x = setup(0); const receipt = await x.redeemBookingPoints({ ...x.payload, points: 0 });
  assert.equal(receipt.customerAmountDue, 2000); assert.equal(receipt.platformAmountOwed, 0); assert.equal(x.transactions.length, 0);
});
test('unfinished jobs, foreign currencies and changed owners cannot redeem', async () => {
  const x = setup();
  await assert.rejects(x.redeemBookingPoints({ ...x.payload, bookingStatus: 'IN_PROGRESS' }), /completed/);
  await assert.rejects(x.redeemBookingPoints({ ...x.payload, currency: 'USD' }), /LKR/);
  await x.redeemBookingPoints(x.payload);
  await assert.rejects(x.redeemBookingPoints({ ...x.payload, seekerId: 'e'.repeat(24) }), /does not match/);
  assert.equal(x.balance, 200);
});
