export function providerNotificationPresentation(item = {}) {
  const meta = item.metadata || {};
  if (meta.bookingId) return { label: 'View Booking', icon: 'event-available', route: 'IT22129376ProviderJobDetails', params: { bookingId: meta.bookingId } };
  if (meta.quotationId) return { label: 'View Quotation', icon: 'request-quote', route: 'IT22129376ProviderQuotationDetails', params: { quotationId: meta.quotationId } };
  if (meta.providerRequestId) return { label: 'Review Request', icon: 'request-quote', route: 'IT22129376ProviderRequestDetails', params: { requestId: meta.providerRequestId } };
  if (['inquiry_approved', 'inquiry_rejected'].includes(item.type)) return { label: item.type === 'inquiry_rejected' ? 'Review Inquiry' : 'View Status', icon: 'info-outline', route: 'SubmitInquiry' };
  return { label: 'View Notification', icon: 'notifications-none', route: 'Main', params: { screen: 'HomeTab', params: { screen: 'Notifications' } } };
}
