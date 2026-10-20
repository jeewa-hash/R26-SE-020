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
