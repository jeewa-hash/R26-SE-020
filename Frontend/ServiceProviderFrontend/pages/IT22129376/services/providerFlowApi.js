export const buildQuotationPayload = ({
  request,
  providerId,
  price,
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

    // Start time belongs to the seeker request.
    proposedStartTime: request?.preferredStartTime,

    notes: notes || '',

    status: 'SENT',
  };
};