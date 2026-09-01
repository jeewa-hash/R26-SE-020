import { COLORS } from '../theme';

export const getId = (item) => item?._id || item?.id || item?.bookingId || item?.quotationId || item?.requestQuotationId || '';

export const getRequestId = (request) => request?._id || request?.id || request?.requestQuotationId || request?.externalRequestQuotationId || '';

export const getQuotationId = (quotation) => quotation?._id || quotation?.id || quotation?.externalQuotationId || quotation?.quotationId || '';

export const getQuotationRequestId = (quotation) => quotation?.externalRequestQuotationId || quotation?.requestQuotationId || quotation?.providerRequestId || quotation?.requestId || '';

export const getBookingId = (booking) => booking?._id || booking?.id || booking?.bookingId || '';

export const getBookingStart = (booking) => booking?.scheduledStartTime || booking?.coordinatedStartTime || booking?.scheduledDateTime || booking?.scheduledAt || booking?.startTime || booking?.createdAt;

export const getBookingEnd = (booking) => booking?.endTime || booking?.scheduledEndTime || booking?.coordinatedEndTime || booking?.estimatedEndTime;

export const getServiceTitle = (item) => item?.serviceSubcategory || item?.serviceSubCategory || item?.subcategory || item?.object || item?.detectedObject || item?.title || item?.serviceCategory || item?.category || 'Service Job';

export const getServiceCategory = (item) => item?.serviceCategory || item?.category || item?.detectedCategory || item?.serviceType || 'Local Service';

export const getSeekerName = (item) => item?.seekerSnapshot?.name || item?.customerSnapshot?.name || item?.seekerName || item?.customerName || 'You';

export const getLocation = (item) => item?.serviceLocation?.address || item?.serviceLocation?.district || item?.location?.address || item?.district || item?.address || 'Location not available';

export const getStatus = (item) => String(item?.status || item?.bookingStatus || item?.currentStatus || item?.coordinationStatus || 'PENDING').toUpperCase();

export const getBookingStatus = (booking) => String(booking?.bookingStatus || 'CONFIRMED').toUpperCase();

export const getStatusStyle = (status) => {
  const value = String(status || '').toUpperCase();
  if (value === 'CAN_ACCEPT') return { label: 'Available', bg: COLORS.successSoft, color: COLORS.success };
  if (value === 'AVAILABLE_WITH_CAUTION') return { label: 'Available with Caution', bg: COLORS.warningSoft, color: COLORS.warning };
  if (value.includes('CONFLICT')) return { label: 'Time Conflict', bg: COLORS.dangerSoft, color: COLORS.danger };
  if (value.includes('COMPLETED')) return { label: 'Completed', bg: COLORS.successSoft, color: COLORS.success };
  if (value.includes('ON_THE_WAY')) return { label: 'On the Way', bg: COLORS.infoSoft, color: COLORS.info };
  if (value.includes('IN_PROGRESS')) return { label: 'In Progress', bg: COLORS.infoSoft, color: COLORS.info };
  if (value.includes('ACCEPTED')) return { label: 'Booking Confirmed', bg: COLORS.successSoft, color: COLORS.success };
  if (value.includes('CONFIRMED')) return { label: 'Scheduled', bg: COLORS.successSoft, color: COLORS.success };
  if (value.includes('SENT')) return { label: 'Waiting for Seeker', bg: COLORS.infoSoft, color: COLORS.info };
  if (value.includes('RESCHEDULE_REQUESTED')) return { label: 'Reschedule Pending', bg: COLORS.warningSoft, color: COLORS.warning };
  if (value.includes('RESCHEDULE')) return { label: 'Reschedule', bg: COLORS.warningSoft, color: COLORS.warning };
  if (value.includes('DELAY')) return { label: 'Delay Reported', bg: COLORS.warningSoft, color: COLORS.warning };
  if (value.includes('REJECT')) return { label: 'Not Selected', bg: COLORS.dangerSoft, color: COLORS.danger };
  if (value.includes('CANCEL')) return { label: 'Cancelled', bg: COLORS.dangerSoft, color: COLORS.danger };
  if (value.includes('EXPIRED')) return { label: 'Expired', bg: COLORS.dangerSoft, color: COLORS.danger };
  return { label: 'Pending Request', bg: COLORS.warningSoft, color: COLORS.warning };
};

export const getRiskStyle = (risk) => {
  const value = String(risk || '').toUpperCase();
  if (value.includes('HIGH')) return { label: 'High Risk', bg: COLORS.dangerSoft, color: COLORS.danger };
  if (value.includes('MEDIUM')) return { label: 'Medium Risk', bg: COLORS.warningSoft, color: COLORS.warning };
  return { label: 'Low Risk', bg: COLORS.successSoft, color: COLORS.success };
};

export const isClosedBooking = (booking) => {
  const status = getBookingStatus(booking);
  return status === 'COMPLETED' || status === 'CANCELLED';
};

export const normalizeRequest = (request) => ({
  ...request,
  id: getRequestId(request),
  title: getServiceTitle(request),
  category: getServiceCategory(request),
  seekerName: getSeekerName(request),
  locationText: getLocation(request),
});

export const normalizeQuotation = (quotation, requests = []) => {
  const requestId = getQuotationRequestId(quotation);
  const request = requests.find((item) => getRequestId(item) === requestId);
  return {
    ...quotation,
    id: getQuotationId(quotation),
    request,
    title: getServiceTitle(quotation) || getServiceTitle(request),
    category: getServiceCategory(quotation) || getServiceCategory(request),
    seekerName: getSeekerName(quotation) || getSeekerName(request),
    price: quotation?.price || quotation?.quotedPrice || quotation?.finalAmount || 0,
  };
};

export const normalizeBooking = (booking) => ({
  ...booking,
  id: getBookingId(booking),
  title: getServiceTitle(booking),
  category: getServiceCategory(booking),
  seekerName: getSeekerName(booking),
  startTime: getBookingStart(booking),
  endTime: getBookingEnd(booking),
  locationText: getLocation(booking),
});
