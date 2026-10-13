export const buildQuotationPayload = ({
  request,
  providerId,
  price,
  proposedStartTime,
  notes,
}) => {
  const reqId =
    request?._id ||
    request?.id ||
    request?.providerRequestId ||
    request?.requestQuotationId ||
    request?.externalRequestQuotationId;

  return {
    providerRequestId: reqId,
    externalRequestQuotationId: reqId,

    externalSessionId:
      request?.sessionId ||
      request?.externalSessionId ||
      request?.serviceSessionId ||
      request?.session?._id ||
      request?.session?.id ||
      reqId,

    seekerId:
      request?.seekerId ||
      request?.customerId ||
      request?.userId ||
      request?.seeker?._id ||
      request?.seeker?.id,

    providerId,

    serviceCategory:
      request?.category ||
      request?.serviceCategory ||
      request?.detectedCategory ||
      'General',

    serviceSubcategory:
      request?.subcategory ||
      request?.serviceSubcategory ||
      request?.object ||
      request?.detectedObject ||
      'Service',

    price: Number(price || 0),

    // Only start time comes from the provider.
    proposedStartTime,

    notes: notes || '',

    status: 'SENT',
  };
};