// screens/CheckoutScreen.jsx
import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function CheckoutScreen({ route, navigation }) {
  const { checkoutUrl } = route.params;

  const handleNavigationChange = (navState) => {
    // Intercept success/cancel redirect URLs before the WebView tries to load them
    if (navState.url.includes('/payment-success') || navState.url.includes('/billing-success')) {
      try {
        const urlObj = new URL(navState.url);
        const sessionId = urlObj.searchParams.get('session_id');
        navigation.replace('BoostSuccess', {
          sessionId,
          isBilling: navState.url.includes('/billing-success'),
        });
      } catch (e) {
        navigation.goBack();
      }
    } else if (
      navState.url.includes('/payment-cancelled') ||
      navState.url.includes('/billing-cancelled')
    ) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: checkoutUrl }}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });