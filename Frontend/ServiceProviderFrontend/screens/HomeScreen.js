import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials, getAppLockEnabled, setAppLockEnabled, isBiometricAvailable } from '../utils/biometricAuth';

export default function HomeScreen({ navigation }) {
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

  const handleLogout = async () => {
    await clearCredentials();
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Provider!</Text>
      <Text style={styles.subtitle}>Your account is verified and active.</Text>

      <View style={styles.lockCard}>
        <View style={styles.lockRow}>
          <View style={styles.lockInfo}>
            <MaterialIcons name={appLockEnabled ? 'lock' : 'lock-open'} size={22} color="#6366f1" />
            <Text style={styles.lockLabel}>App Lock</Text>
          </View>
          <Switch
            value={appLockEnabled}
            onValueChange={toggleAppLock}
            trackColor={{ false: '#ccc', true: '#6366f1' }}
            thumbColor={appLockEnabled ? '#fff' : '#f4f3f4'}
          />
        </View>
        <Text style={styles.lockDescription}>
          {appLockEnabled
            ? 'Your app is protected with biometric authentication.'
            : 'Enable to require fingerprint or Face ID when opening the app.'}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  lockCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  lockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  lockInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  lockDescription: {
    fontSize: 13,
    color: '#888',
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
