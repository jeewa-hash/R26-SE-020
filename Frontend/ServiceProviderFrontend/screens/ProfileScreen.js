import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials } from '../utils/biometricAuth';
import { CommonActions } from '@react-navigation/native';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003`;

export default function ProfileScreen({ navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);

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

  const handleLogout = async () => {
    await clearCredentials();
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImagePlaceholder}>
              <MaterialIcons name="person" size={60} color="#6366f1" />
            </View>
          </View>
          <Text style={styles.userName}>Work Wave Provider</Text>
          <Text style={styles.userEmail}>provider@workwave.com</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={[styles.iconContainer, { backgroundColor: '#10b98115' }]}>
                <MaterialIcons name="verified-user" size={22} color="#10b981" />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Account Status</Text>
                <Text style={styles.detailValue}>Verified & Active</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>150</Text>
              <Text style={styles.statLabel}>Total Jobs</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="help-outline" size={22} color="#4b5563" />
                <Text style={styles.menuItemText}>Help Center</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="info-outline" size={22} color="#4b5563" />
                <Text style={styles.menuItemText}>About Work Wave</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={20} color="#fff" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 30, paddingTop: 10 },
  profileImageContainer: { marginBottom: 16 },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4ff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#6366f1' },
  userName: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  userEmail: { fontSize: 16, color: '#6b7280', marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#9ca3af', marginBottom: 12, marginLeft: 4, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  detailInfo: { flex: 1 },
  detailLabel: { fontSize: 12, color: '#6b7280', marginBottom: 2 },
  detailValue: { fontSize: 15, color: '#111827', fontWeight: '600' },
  statsGrid: { flexDirection: 'row', gap: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 20, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
  statNumber: { fontSize: 20, fontWeight: 'bold', color: '#6366f1', marginBottom: 4 },
  statLabel: { fontSize: 12, color: '#6b7280', fontWeight: '500' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuItemText: { fontSize: 15, color: '#374151', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f3f4f6', marginVertical: 4 },
  logoutButton: { backgroundColor: '#fee2e2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8, marginTop: 10, marginBottom: 30 },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
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
