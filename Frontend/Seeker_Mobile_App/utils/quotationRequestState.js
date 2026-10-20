const id = value => String(value?._id || value?.id || value || '');
export const quotationRequestKey = (providerId, sessionId) => `${id(providerId)}:${id(sessionId)}`;
export function quotationRequestKeys(requests = []) {
  return new Set(requests.filter(r => r.providerId && r.sessionId).map(r => quotationRequestKey(r.providerId, r.sessionId)));
}
