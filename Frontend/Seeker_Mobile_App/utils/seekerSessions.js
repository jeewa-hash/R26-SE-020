export const recordId = value => String(value?._id || value?.id || value || '');
const upper = value => String(value || '').toUpperCase();
const changedAt = row => new Date(row?.updatedAt || row?.createdAt || 0).getTime() || 0;
const sessionId = row => recordId(row?.externalSessionId || row?.sessionId || row?.session_id || row?.serviceSessionId);
const requestId = row => recordId(row?.providerRequestId || row?.externalRequestQuotationId || row?.requestQuotationId || row?.requestId);
const closed = row => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(upper(row?.bookingStatus || row?.status));

export function seekerSessionOrigin(session = {}) {
  const key = sessionId(session) || recordId(session.id);
  const source = upper(session.sourceType || session.originType);
  if (source === 'POST' || key.startsWith('POST-')) return { label: 'Your job post', icon: 'newspaper-outline', kind: 'post' };
  if (source === 'PROVIDER_FEED' || key.startsWith('AD-')) return { label: 'Provider feed', icon: 'people-outline', kind: 'provider' };
  if (source === 'PHOTO' || key.startsWith('REPAIR-')) return { label: 'Photo diagnosis', icon: 'camera-outline', kind: 'photo' };
  if (source === 'SEARCH' || key.startsWith('Q-')) return { label: 'Service search', icon: 'search-outline', kind: 'search' };
  if (source === 'DIRECT_PROVIDER') return { label: 'Direct provider request', icon: 'person-outline', kind: 'provider' };
  return { label: 'Source not recorded', icon: 'layers-outline', kind: 'unknown' };
}

export function seekerSessionGuidance(session = {}) {
  const booking = session.booking;
  const state = upper(booking?.bookingStatus || booking?.status);
  const describe = (title, owner, message, action, step, group, tab, target = 'session') => ({ title, label: title, owner, message, action, step, group, tab, target });
  if (booking) {
    const states = {
      CONFIRMED: ['Booking confirmed', 'Provider', booking.providerReadyConfirmed ? 'Your provider confirmed readiness. Be available at the scheduled time.' : 'Your booking is confirmed. The provider will confirm readiness before travelling.', 'View Booking', 2, 'booked', 'Scheduled'],
      RESCHEDULED: ['New time confirmed', 'Provider', 'Review the updated start time and be available for the provider.', 'View Updated Booking', 2, 'booked', 'Scheduled'],
      ON_THE_WAY: ['Provider on the way', 'Provider', 'The provider is travelling to your location. Keep your phone available.', 'Track Booking', 2, 'working', 'Ongoing'],
      IN_PROGRESS: ['Work in progress', 'Provider', 'The provider has started work. You can review the booking or contact them.', 'View Current Job', 2, 'working', 'Ongoing'],
      DELAY_REPORTED: ['Provider reported a delay', 'You', 'Review the updated finish time and any effect on your booking.', 'Review Delay', 2, 'attention', 'Ongoing'],
      RESCHEDULE_REQUESTED: ['New time under review', 'Review needed', 'A schedule change is pending. Open the booking to review the request; the original time has not been replaced yet.', 'Review Schedule', 2, 'attention', 'Scheduled'],
      RESCHEDULING_REQUIRED: ['Schedule needs attention', 'You', 'A conflict affects this booking. Review the available reschedule options.', 'Review Options', 2, 'attention', 'Scheduled'],
      COMPLETED: ['Service completed', 'You', 'The provider marked this job complete. Review the job details and leave feedback.', 'View Completed Job', 3, 'closed', 'History'],
      CANCELLED: ['Booking cancelled', 'No action', 'This booking is closed. The provider will not attend this booking.', 'View Cancellation', 2, 'closed', 'History'],
      EXPIRED: booking.pendingRescheduleId ? ['New time awaiting approval', 'Provider', 'Your service remains expired while the provider reviews the new time. You will be notified of their decision.', 'View Time Request', 2, 'waiting', 'History'] : ['Booking expired', 'You', 'Work did not start within 45 minutes of the scheduled time. Request a new time for the provider to review.', 'Request a New Time', 2, 'closed', 'History'],
    };
    return describe(...(states[state] || ['Check booking status', 'Review needed', 'Refresh the session and review the latest booking before making changes.', 'View Booking', 2, 'attention', 'Scheduled']), 'booking');
  }
  const requests = session.requests || [];
  const quotes = (session.quotations || []).filter(q => !['REJECTED', 'CANCELLED', 'EXPIRED'].includes(upper(q.status)));
  if (quotes.some(q => upper(q.status) === 'ACCEPTED')) return describe('Quotation accepted · booking needed', 'You', 'Your price is accepted, but no confirmed booking is linked yet. Review the quotation and finish booking confirmation.', 'Continue Confirmation', 1, 'attention', 'Active');
  if (requests.some(r => r.rescheduleRequestedAt)) return describe('Choose a new requested time', 'You', 'A provider asked for a different time. Open the session to update that request.', 'Choose New Time', 1, 'attention', 'Active');
  if (quotes.some(q => ['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(upper(q.coordinationStatus || q.coordinationDecision)))) return describe('Quotations ready to review', 'You', 'Compare the price and proposed time. Selecting a quotation still requires booking confirmation.', 'Review Quotations', 1, 'attention', 'Active');
  if (quotes.length) return describe('Quotation availability pending', 'Provider', 'A price has arrived. The provider must finish checking availability before you can confirm.', 'View Quotations', 1, 'waiting', 'Active');
  if (requests.length && requests.every(r => ['REJECTED', 'CANCELLED', 'EXPIRED'].includes(upper(r.status)))) return describe('Requests closed', 'You', 'These requests are closed and no booking was confirmed. You can find another provider.', 'View Requests', 0, 'closed', 'History');
  if (requests.some(r => ['QUOTED', 'ACCEPTED'].includes(upper(r.status)))) return describe('Quotation details unavailable', 'Refresh needed', 'A quotation is recorded for this request, but its details are not loaded. Refresh to check the latest offer before continuing.', 'Review Requests', 1, 'attention', 'Active');
  if (requests.length) return describe('Waiting for provider quotations', 'Provider', 'Your request has been sent. Providers need to review it and send their prices.', 'View Requests', 0, 'waiting', 'Active');
  return describe('Draft · no requests sent', 'You', 'This service has no quotation requests yet. Choose providers to request prices.', 'Find Providers', -1, 'draft', 'Drafts', 'providers');
}

// Match only explicit session, request and quotation identifiers; never service titles or post IDs.
export function buildSeekerSessions({ serviceSessions = [], requests = [], quotations = [], bookings = [] } = {}) {
  const groups = new Map(), byRequest = new Map(), byQuote = new Map();
  const get = (key, row = {}) => {
    if (!groups.has(key)) groups.set(key, { ...row, sessionId: key, requests: [], quotations: [], bookings: [] });
    return groups.get(key);
  };
  serviceSessions.forEach(row => { const key = sessionId(row) || recordId(row); if (key) get(key, row); });
  requests.forEach(row => {
    const rid = recordId(row), key = sessionId(row) || `request:${rid}`;
    if (!rid && !sessionId(row)) return;
    const group = get(key, row); group.requests.push(row); if (rid) byRequest.set(rid, group);
  });
  quotations.forEach(row => {
    const qid = recordId(row), related = byRequest.get(requestId(row));
    const key = sessionId(row) || `quote:${qid}`;
    const group = related || get(key, row);
    group.quotations.push(row); if (qid) byQuote.set(qid, group);
  });
  bookings.forEach(row => {
    const group = byQuote.get(recordId(row.externalQuotationId || row.quotationId)) || byRequest.get(requestId(row)) || get(sessionId(row) || `booking:${recordId(row)}`, row);
    group.bookings.push(row);
  });
  const unique = rows => {
    const latest = new Map();
    rows.forEach(row => { const key = recordId(row); if (!latest.has(key) || changedAt(row) >= changedAt(latest.get(key))) latest.set(key, row); });
    return [...latest.values()];
  };
  return [...groups.values()].map(group => {
    group.requests = unique(group.requests); group.quotations = unique(group.quotations); group.bookings = unique(group.bookings);
    group.booking = [...group.bookings].sort((a, b) => Number(closed(a)) - Number(closed(b)) || changedAt(b) - changedAt(a))[0] || null;
    const source = group.requests[0] || group.booking || group.quotations[0] || {};
    const result = { ...source, ...group, requestedProvidersCount: group.requests.length, quoteCount: group.quotations.length, bookingCount: group.bookings.length };
    return { ...result, origin: seekerSessionOrigin(result), guidance: seekerSessionGuidance(result) };
  }).sort((a, b) => {
    const rank = { attention: 0, working: 1, booked: 2, waiting: 3, draft: 4, closed: 5 };
    return rank[a.guidance.group] - rank[b.guidance.group] || Math.max(changedAt(b), ...b.bookings.map(changedAt)) - Math.max(changedAt(a), ...a.bookings.map(changedAt));
  });
}
