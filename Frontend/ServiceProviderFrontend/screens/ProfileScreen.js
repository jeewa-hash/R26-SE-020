import React, { useState, useEffect, useLayoutEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Surface } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials } from '../utils/biometricAuth';
import { CommonActions } from '@react-navigation/native';
import { IP_ADDRESS } from '../config';
import { ThemeContext } from '../context/ThemeContext';

const API_URL = `http://${IP_ADDRESS}:4003`;
const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;
const { width } = Dimensions.get('window');

export default function ProfileScreen({ navigation }) {
  const { isDark, toggleTheme } = useContext(ThemeContext) || { isDark: false, toggleTheme: () => {} };
  const [unreadCount, setUnreadCount] = useState(0);
  const [missedServices, setMissedServices] = useState([]);
  const [restrictionInfo, setRestrictionInfo] = useState(null);
  const [providerDetails, setProviderDetails] = useState(null);

  const T = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
    cardBorder: isDark ? '#334155' : '#F1F5F9',
    textPrimary: isDark ? '#F1F5F9' : '#1E293B',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    divider: isDark ? '#334155' : '#F1F5F9',
    iconBg: isDark ? '#1E293B' : '#F8FAFC',
  };

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
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data)) {
        setUnreadCount(data.filter(n => !n.isRead).length);
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
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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
      CommonActions.reset({ index: 0, routes: [{ name: 'Login' }] })
    );
  };

  const getInitials = (name) => {
    if (!name) return 'WW';
    return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
  };

  const accountStatus = restrictionInfo?.isBlocked
    ? { label: 'Suspended', color: '#DC2626', bg: '#FEE2E2', icon: 'block' }
    : restrictionInfo?.isRestricted
    ? { label: 'Restricted', color: '#D97706', bg: '#FEF3C7', icon: 'warning' }
    : { label: 'Verified & Active', color: '#10B981', bg: '#D1FAE5', icon: 'verified-user' };

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* ── Gradient Hero Banner ── */}
        <LinearGradient
          colors={isDark ? ['#312E81', '#4C1D95', '#6D28D9'] : ['#4F46E5', '#7C3AED', '#9333EA']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          {/* Decorative orbs */}
          <View style={styles.heroOrb1} />
          <View style={styles.heroOrb2} />

          {/* Top row: title + theme toggle */}
          <View style={styles.heroTopBar}>
            <Text style={styles.heroTopTitle}>My Profile</Text>
            <TouchableOpacity onPress={toggleTheme} style={styles.heroIconBtn} activeOpacity={0.8}>
              <MaterialCommunityIcons
                name={isDark ? 'weather-sunny' : 'weather-night'}
                size={20}
                color="#FFF"
              />
            </TouchableOpacity>
          </View>

          {/* Avatar */}
          <View style={styles.avatarWrapper}>
            <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0.15)']} style={styles.avatarRing}>
              <View style={styles.avatarInner}>
                <Text style={styles.avatarInitials}>{getInitials(providerDetails?.name)}</Text>
              </View>
            </LinearGradient>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.heroName}>{providerDetails?.name || 'Work Wave Provider'}</Text>
          <Text style={styles.heroEmail}>{providerDetails?.email || 'provider@workwave.com'}</Text>

          {/* Role badge */}
          <View style={styles.roleBadge}>
            <MaterialCommunityIcons name="briefcase-check" size={13} color="#C4B5FD" />
            <Text style={styles.roleBadgeText}>Service Provider</Text>
          </View>

          {/* Restriction alert chip */}
          {restrictionInfo?.isRestricted && (
            <View style={[
              styles.restrictionChip,
              { backgroundColor: restrictionInfo.isBlocked ? 'rgba(220,38,38,0.4)' : 'rgba(217,119,6,0.4)' }
            ]}>
              <MaterialIcons name="warning" size={14} color="#FFF" />
              <Text style={styles.restrictionChipText} numberOfLines={2}>
                {restrictionInfo.isBlocked
                  ? 'Account Blocked — Appeal: nethmiumaya5@gmail.com'
                  : 'Action Required: Submit Inquiries to restore booking access'}
              </Text>
            </View>
          )}
        </LinearGradient>

        <View style={styles.bodyPad}>

          {/* ── Quick Stats Row ── */}
          <View style={styles.statsRow}>
            <Surface style={[styles.statCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]} elevation={1}>
              <View style={[styles.statIconWrap, { backgroundColor: '#10B98115' }]}>
                <MaterialCommunityIcons name="star" size={20} color="#10B981" />
              </View>
              <Text style={[styles.statNumber, { color: T.textPrimary }]}>4.8</Text>
              <Text style={[styles.statLabel, { color: T.textSecondary }]}>Rating</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]} elevation={1}>
              <View style={[styles.statIconWrap, { backgroundColor: '#6366F115' }]}>
                <MaterialCommunityIcons name="briefcase-check" size={20} color="#6366F1" />
              </View>
              <Text style={[styles.statNumber, { color: T.textPrimary }]}>150</Text>
              <Text style={[styles.statLabel, { color: T.textSecondary }]}>Total Jobs</Text>
            </Surface>

            <Surface style={[styles.statCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]} elevation={1}>
              <View style={[styles.statIconWrap, { backgroundColor: '#F59E0B15' }]}>
                <MaterialCommunityIcons name="bell-badge" size={20} color="#F59E0B" />
              </View>
              <Text style={[styles.statNumber, { color: T.textPrimary }]}>{unreadCount}</Text>
              <Text style={[styles.statLabel, { color: T.textSecondary }]}>Alerts</Text>
            </Surface>
          </View>

          {/* ── Account Status Card ── */}
          <View style={styles.sectionLabel}>
            <Text style={[styles.sectionLabelText, { color: T.textMuted }]}>ACCOUNT</Text>
          </View>
          <Surface style={[styles.infoCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]} elevation={1}>
            <View style={styles.infoRow}>
              <View style={[styles.infoIconWrap, { backgroundColor: accountStatus.bg }]}>
                <MaterialIcons name={accountStatus.icon} size={22} color={accountStatus.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.infoRowLabel, { color: T.textSecondary }]}>Account Status</Text>
                <Text style={[styles.infoRowValue, { color: accountStatus.color }]}>{accountStatus.label}</Text>
              </View>
              <View style={[styles.statusPill, { backgroundColor: accountStatus.bg }]}>
                <Text style={[styles.statusPillText, { color: accountStatus.color }]}>
                  {accountStatus.label.split(' ')[0].toUpperCase()}
                </Text>
              </View>
            </View>
          </Surface>

          {/* ── Missed Services Panel ── */}
          <View style={styles.sectionLabel}>
            <Text style={[styles.sectionLabelText, { color: T.textMuted }]}>MISSED SERVICES CONTEXT</Text>
          </View>
          <Surface style={[styles.infoCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]} elevation={1}>
            {missedServices.length > 0 ? (
              missedServices.map((service, idx) => (
                <View
                  key={service.bookingId || idx}
                  style={[
                    styles.missedRow,
                    {
                      borderBottomColor: T.divider,
                      borderBottomWidth: idx < missedServices.length - 1 ? 1 : 0,
                    },
                  ]}
                >
                  <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.missedDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.missedDate, { color: T.textPrimary }]}>{service.date}</Text>
                    <Text style={[styles.missedInfo, { color: T.textSecondary }]}>
                      {service.time} — {service.location}
                    </Text>
                  </View>
                  <View style={styles.missedBadge}>
                    <Text style={styles.missedBadgeText}>MISSED</Text>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.allClearRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <MaterialIcons name="check-circle" size={22} color="#10B981" />
                </View>
                <Text style={[styles.allClearText, { color: '#10B981' }]}>
                  No penalties or unaddressed cancellations!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.inquiryBtn}
              onPress={() => navigation.navigate('SubmitInquiry', { missedServices })}
              activeOpacity={0.8}
            >
              <MaterialIcons name="rate-review" size={17} color="#7C3AED" />
              <Text style={styles.inquiryBtnText}>Submit Inquiries</Text>
            </TouchableOpacity>
          </Surface>

          {/* ── Settings & Support ── */}
          <View style={styles.sectionLabel}>
            <Text style={[styles.sectionLabelText, { color: T.textMuted }]}>SETTINGS & SUPPORT</Text>
          </View>
          <Surface style={[styles.infoCard, { backgroundColor: T.cardBg, borderColor: T.cardBorder }]} elevation={1}>

            {/* Theme toggle row */}
            <TouchableOpacity style={styles.menuRow} onPress={toggleTheme} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: isDark ? '#FBBF2418' : '#6366F115' }]}>
                <MaterialCommunityIcons
                  name={isDark ? 'weather-sunny' : 'weather-night'}
                  size={20}
                  color={isDark ? '#FBBF24' : '#6366F1'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuRowTitle, { color: T.textPrimary }]}>
                  {isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                </Text>
                <Text style={[styles.menuRowSub, { color: T.textSecondary }]}>Change app appearance</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={T.textMuted} />
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: T.divider }]} />

            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#3B82F615' }]}>
                <MaterialIcons name="email" size={20} color="#3B82F6" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuRowTitle, { color: T.textPrimary }]}>Appeal Email</Text>
                <Text style={[styles.menuRowSub, { color: T.textSecondary }]}>nethmiumaya5@gmail.com</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={T.textMuted} />
            </TouchableOpacity>

            <View style={[styles.menuDivider, { backgroundColor: T.divider }]} />

            <TouchableOpacity style={styles.menuRow} activeOpacity={0.7}>
              <View style={[styles.menuIconWrap, { backgroundColor: '#10B98115' }]}>
                <MaterialIcons name="help-outline" size={20} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuRowTitle, { color: T.textPrimary }]}>Trust & Governance Rules</Text>
                <Text style={[styles.menuRowSub, { color: T.textSecondary }]}>Platform policies & guidelines</Text>
              </View>
              <MaterialIcons name="chevron-right" size={22} color={T.textMuted} />
            </TouchableOpacity>
          </Surface>

          {/* ── Logout Button ── */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutWrap} activeOpacity={0.85}>
            <LinearGradient
              colors={['#DC2626', '#B91C1C']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.logoutBtn}
            >
              <MaterialCommunityIcons name="logout-variant" size={20} color="#FFF" />
              <Text style={styles.logoutText}>Log Out</Text>
            </LinearGradient>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Hero Banner
  heroBanner: {
    paddingTop: 54,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  heroOrb1: {
    position: 'absolute', top: -40, right: -40,
    width: 180, height: 180, borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  heroOrb2: {
    position: 'absolute', bottom: -20, left: -30,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  heroTopBar: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  heroTopTitle: { fontSize: 20, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 },
  heroIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarWrapper: { position: 'relative', marginBottom: 14 },
  avatarRing: {
    width: 96, height: 96, borderRadius: 48,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarInner: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 32, fontWeight: '900', color: '#FFF' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: '#10B981', borderWidth: 3, borderColor: '#6D28D9',
  },
  heroName: { fontSize: 22, fontWeight: '900', color: '#FFF', letterSpacing: -0.3 },
  heroEmail: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 3, marginBottom: 10 },
  roleBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 10,
  },
  roleBadgeText: { fontSize: 12, fontWeight: '700', color: '#E9D5FF' },
  restrictionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 9,
    borderRadius: 14, marginTop: 8,
    width: '100%',
  },
  restrictionChipText: { fontSize: 12, fontWeight: '700', color: '#FFF', flex: 1 },

  bodyPad: { paddingHorizontal: 18, paddingTop: 20 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 22 },
  statCard: {
    flex: 1, borderRadius: 20, padding: 14,
    alignItems: 'center', borderWidth: 1,
  },
  statIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  statNumber: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 11, fontWeight: '600', marginTop: 2, textAlign: 'center' },

  // Section label
  sectionLabel: { marginBottom: 8, marginLeft: 2 },
  sectionLabelText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },

  // Info Card
  infoCard: { borderRadius: 20, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  infoRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 14 },
  infoIconWrap: {
    width: 44, height: 44, borderRadius: 14,
    justifyContent: 'center', alignItems: 'center',
  },
  infoRowLabel: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  infoRowValue: { fontSize: 15, fontWeight: '800' },
  statusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  statusPillText: { fontSize: 10, fontWeight: '900' },

  // Missed services
  missedRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12, gap: 12,
  },
  missedDot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  missedDate: { fontSize: 13, fontWeight: '700' },
  missedInfo: { fontSize: 11, marginTop: 2 },
  missedBadge: {
    backgroundColor: '#FEE2E2', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  missedBadgeText: { fontSize: 9, fontWeight: '800', color: '#DC2626' },
  allClearRow: {
    flexDirection: 'row', alignItems: 'center',
    padding: 16, gap: 12,
  },
  allClearText: { fontSize: 13, fontWeight: '700', flex: 1 },
  inquiryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, margin: 14, marginTop: 6,
    backgroundColor: '#7C3AED12',
    paddingVertical: 10, borderRadius: 12,
  },
  inquiryBtnText: { fontSize: 13, fontWeight: '800', color: '#7C3AED' },

  // Menu rows
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  menuIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    justifyContent: 'center', alignItems: 'center',
  },
  menuRowTitle: { fontSize: 14, fontWeight: '700' },
  menuRowSub: { fontSize: 12, marginTop: 1 },
  menuDivider: { height: 1, marginHorizontal: 16 },

  // Logout
  logoutWrap: { borderRadius: 18, overflow: 'hidden', marginTop: 8 },
  logoutBtn: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    paddingVertical: 16, gap: 10,
  },
  logoutText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
