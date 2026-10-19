// Join only explicit request/quotation/session identifiers, never customer or post names.
const id = value => String(value?._id || value?.id || value || '');
const upper = value => String(value || '').toUpperCase();
const changedAt = row => new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
const newest = (a, b) => !a || changedAt(b) >= changedAt(a) ? b : a;

export function sessionGuidance({ request, quotation, booking }) {
  if (booking) {
    const status = upper(booking.bookingStatus || booking.status);
    const states = {
      CONFIRMED: ['Booking confirmed', 'You', booking.providerReadyConfirmed ? 'You confirmed readiness. Review the start time, mark yourself on the way when travelling, and start work on arrival.' : 'Review the scheduled time and confirm you are ready. Mark yourself on the way when travelling, then start work on arrival.', 'Manage Booking', 2, 'booked'],
      RESCHEDULED: ['New booking time confirmed', 'You', 'Review the updated time before travelling or starting work.', 'Review New Time', 2, 'booked'],
      ON_THE_WAY: ['You are on the way', 'You', 'The seeker has been notified. Start the job when you arrive.', 'Start / View Job', 2, 'working'],
      IN_PROGRESS: ['Work in progress', 'You', 'Complete the job when finished. Report a delay if you need more time.', 'Manage Current Job', 2, 'working'],
      DELAY_REPORTED: ['Delay reported', 'You', 'The updated finish time has been reported. Open the booking to review the impact or complete the job.', 'Manage Delayed Job', 2, 'working'],
      RESCHEDULE_REQUESTED: ['New time under review', 'Review needed', 'Open the booking to see the reschedule request and available choices. The new time is not confirmed yet.', 'Review Reschedule', 2, 'attention'],
      RESCHEDULING_REQUIRED: ['Booking time needs attention', 'Review needed', 'Open the booking to review the conflict and reschedule options before continuing.', 'Review Booking', 2, 'attention'],
      COMPLETED: ['Job completed', 'No action', 'This job is finished. View its activity and earnings from the booking details.', 'View Completed Job', 3, 'closed'],
      CANCELLED: ['Booking cancelled', 'No action', 'This booking is cancelled. Do not travel or start work for this booking.', 'View Cancellation', 2, 'closed'],
      EXPIRED: booking.pendingRescheduleId ? ['Review new time request', 'You', 'The customer proposed a new time for this expired service. Review and approve availability before it can be scheduled again.', 'Review New Time', 2, 'attention'] : ['Booking expired', 'No action', 'This booking expired. The customer can request a new time; it remains expired until you approve that request.', 'View Expired Job', 2, 'closed'],
    };
    return describe(states[status] || ['Review booking status', 'Review needed', 'Refresh and open the booking to check the latest status before taking action.', 'View Booking', 2, 'attention'], 'booking');
  }
  if (quotation) {
    const status = upper(quotation.status);
    if (['REJECTED', 'CANCELLED', 'EXPIRED'].includes(status)) return describe([`Quotation ${status.toLowerCase()}`, 'No action', 'This offer is closed. No confirmed booking is linked to it.', 'View Quotation', 1, 'closed'], 'quotation');
    if (status === 'ACCEPTED') return describe(['Quotation accepted · awaiting booking', 'Seeker', 'The seeker accepted your price. Wait for booking confirmation before travelling or starting work.', 'Track Confirmation', 1, 'waiting'], 'quotation');
    if (request?.rescheduleRequestedAt) return describe(['Waiting for a new time', 'Seeker', 'You requested a new time. The seeker must choose it; your saved quotation price stays the same.', 'View Quotation', 1, 'waiting'], 'quotation');
    const coordination = upper(quotation.coordinationStatus || 'NOT_CHECKED');
    if (['RESCHEDULE_REQUIRED','CONFLICT_DETECTED','NOT_AVAILABLE','REJECTED_DUE_TO_CONFLICT','NEEDS_RESCHEDULE','CONFLICT_FOUND','REJECTED_BY_COORDINATION'].includes(coordination)) return describe(['Requested time conflicts', 'You', 'Your quotation is saved, but this time is not available. Review availability and ask the seeker for another time.', 'Resolve Time Conflict', 1, 'attention'], 'quotation');
    if (['CAN_ACCEPT','AVAILABLE_WITH_CAUTION'].includes(coordination)) return describe(['Quotation sent · waiting for seeker', 'Seeker', 'Your offer is ready for the seeker to review. A booking is created only after they accept and confirm.', 'View Sent Quotation', 1, 'waiting'], 'quotation');
    return describe(['Quotation saved · validation needed', 'You', 'Your price is saved. Open the quotation and recheck availability before it can proceed.', 'Check Quotation', 1, 'attention'], 'quotation');
  }
  const status = upper(request?.status || 'PENDING');
  if (['REJECTED','CANCELLED','EXPIRED'].includes(status)) return describe([`Request ${status.toLowerCase()}`, 'No action', 'This request is closed. No action is required from you.', 'View Request', 0, 'closed'], 'request');
  if (request?.rescheduleRequestedAt) return describe(['Waiting for a new time', 'Seeker', 'You asked for a different start time. The seeker must update this request before you can quote.', 'View Request', 0, 'waiting'], 'request');
  if (status === 'QUOTED' || status === 'ACCEPTED') return describe(['Quotation details not loaded', 'Refresh needed', 'The request records a quotation, but its details are not loaded here. Refresh or open My Quotations; do not submit another offer.', 'View Request', 1, 'attention'], 'request');
  if (status !== 'PENDING') return describe(['Review request status', 'Review needed', 'Open the request to check its current status before sending a quotation.', 'View Request', 0, 'attention'], 'request');
  return describe(['New quotation request', 'You', 'Review the service, location and requested time, then send your price or ask the seeker to choose another time.', 'Review & Send Quote', 0, 'attention'], 'request');
}
function describe([title, owner, message, action, step, group], kind) {
  return { title, owner, message, action, step, group, kind };
}

export function buildProviderSessions(requests = [], quotations = [], bookings = []) {
  const sessions = [];
  const byRecord = new Map();
  const byRequest = new Map(), byQuote = new Map(), bySession = new Map();
  const find = (requestId, quoteId, sessionId) => byQuote.get(id(quoteId)) || byRequest.get(id(requestId)) || bySession.get(id(sessionId));
  const attach = (kind, row, requestId, quoteId, sessionId) => {
    let session = byRecord.get(`${kind}:${id(row._id || row.id)}`) || find(requestId, quoteId, sessionId);
    if (!session) { session = { key: `${kind}:${id(row._id || row.id) || sessions.length}` }; sessions.push(session); }
    session[kind] = newest(session[kind], row);
    if (row._id || row.id) byRecord.set(`${kind}:${id(row._id || row.id)}`, session);
    if (requestId) byRequest.set(id(requestId), session);
    if (quoteId) byQuote.set(id(quoteId), session);
    if (sessionId) { bySession.set(id(sessionId), session); session.sessionId = id(sessionId); }
  };
  requests.forEach(row => attach('request', row, row._id || row.id, null, row.sessionId));
  quotations.forEach(row => attach('quotation', row, row.providerRequestId || row.externalRequestQuotationId, row._id || row.id, row.externalSessionId || row.sessionId));
  bookings.forEach(row => attach('booking', row, row.providerRequestId || row.externalRequestQuotationId, row.externalQuotationId, row.externalSessionId || row.sessionId));
  return sessions.map(session => ({ ...session, guidance: sessionGuidance(session) }))
    .sort((a, b) => {
      const priority = { attention: 0, working: 1, booked: 2, waiting: 3, closed: 4 };
      return priority[a.guidance.group] - priority[b.guidance.group] ||
        Math.max(changedAt(b.booking), changedAt(b.quotation), changedAt(b.request)) - Math.max(changedAt(a.booking), changedAt(a.quotation), changedAt(a.request));
    });
}
