const id = value => String(value?._id || value?.id || value || '');
const readable = value => typeof value === 'string' && value.trim() && !/^[a-f\d]{24}$/i.test(value.trim()) && !/^provider(?:\s*[·-].*)?$/i.test(value.trim());
export function attachProviderIdentity(request, providers = []) {
  const provider = providers.find(row => id(row) === id(request.providerId));
  if (!provider) return request;
  // Attach display data only; never copy private account fields into a session.
  const name = [provider.fullName, provider.name, provider.businessName].find(readable);
  return { ...request, providerSnapshot: { ...request.providerSnapshot, ...(name ? { name } : {}), businessName: provider.businessName || request.providerSnapshot?.businessName || '', district: provider.district || request.providerSnapshot?.district || '', profileImage: provider.profileImage || request.providerSnapshot?.profileImage || '' } };
}
export function providerDisplayName(request) {
  const populated = typeof request.providerId === 'object' ? request.providerId : {};
  return [request.providerSnapshot?.name, request.providerSnapshot?.fullName, request.providerName, request.provider?.fullName, request.provider?.name, populated.fullName, populated.name, request.providerSnapshot?.businessName, request.businessName].find(readable) || 'Service provider';
}
