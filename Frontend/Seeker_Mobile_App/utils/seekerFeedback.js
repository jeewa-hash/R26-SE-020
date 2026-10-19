import { Alert, Platform } from 'react-native';

export function showRequestSent(navigation) {
  const message = 'Your request was sent. The provider will review it and send a quotation. Track responses in My Services.';
  if (Platform.OS === 'web') {
    if (window.confirm(`${message}\n\nView My Services now?`)) navigation.navigate('SeekerServices');
  } else {
    Alert.alert('Request sent', message, [
      { text: 'Keep Browsing', style: 'cancel' },
      { text: 'Track Request', onPress: () => navigation.navigate('SeekerServices') },
    ]);
  }
}
