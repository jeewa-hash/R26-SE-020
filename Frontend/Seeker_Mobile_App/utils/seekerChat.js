export async function openProviderConversation({ navigation, createOrGetChat, seekerId, providerId, providerName }) {
  const id = value => String(value?._id || value?.id || value || '');
  const sender = id(seekerId), receiver = id(providerId);
  if (!sender || !receiver) throw new Error('Provider or account details are unavailable. Refresh and try again.');
  const chatId = await createOrGetChat(sender, receiver);
  if (!chatId) throw new Error('Unable to open this conversation. Please try again.');
  navigation.navigate('ChatScreen', { chatId, userId: receiver, userName: providerName || 'Service Provider', userRole: 'ServiceProvider' });
}
