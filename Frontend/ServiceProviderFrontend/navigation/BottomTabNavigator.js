import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // Added Stack
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

import { ThemeContext } from '../context/ThemeContext';
import { IP_ADDRESS } from '../config';
import { clearCredentials } from '../utils/biometricAuth';

const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

// Import Screens
import NewsFeedScreen from '../pages/NewsFeedScreen';
import BookingsScreen from '../pages/BookingsScreen';
import EarningsScreen from '../pages/EarningsScreen';
import ProfileScreen from '../pages/ProfileScreen';
import ChatScreen from '../pages/ChatScreen'; // Added
import QuotationTemplate from '../pages/QuotationTemplate'; // Added
import NotificationsScreen from '../pages/NotificationsScreen'; // Added
import InboxScreen from '../pages/InboxScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Sub-Stack for News/Notifications ────────────────────────────────────────
// This ensures that when you navigate to Chat or Quotation, the Footer stays!
function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="NewsFeedMain" component={NewsFeedScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="QuotationTemplate" component={QuotationTemplate} />
      <Stack.Screen name="InboxScreen" component={InboxScreen} />
    </Stack.Navigator>
  );
}

// ─── Tab config ───────────────────────────────────────────────────────────────
const TABS = [
  { name: 'HomeTab', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'Bookings', label: 'Bookings', icon: 'calendar-outline', iconActive: 'calendar' },
  { name: 'Earnings', label: 'Earnings', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'Profile', label: 'Profile', icon: 'account-outline', iconActive: 'account' },
];

// Note: HomeTab now points to the HomeStack component
const SCREENS = {
  HomeTab: HomeStack, 
  Bookings: BookingsScreen,
  Earnings: EarningsScreen,
  Profile: ProfileScreen,
};

// ─── Palettes ─────────────────────────────────────────────────────────────────
const LIGHT = {
  bar: '#FFFFFF',
  border: '#EBEBEB',
  activeIcon: '#534AB7',
  activeBg: '#EEF0FF',
  activeLabel: '#534AB7',
  inactiveIcon: '#AAAAAA',
  inactiveLabel: '#AAAAAA',
};

const DARK = {
  bar: '#1C1C1E',
  border: '#2C2C2E',
  activeIcon: '#AFA9EC',
  activeBg: '#26215C',
  activeLabel: '#AFA9EC',
  inactiveIcon: '#48484A',
  inactiveLabel: '#48484A',
};

// ─── Tab icon component ───────────────────────────────────────────────────────
function TabItem({ label, icon, iconActive, focused, C, hasNotif }) {
  const iconName = focused ? iconActive : icon;

  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && { backgroundColor: C.activeBg }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={focused ? C.activeIcon : C.inactiveIcon}
        />
        {hasNotif && !focused && <View style={styles.notifDot} />}
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? C.activeLabel : C.inactiveLabel },
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

// ─── Navigator ────────────────────────────────────────────────────────────────
export default function BottomTabNavigator() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? DARK : LIGHT;
  const navigation = useNavigation();
  const isLoggingOutRef = useRef(false);
  const [activeAlertBanner, setActiveAlertBanner] = useState(null);
  const seenNotificationIdsRef = useRef(new Set());

  // Security Watchdog: Periodically check suspension & new approval/rejection notifications without refresh
  useEffect(() => {
    const checkStatusAndNotifications = async () => {
      if (isLoggingOutRef.current) return;
      try {
        const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';
        if (!userId) return;

        // 1. Check Suspension Status
        const response = await fetch(`${ADMIN_API_URL}/api/inquiries/provider-status/${userId}`);
        const data = await response.json();

        if (response.ok && data.isBlocked) {
          isLoggingOutRef.current = true;
          const untilDate = data.blockedUntil ? new Date(data.blockedUntil).toLocaleDateString() : 'Admin unlocks';

          await AsyncStorage.removeItem('userToken');
          await AsyncStorage.removeItem('userRole');
          await AsyncStorage.removeItem('userId');
          await clearCredentials();

          Alert.alert(
            '⚠️ Account Suspended',
            `Your account has been suspended for 1 Month (30 Days) due to 3 consecutive inquiry rejections. Access is restricted until ${untilDate}.\n\nYou have been logged out.`,
            [
              {
                text: 'OK',
                onPress: () => {
                  navigation.reset({
                    index: 0,
                    routes: [{ name: 'Login' }],
                  });
                },
              },
            ],
            { cancelable: false }
          );

          navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
          return;
        }

        // 2. Check for New Unread Approval & Rejection Notifications (Real-time without refresh)
        const notifRes = await fetch(`${ADMIN_API_URL}/api/inquiries/notifications/${userId}`);
        const notifData = await notifRes.json();
        if (notifRes.ok && Array.isArray(notifData.data)) {
          const unreadNotifs = notifData.data.filter(
            (n) =>
              !n.isRead &&
              (n.type === 'inquiry_rejected' || n.type === 'inquiry_approved') &&
              !seenNotificationIdsRef.current.has(n._id)
          );
          if (unreadNotifs.length > 0) {
            const latestNotif = unreadNotifs[0];
            seenNotificationIdsRef.current.add(latestNotif._id);
            setActiveAlertBanner(latestNotif);
          }
        }
      } catch (err) {
        // silent
      }
    };

    checkStatusAndNotifications();
    const interval = setInterval(checkStatusAndNotifications, 2500); // 2.5s fast real-time poll
    return () => clearInterval(interval);
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      {/* Real-Time Floating In-App Alert Banner (Approved or Rejected) */}
      {activeAlertBanner && (
        <View style={styles.floatingBannerContainer}>
          <View
            style={[
              styles.floatingBannerCard,
              activeAlertBanner.type === 'inquiry_approved'
                ? styles.floatingBannerCardApproved
                : styles.floatingBannerCardRejected,
            ]}
          >
            <View
              style={[
                styles.floatingBannerIconWrap,
                activeAlertBanner.type === 'inquiry_approved'
                  ? styles.floatingBannerIconWrapApproved
                  : styles.floatingBannerIconWrapRejected,
              ]}
            >
              <MaterialIcons
                name={activeAlertBanner.type === 'inquiry_approved' ? 'check-circle' : 'error-outline'}
                size={24}
                color={activeAlertBanner.type === 'inquiry_approved' ? '#059669' : '#dc2626'}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.floatingBannerTitle,
                  activeAlertBanner.type === 'inquiry_approved' && { color: '#065f46' },
                ]}
              >
                {activeAlertBanner.title}
              </Text>
              <Text style={styles.floatingBannerMessage} numberOfLines={2}>
                {activeAlertBanner.message}
              </Text>
              <View style={styles.floatingBannerActions}>
                <TouchableOpacity
                  style={[
                    styles.floatingBannerActionBtn,
                    activeAlertBanner.type === 'inquiry_approved' && { backgroundColor: '#059669' },
                  ]}
                  onPress={() => {
                    setActiveAlertBanner(null);
                    navigation.navigate('SubmitInquiry');
                  }}
                >
                  <MaterialIcons
                    name={activeAlertBanner.type === 'inquiry_approved' ? 'verified' : 'replay'}
                    size={14}
                    color="#ffffff"
                  />
                  <Text style={styles.floatingBannerActionBtnText}>
                    {activeAlertBanner.type === 'inquiry_approved' ? 'View Status' : 'Re-submit Now'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.floatingBannerDismissBtn}
                  onPress={() => setActiveAlertBanner(null)}
                >
                  <Text style={styles.floatingBannerDismissBtnText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity
              style={styles.floatingBannerCloseIcon}
              onPress={() => setActiveAlertBanner(null)}
            >
              <MaterialIcons name="close" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: [
            styles.tabBar,
            {
              backgroundColor: C.bar,
              borderTopColor: C.border,
            },
          ],
        }}
      >
        {TABS.map((tab) => (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={SCREENS[tab.name]}
            options={{
              tabBarIcon: ({ focused }) => (
                <TabItem
                  label={tab.label}
                  icon={tab.icon}
                  iconActive={tab.iconActive}
                  focused={focused}
                  C={C}
                  hasNotif={tab.name === 'Earnings'}
                />
              ),
            }}
          />
        ))}
      </Tab.Navigator>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 88 : 70, // Slightly increased for safe area
    borderTopWidth: 1,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    paddingTop: 10,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 60,
  },
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 2,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B', // Made red for visibility
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  tabLabelActive: {
    fontWeight: '700',
  },
  floatingBannerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 44 : 20,
    left: 12,
    right: 12,
    zIndex: 99999,
    elevation: 999,
  },
  floatingBannerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderLeftWidth: 5,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
    gap: 10,
  },
  floatingBannerCardRejected: {
    borderLeftColor: '#dc2626',
    borderColor: '#fee2e2',
    shadowColor: '#dc2626',
  },
  floatingBannerCardApproved: {
    borderLeftColor: '#059669',
    borderColor: '#d1fae5',
    shadowColor: '#059669',
  },
  floatingBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  floatingBannerIconWrapRejected: {
    backgroundColor: '#fee2e2',
  },
  floatingBannerIconWrapApproved: {
    backgroundColor: '#d1fae5',
  },
  floatingBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 2,
  },
  floatingBannerMessage: {
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 16,
    marginBottom: 8,
  },
  floatingBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  floatingBannerActionBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  floatingBannerActionBtnText: {
    color: '#ffffff',
    fontSize: 11.5,
    fontWeight: '700',
  },
  floatingBannerDismissBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  floatingBannerDismissBtnText: {
    color: '#6b7280',
    fontSize: 11.5,
    fontWeight: '500',
  },
  floatingBannerCloseIcon: {
    padding: 4,
  },
});