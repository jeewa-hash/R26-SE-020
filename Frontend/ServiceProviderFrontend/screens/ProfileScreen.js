import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials } from '../utils/biometricAuth';
import { CommonActions } from '@react-navigation/native';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003`;
const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

export default function ProfileScreen({ navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [missedServices, setMissedServices] = useState([]);
  const [restrictionInfo, setRestrictionInfo] = useState(null);
  const [providerDetails, setProviderDetails] = useState(null);

  useEffect(() => {
    let intervalId;
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
      fetchMissedServices();
      intervalId = setInterval(() => {
        fetchUnreadCount();
        fetchMissedServices();
      }, 10000);
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (intervalId) clearInterval(intervalId);
    });

    fetchUnreadCount();
    fetchMissedServices();
    intervalId = setInterval(() => {
      fetchUnreadCount();
      fetchMissedServices();
    }, 10000);
    
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
      if (response.ok && Array.isArray(data)) {
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.log('Error fetching notifications count:', err);
    }
  };

  const fetchMissedServices = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${ADMIN_API_URL}/api/inquiries/missed-bookings/${userId}`);
      const data = await response.json();

      if (response.ok && data.success) {
        setMissedServices(data.missedBookings || []);
        setRestrictionInfo({
          isRestricted: data.isRestricted,
          message: data.restrictionMessage,
          unsubmittedCount: data.unsubmittedCount,
          pendingCount: data.pendingInquiriesCount,
          isBlocked: data.provider?.isBlocked,
        });
        setProviderDetails(data.provider);
      }
    } catch (err) {
      console.log('Error fetching missed services:', err.message);
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
    try {
      await clearCredentials();
    } catch (e) {}

    const keysToClear = [
      'userToken',
      'token',
      'authToken',
      'accessToken',
      'userId',
      'providerId',
      'seekerId',
      'userRole',
      'role',
      'user',
      'currentUser',
      'provider',
      'seeker',
    ];
    await AsyncStorage.multiRemove(keysToClear);
    console.log('LOGOUT: all auth keys cleared');
    
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <View style={styles.profileImagePlaceholder}>
              <MaterialIcons name="person" size={60} color="#6366f1" />
            </View>
          </View>
          <Text style={styles.userName}>{providerDetails?.name || 'Work Wave Provider'}</Text>
          <Text style={styles.userEmail}>{providerDetails?.email || 'provider@workwave.com'}</Text>

          {restrictionInfo?.isRestricted && (
            <View style={styles.restrictionBanner}>
              <MaterialIcons name="warning" size={18} color="#dc2626" />
              <Text style={styles.restrictionBannerText}>
                {restrictionInfo.isBlocked 
                  ? 'Account Blocked (Appeal: nethmiumaya5@gmail.com)' 
                  : 'Action Required: Submit Inquiries to restore booking access'}
              </Text>
            </View>
          )}
        </View>

        {/* Missed Services Context Section (Excludes Approved Inquiries) */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="history" size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>MISSED SERVICES CONTEXT</Text>
          </View>

          {missedServices.length > 0 ? (
            <View style={styles.verticalList}>
              {missedServices.map((service, idx) => (
                <View key={service.bookingId || idx} style={styles.serviceRow}>
                  <View style={styles.serviceDot} />
                  <View style={styles.serviceTextContainer}>
                    <Text style={styles.miniCardDate}>{service.date}</Text>
                    <Text style={styles.miniCardInfo}>{service.time} - {service.location}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={[styles.verticalList, { alignItems: 'center', paddingVertical: 20 }]}>
              <MaterialIcons name="check-circle" size={28} color="#10b981" />
              <Text style={{ color: '#10b981', fontWeight: '600', marginTop: 6, fontSize: 13 }}>
                No active penalties or unaddressed cancellations!
              </Text>
            </View>
          )}

          <View style={styles.btnContainer}>
            <TouchableOpacity 
              style={styles.submitInquiryBtn}
              onPress={() => navigation.navigate('SubmitInquiry', { missedServices })}
            >
              <MaterialIcons name="rate-review" size={18} color="#6366f1" />
              <Text style={styles.submitInquiryBtnText}>Submit Inquiries</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Details</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={[styles.iconContainer, { backgroundColor: restrictionInfo?.isRestricted ? '#fee2e2' : '#10b98115' }]}>
                <MaterialIcons 
                  name={restrictionInfo?.isRestricted ? "error-outline" : "verified-user"} 
                  size={22} 
                  color={restrictionInfo?.isRestricted ? "#ef4444" : "#10b981"} 
                />
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>Account Status</Text>
                <Text style={[styles.detailValue, { color: restrictionInfo?.isRestricted ? '#ef4444' : '#111827' }]}>
                  {restrictionInfo?.isBlocked ? 'Suspended (1 Month)' : (restrictionInfo?.isRestricted ? 'Restricted (3 Cancellations)' : 'Verified & Active')}
                </Text>
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
          <Text style={styles.sectionTitle}>Support & Appeal</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="email" size={22} color="#4f46e5" />
                <Text style={styles.menuItemText}>Appeal Email: nethmiumaya5@gmail.com</Text>
              </View>
              <MaterialIcons name="chevron-right" size={20} color="#9ca3af" />
            </TouchableOpacity>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.menuItem}>
              <View style={styles.menuItemLeft}>
                <MaterialIcons name="help-outline" size={22} color="#4b5563" />
                <Text style={styles.menuItemText}>Trust & Governance Rules</Text>
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
  header: { alignItems: 'center', marginBottom: 25, paddingTop: 10 },
  profileImageContainer: { marginBottom: 16 },
  profileImagePlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f3f4ff', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#6366f1' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  userEmail: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  restrictionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  restrictionBannerText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
  },
  section: { marginBottom: 24 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 },
  verticalList: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#f3f4f6', marginBottom: 12 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  serviceDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366f1', marginRight: 10 },
  serviceTextContainer: { flex: 1 },
  miniCardDate: { fontSize: 13, fontWeight: 'bold', color: '#1f2937' },
  miniCardInfo: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  btnContainer: { alignItems: 'center', marginTop: 6 },
  submitInquiryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4ff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  submitInquiryBtnText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
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
  menuItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },
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
