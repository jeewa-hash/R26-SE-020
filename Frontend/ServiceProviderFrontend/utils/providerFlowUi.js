import { Alert, Platform } from 'react-native';

export const notify = (title, message) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};
export const confirm = (title, message, onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
  } else Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' }, { text: title, onPress: onConfirm },
  ]);
};
export const openProviderTab = (navigation, screen, params) => {
  let root = navigation;
  while (root.getParent?.()) root = root.getParent();
  if (root.popTo) root.popTo('Main', { screen, params });
  else root.navigate('Main', { screen, params });
};
export const openProviderInbox = navigation => openProviderTab(navigation, 'HomeTab', { screen: 'InboxScreen' });

export const openProviderChat = (navigation, receiverId, customer) => {
  const id = String(receiverId?._id || receiverId?.id || receiverId || '');
  if (!id) return openProviderInbox(navigation);
  openProviderTab(navigation, 'HomeTab', { screen: 'ChatScreen', params: { receiverId: id, customer } });
};
