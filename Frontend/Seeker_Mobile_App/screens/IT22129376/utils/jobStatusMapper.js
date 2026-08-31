export const mapJobStatus = (status) => {
  switch ((status || '').toUpperCase()) {
    case 'WAITING_FOR_QUOTES':
    case 'REQUESTED':
    case 'PENDING':
      return { label: 'Waiting for Quotes', tone: 'info', icon: 'hourglass-empty' };
    case 'QUOTE_RECEIVED':
    case 'SENT':
      return { label: 'Quote Received', tone: 'warning', icon: 'request-quote' };
    case 'READY_TO_CONFIRM':
      return { label: 'Ready to Confirm', tone: 'success', icon: 'check-circle-outline' };
    case 'CONFIRMED':
    case 'ACCEPTED':
      return { label: 'Scheduled', tone: 'success', icon: 'event-available' };
    case 'IN_PROGRESS':
      return { label: 'In Progress', tone: 'info', icon: 'engineering' };
    case 'RESCHEDULE_REQUIRED':
      return { label: 'Reschedule Needed', tone: 'warning', icon: 'update' };
    case 'COMPLETED':
      return { label: 'Completed', tone: 'success', icon: 'task-alt' };
    case 'CANCELLED':
      return { label: 'Cancelled', tone: 'danger', icon: 'cancel' };
    case 'REJECTED':
      return { label: 'Rejected', tone: 'danger', icon: 'block' };
    case 'EXPIRED':
      return { label: 'Expired', tone: 'neutral', icon: 'schedule' };
    default:
      return { label: 'In Progress', tone: 'neutral', icon: 'pending' };
  }
};
