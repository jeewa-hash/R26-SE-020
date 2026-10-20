export const idOf = value => String(value?._id || value?.id || value || '');
export const canQuoteRequest = request => String(request?.status || 'pending').toLowerCase() === 'pending' && !request?.rescheduleRequestedAt;
export const bookingActions = booking => {
  const status = String(booking?.bookingStatus || booking?.status || '').toUpperCase();
  return {
    ready: status === 'CONFIRMED' && !booking?.providerReadyConfirmed,
    travel: status === 'CONFIRMED',
    start: ['CONFIRMED', 'RESCHEDULED', 'ON_THE_WAY'].includes(status),
    delay: ['IN_PROGRESS', 'DELAY_REPORTED'].includes(status),
    complete: ['IN_PROGRESS', 'DELAY_REPORTED'].includes(status),
    reschedule: ['CONFIRMED', 'RESCHEDULED'].includes(status),
    closed: ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(status),
  };
};
export const bookingForQuote = (bookings, quote) => bookings.find(booking =>
  idOf(booking.externalQuotationId) === idOf(quote._id || quote.id) && Boolean(quote._id || quote.id));
