// Keep the scheduled-month convention used by coordination's earnings endpoint.
export function summarizeCompletedEarnings(bookings = [], period = 'All Time', now = new Date()) {
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const selected = bookings.filter(row => {
    if (row.bookingStatus !== 'COMPLETED') return false;
    const date = String(row.scheduledDate || row.completedAt || '');
    return period === 'Month' ? date.startsWith(month) : period === 'Year' ? date.startsWith(String(now.getUTCFullYear())) : true;
  });
  return { totalIncome: selected.reduce((sum, row) => sum + (Number(row.finalAmount) || 0), 0), completedBookingsCount: selected.length };
}

// Completed value is earned work, not proof of cash receipt. Legacy jobs stay unverified.
export function summarizePaymentCollections(bookings = [], period = 'All Time', now = new Date()) {
  const totals = { customerReceived: 0, customerPending: 0, platformOwed: 0, unrecorded: 0 };
  for (const row of bookings) {
    if (!summarizeCompletedEarnings([row], period, now).completedBookingsCount) continue;
    const payment = row.payment;
    const amount = Number(row.finalAmount) || 0;
    if (!payment || !['AWAITING_PAYMENT', 'RECEIVED'].includes(payment.customerPaymentStatus) || !Number.isFinite(payment.customerAmountDue) || !Number.isFinite(payment.platformAmountOwed) || payment.customerAmountDue < 0 || payment.platformAmountOwed < 0 || Math.abs(payment.customerAmountDue + payment.platformAmountOwed - amount) > 0.005) {
      totals.unrecorded += amount;
      continue;
    }
    totals[payment.customerPaymentStatus === 'RECEIVED' ? 'customerReceived' : 'customerPending'] += payment.customerAmountDue;
    totals.platformOwed += payment.platformAmountOwed;
  }
  for (const key of Object.keys(totals)) totals[key] = Math.round(totals[key] * 100) / 100;
  return totals;
}
