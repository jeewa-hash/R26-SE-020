const id = value => String(value?._id || value?.id || value || '');
export function notificationKey(item) {
  const quoteId = item.quoteId || item.metadata?.quotationId;
  if (quoteId && (String(item._id).startsWith('quote_') || item.type === 'NEW_QUOTATION' || /:sent$/.test(item.eventId || ''))) return `quotation:${id(quoteId)}`;
  return id(item._id);
}
export function mergeSeekerNotifications(auth = [], quotes = [], read = new Set(), hidden = new Set()) {
  const persistedQuotes = new Set(auth.map(n => id(n.metadata?.quotationId)).filter(Boolean));
  const all = [...auth, ...quotes.filter(n => !persistedQuotes.has(id(n.quoteId)))];
  return [...new Map(all.filter(n => !hidden.has(id(n._id)) && !hidden.has(`quote_${id(n.quoteId || n.metadata?.quotationId)}`)).map(n => [id(n._id), { ...n, isRead: Boolean(n.isRead || read.has(id(n._id)) || read.has(`quote_${id(n.quoteId || n.metadata?.quotationId)}`)) }])).values()]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
export function seekerNotificationDestination(item = {}) {
  const metadata = item.metadata || {};
  const bookingId = id(metadata.bookingId || item.bookingId);
  const requestId = id(metadata.providerRequestId || item.providerRequestId || item.requestId);
  if (bookingId) return { name: 'SeekerServiceSessionDetails', params: { notificationId: id(item._id), sessionId: id(metadata.sessionId) || `booking:${bookingId}`, session: { booking: { _id: bookingId }, bookings: [{ _id: bookingId }] } } };
  if (requestId) return { name: 'SeekerServiceSessionDetails', params: { notificationId: id(item._id), sessionId: id(metadata.sessionId) || `request:${requestId}`, session: { requests: [{ _id: requestId }] } } };
  const type = String(item.type || '').toLowerCase();
  if (type === 'provider_available' && (metadata.postId || item.postId)) return { name: 'PostResponsesScreen', params: { postId: id(metadata.postId || item.postId) } };
  if (type === 'booking' || type === 'quote' || type === 'new_quotation') return { name: 'SeekerServices' };
  if (type === 'bid') return { name: 'BiddingScreen', params: { postId: item.postId || metadata.postId } };
  if (type === 'message' || type === 'new_message') return { name: 'ChatListScreen' };
  if (type === 'high_demand_alert') return { name: 'SeasonalDemandsScreen' };
  return { name: 'NotificationScreen' };
}
