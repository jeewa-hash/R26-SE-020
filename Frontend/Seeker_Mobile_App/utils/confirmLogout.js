import { Alert, Platform } from 'react-native';

export const confirmLogout = (onConfirm) => {
  if (Platform.OS === 'web') {
    if (window.confirm('Are you sure you want to logout?')) {
      void onConfirm();
    }
    return;
  }

  Alert.alert('Logout', 'Are you sure you want to logout?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Logout', style: 'destructive', onPress: onConfirm },
  ]);
};
