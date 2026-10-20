// screens/CheckoutScreen.jsx
import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function CheckoutScreen({ route, navigation }) {
  const { checkoutUrl, postId } = route.params;

  const handleRedirect = (url) => {
    console.log('[Checkout] navigation URL:', url);
    const isSuccess = url.includes('payment-success') || url.includes('billing-success');
    const isCancel = url.includes('payment-cancelled') || url.includes('billing-cancelled');

    if (isSuccess) {
      try {
        // URL() is not consistently available for custom schemes on Android.
        const sessionId = url.match(/[?&]session_id=([^&]+)/)?.[1] || null;
        navigation.replace('BoostSuccess', {
          sessionId: sessionId ? decodeURIComponent(sessionId) : null,
          postId,
          isBilling: url.includes('billing-success'),
        });
      } catch (e) {
        navigation.goBack();
      }
      return false;
    }

    if (isCancel) {
      navigation.goBack();
      return false;
    }

    return true;
  };

  const handleNavigationChange = (navState) => {
    // Intercept success/cancel redirect URLs before the WebView tries to load them
    handleRedirect(navState.url);
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: checkoutUrl }}
        originWhitelist={['*']}
        onShouldStartLoadWithRequest={(request) => handleRedirect(request.url)}
        onOpenWindow={(event) => handleRedirect(event.nativeEvent.targetUrl)}
        onNavigationStateChange={handleNavigationChange}
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { flex: 1 } });
