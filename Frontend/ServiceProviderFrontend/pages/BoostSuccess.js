// pages/BoostSuccess.js
import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, StatusBar } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors } from '../theme';
import { ThemeContext } from '../context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

export default function BoostSuccessScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { sessionId, isBilling } = route.params || {};
  const [confirming, setConfirming] = React.useState(true);
  const [successMessage, setSuccessMessage] = React.useState('');

  const C = isDark
    ? { bg: '#0f0f0f', text: '#F2F2F7', textSub: '#8E8E93' }
    : { bg: '#F8FAFC', text: '#111111', textSub: '#6B7280' };

  React.useEffect(() => {
    const confirmPayment = async () => {
      if (!sessionId) {
        setConfirming(false);
        return;
      }
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (isBilling) {
          const res = await fetch(
            `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/billing/confirm-payment/${encodeURIComponent(sessionId)}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          const data = await res.json();
          setSuccessMessage(
            data?.message || 'Monthly platform service charge payment completed successfully! Full feature access restored.'
          );
        } else {
          await fetch(
            `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/confirm-payment/${encodeURIComponent(sessionId)}`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }
          );
          setSuccessMessage('Your ad priority has been updated.');
        }
      } catch (error) {
        console.warn('Payment confirmation failed:', error.message);
      } finally {
        setConfirming(false);
      }
    };
    confirmPayment();
  }, [sessionId, isBilling]);

  const handleDone = () => {
    if (isBilling) {
      navigation.replace('Main', { screen: 'Earnings' });
    } else {
      navigation.replace('Main', { screen: 'Profile' });
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {confirming ? (
        <>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.title, { color: C.text }]}>Confirming Payment...</Text>
        </>
      ) : (
        <>
          <MaterialCommunityIcons
            name={isBilling ? 'check-decagram' : 'rocket-launch'}
            size={64}
            color={Colors.primary}
          />
          <Text style={[styles.title, { color: C.text }]}>
            {isBilling ? 'Service Charge Paid!' : 'Boost Successful!'}
          </Text>
          <Text style={[styles.subtitle, { color: C.textSub }]}>
            {successMessage || (isBilling ? 'Your account is in good standing and all features are unlocked.' : 'Your ad priority has been boosted.')}
          </Text>

          <TouchableOpacity style={styles.doneBtn} onPress={handleDone} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>
              {isBilling ? 'Back to Earnings' : 'Back to My Posts'}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 16, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 20 },
  doneBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});

