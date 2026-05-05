import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAppLockEnabled, setAppLockEnabled, isBiometricAvailable } from '../utils/biometricAuth';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003`;

export default function SettingsScreen({ navigation }) {
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadAppLockState();
  }, []);

  useEffect(() => {
    let intervalId;
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
      intervalId = setInterval(fetchUnreadCount, 10000);
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (intervalId) clearInterval(intervalId);
    });

    fetchUnreadCount();
    intervalId = setInterval(fetchUnreadCount, 10000);
    
    return () => {
      unsubscribe();
      unsubscribeBlur();
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigation]);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.log('Error fetching notifications count:', err);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.bellContainer} 
          onPress={() => navigation.navigate('Notifications')}
        >
          <MaterialIcons name="notifications-none" size={28} color="#333" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, unreadCount]);

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Security</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.info}>
                <View style={[styles.iconContainer, { backgroundColor: appLockEnabled ? '#6366f115' : '#f3f4f6' }]}>
                  <MaterialIcons name={appLockEnabled ? 'lock' : 'lock-open'} size={22} color={appLockEnabled ? '#6366f1' : '#6b7280'} />
                </View>
                <View>
                  <Text style={styles.label}>App Lock</Text>
                  <Text style={styles.status}>{appLockEnabled ? 'Enabled' : 'Disabled'}</Text>
                </View>
              </View>
              <Switch
                value={appLockEnabled}
                onValueChange={toggleAppLock}
                trackColor={{ false: '#e5e7eb', true: '#c7d2fe' }}
                thumbColor={appLockEnabled ? '#6366f1' : '#fff'}
              />
            </View>
            <Text style={styles.description}>
              {appLockEnabled
                ? 'Your app is protected with biometric authentication.'
                : 'Enable to require fingerprint or Face ID when opening the app.'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#111827', marginBottom: 24 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#6b7280', marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconContainer: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 16, fontWeight: '600', color: '#111827' },
  status: { fontSize: 12, color: '#6b7280' },
  description: { fontSize: 13, color: '#6b7280', lineHeight: 18 },
  bellContainer: {
    marginRight: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
