import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { getAppLockEnabled, setAppLockEnabled, isBiometricAvailable } from '../utils/biometricAuth';

export default function SettingsScreen({ isDark = false }) {
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  useEffect(() => {
    loadAppLockState();
  }, []);

  const loadAppLockState = async () => {
    const enabled = await getAppLockEnabled();
    const bioAvailable = await isBiometricAvailable();
    setAppLockEnabledState(enabled);
    setHasBiometric(bioAvailable);
  };

  const toggleAppLock = async (value) => {
    if (value && !hasBiometric) {
      Alert.alert('Not Available', 'Biometric authentication is not available on this device.');
      return;
    }
    setAppLockEnabledState(value);
    await setAppLockEnabled(value);
    Alert.alert('App Lock', value ? 'App Lock is now enabled' : 'App Lock is now disabled');
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.row}>
        <View style={[styles.iconContainer, { backgroundColor: appLockEnabled ? (isDark ? '#26215C' : '#EEF0FF') : (isDark ? '#2c2c2e' : '#f3f4f6') }]}>
          <MaterialIcons
            name={appLockEnabled ? 'lock' : 'lock-open'}
            size={20}
            color={appLockEnabled ? (isDark ? '#AFA9EC' : '#6366f1') : (isDark ? '#8E8E93' : '#6b7280')}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: isDark ? '#F2F2F7' : '#111827' }]}>App Lock</Text>
          <Text style={[styles.status, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
            {appLockEnabled ? 'Enabled' : 'Disabled'}
          </Text>
        </View>
        <Switch
          value={appLockEnabled}
          onValueChange={toggleAppLock}
          trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
          thumbColor="#fff"
          style={{ transform: [{ scale: 0.85 }] }}
        />
      </View>
      <Text style={[styles.description, { color: isDark ? '#8E8E93' : '#6b7280' }]}>
        {appLockEnabled
          ? 'Your app is protected with biometric authentication.'
          : 'Enable to require fingerprint or Face ID when opening the app.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingLeft: 50, paddingRight: 16, paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  iconContainer: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, fontWeight: '600' },
  status: { fontSize: 12, marginTop: 1 },
  description: { fontSize: 12, lineHeight: 16, marginTop: 6 },
});