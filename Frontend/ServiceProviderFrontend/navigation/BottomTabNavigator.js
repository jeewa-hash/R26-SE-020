import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemeContext } from '../context/ThemeContext';
import { IP_ADDRESS } from '../config';
import { io } from 'socket.io-client';
import { clearAllAuthStorage, getStoredProviderAuth } from '../pages/IT22129376/services/providerAuthStorage';

const API_URL = `http://${IP_ADDRESS}:4003`;
const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

// Import Screens
import NewsFeedScreen from '../pages/NewsFeedScreen';
import BookingsScreen from '../pages/BookingsScreen';
import EarningsScreen from '../pages/EarningsScreen';
import ProfileScreen from '../pages/ProfileScreen';
import ChatScreen from '../pages/ChatScreen';
import QuotationTemplate from '../pages/QuotationTemplate';
import NotificationsScreen from '../pages/NotificationsScreen';
import InboxScreen from '../pages/InboxScreen';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

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

const TABS = [
  { name: 'HomeTab', label: 'Home', icon: 'home-outline', iconActive: 'home' },
  { name: 'Bookings', label: 'My Jobs', icon: 'briefcase-outline', iconActive: 'briefcase' },
  { name: 'NotificationsTab', label: 'Alerts', icon: 'bell-outline', iconActive: 'bell', isCenter: true },
  { name: 'Earnings', label: 'Earnings', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'Profile', label: 'Profile', icon: 'account-outline', iconActive: 'account' },
];

const SCREENS = {
  HomeTab: HomeStack,
  Bookings: BookingsScreen,
  NotificationsTab: NotificationsScreen,
  Earnings: EarningsScreen,
  Profile: ProfileScreen,
};

const LIGHT = {
  bar: 'rgba(255,255,255,0.97)',
  barBorder: 'rgba(20,20,30,0.06)',
  activeIcon: '#15151F',
  inactiveIcon: '#ADAAC0',
  activeLabel: '#15151F',
  inactiveLabel: '#ADAAC0',
  indicator: '#22C55E',
  shadowColor: '#3A3560',
  centerGradient: ['#5B6EF5', '#8B5CF6'],
  centerGlow: '#5B6EF5',
  centerIcon: '#FFFFFF',
  centerRing: 'rgba(91,110,245,0.14)',
};

const DARK = {
  bar: 'rgba(20,20,29,0.97)',
  barBorder: 'rgba(255,255,255,0.06)',
  activeIcon: '#FFFFFF',
  inactiveIcon: '#7C7C8D',
  activeLabel: '#FFFFFF',
  inactiveLabel: '#7C7C8D',
  indicator: '#22C55E',
  shadowColor: '#000000',
  centerGradient: ['#5B6EF5', '#8B5CF6'],
  centerGlow: '#5B6EF5',
  centerIcon: '#FFFFFF',
  centerRing: 'rgba(91,110,245,0.28)',
};

function TabItem({ label, icon, iconActive, focused, C, hasNotif }) {
  const iconName = focused ? iconActive : icon;

  return (
    <View style={styles.tabItem}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name={iconName}
          size={24}
          color={focused ? C.activeIcon : C.inactiveIcon}
        />

        {hasNotif && <View style={styles.notifDot} />}
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        style={[
          styles.tabLabel,
          { color: focused ? C.activeLabel : C.inactiveLabel },
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.activeDot,
          { backgroundColor: focused ? C.indicator : 'transparent' },
        ]}
      />
    </View>
  );
}

function CenterTabItem({ label, icon, iconActive, focused, C, hasNotif }) {
  const iconName = focused ? iconActive : icon;

  return (
    <View style={styles.centerWrap} pointerEvents="box-none">
      <View style={[styles.centerRing, { backgroundColor: C.centerRing }]}>
        <LinearGradient
          colors={C.centerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.centerButton,
            {
              shadowColor: C.centerGlow,
              transform: [{ scale: focused ? 1.04 : 1 }],
            },
          ]}
        >
          <MaterialCommunityIcons name={iconName} size={26} color={C.centerIcon} />
          {hasNotif && <View style={styles.centerNotifDot} />}
        </LinearGradient>
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        style={[
          styles.centerLabel,
          { color: focused ? C.activeLabel : C.inactiveLabel },
          focused && styles.tabLabelActive,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

export default function BottomTabNavigator() {
  const { isDark } = useContext(ThemeContext);
  const C = isDark ? DARK : LIGHT;
  const navigation = useNavigation();

  const isLoggingOutRef = useRef(false);
  const [activeAlertBanner, setActiveAlertBanner] = useState(null);
  const seenNotificationIdsRef = useRef(new Set());
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let intervalId = null;

    const setupRealTimeAndWatchdog = async () => {
      const auth = await getStoredProviderAuth();
      const userId = auth.providerId;
      const token = auth.token;

      try {
        if (!socketRef.current) {
          socketRef.current = io(API_URL, {
            transports: ['websocket'],
            reconnection: true,
          });

          socketRef.current.on('connect', () => {
            if (userId) {
              socketRef.current.emit('join_notification_room', userId);
              socketRef.current.emit('join', userId);
            }
          });

          const handleIncomingNotif = (newNotif) => {
            if (!newNotif || !newNotif._id) return;

            const notifId = newNotif._id.toString();

            if (!seenNotificationIdsRef.current.has(notifId)) {
              seenNotificationIdsRef.current.add(notifId);
              setHasUnreadNotifs(true);
              setActiveAlertBanner(newNotif);
            }
          };

          socketRef.current.on('new_notification', handleIncomingNotif);
          socketRef.current.on('notification', handleIncomingNotif);
        }
      } catch (sockErr) {
        console.warn('Socket connection error in TabNavigator:', sockErr.message);
      }

      const checkStatusAndNotifications = async () => {
        if (isLoggingOutRef.current) return;

        try {
          const currentUserId = userId;
          const currentToken = token;

          if (!currentUserId) return;

          const response = await fetch(`${ADMIN_API_URL}/api/inquiries/provider-status/${currentUserId}`);
          const data = await response.json();

          if (response.ok && data.isBlocked) {
            isLoggingOutRef.current = true;

            const untilDate = data.blockedUntil
              ? new Date(data.blockedUntil).toLocaleDateString()
              : 'Admin unlocks';

            await clearAllAuthStorage();

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

          let allNotifs = [];

          try {
            const notifRes = await fetch(`${ADMIN_API_URL}/api/inquiries/notifications/${currentUserId}`);
            const notifData = await notifRes.json();

            if (notifRes.ok && Array.isArray(notifData.data)) {
              allNotifs = [...allNotifs, ...notifData.data];
            }
          } catch (e) {
            // silent
          }

          if (currentToken) {
            try {
              const authNotifRes = await fetch(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${currentToken}` },
              });

              const authNotifData = await authNotifRes.json();

              if (authNotifRes.ok && Array.isArray(authNotifData)) {
                allNotifs = [...allNotifs, ...authNotifData];
              }
            } catch (e) {
              // silent
            }
          }

          if (allNotifs.length > 0) {
            const anyUnread = allNotifs.some((n) => !n.isRead);
            setHasUnreadNotifs(anyUnread);

            const unreadPriorityNotifs = allNotifs.filter(
              (n) =>
                !n.isRead &&
                (n.type === 'inquiry_rejected' ||
                  n.type === 'inquiry_approved' ||
                  n.type === 'high_demand_alert' ||
                  (n.title && n.title.includes('High Demand'))) &&
                !seenNotificationIdsRef.current.has(n._id?.toString())
            );

            if (unreadPriorityNotifs.length > 0) {
              const latestNotif = unreadPriorityNotifs[0];
              seenNotificationIdsRef.current.add(latestNotif._id?.toString());
              setActiveAlertBanner(latestNotif);
            }
          }
        } catch (err) {
          // silent
        }
      };

      checkStatusAndNotifications();
      intervalId = setInterval(checkStatusAndNotifications, 2500);
    };

    setupRealTimeAndWatchdog();

    return () => {
      if (intervalId) clearInterval(intervalId);

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      {activeAlertBanner && (
        <View style={styles.floatingBannerContainer}>
          <LinearGradient
            colors={
              activeAlertBanner.type === 'high_demand_alert' ||
              (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                ? ['#EEF2FF', '#E0E7FF']
                : activeAlertBanner.type === 'inquiry_approved'
                ? ['#ECFDF5', '#D1FAE5']
                : ['#FEF2F2', '#FEE2E2']
            }
            style={styles.floatingBannerCard}
          >
            <View
              style={[
                styles.floatingBannerIconWrap,
                activeAlertBanner.type === 'high_demand_alert' ||
                (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                  ? { backgroundColor: '#C7D2FE' }
                  : activeAlertBanner.type === 'inquiry_approved'
                  ? styles.floatingBannerIconWrapApproved
                  : styles.floatingBannerIconWrapRejected,
              ]}
            >
              <MaterialIcons
                name={
                  activeAlertBanner.type === 'high_demand_alert' ||
                  (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                    ? 'trending-up'
                    : activeAlertBanner.type === 'inquiry_approved'
                    ? 'check-circle'
                    : 'error-outline'
                }
                size={24}
                color={
                  activeAlertBanner.type === 'high_demand_alert' ||
                  (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                    ? '#4F46E5'
                    : activeAlertBanner.type === 'inquiry_approved'
                    ? '#059669'
                    : '#dc2626'
                }
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.floatingBannerTitle,
                  (activeAlertBanner.type === 'high_demand_alert' ||
                    (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))) && {
                    color: '#3730A3',
                  },
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
                    activeAlertBanner.type === 'high_demand_alert' ||
                    (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                      ? { backgroundColor: '#4F46E5' }
                      : activeAlertBanner.type === 'inquiry_approved'
                      ? { backgroundColor: '#059669' }
                      : { backgroundColor: '#dc2626' },
                  ]}
                  onPress={() => {
                    const isDemandAlert =
                      activeAlertBanner.type === 'high_demand_alert' ||
                      (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'));

                    setActiveAlertBanner(null);

                    if (isDemandAlert) {
                      navigation.navigate('Notifications');
                    } else {
                      navigation.navigate('SubmitInquiry');
                    }
                  }}
                >
                  <MaterialIcons
                    name={
                      activeAlertBanner.type === 'high_demand_alert' ||
                      (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                        ? 'notifications'
                        : activeAlertBanner.type === 'inquiry_approved'
                        ? 'verified'
                        : 'replay'
                    }
                    size={14}
                    color="#ffffff"
                  />

                  <Text style={styles.floatingBannerActionBtnText}>
                    {activeAlertBanner.type === 'high_demand_alert' ||
                    (activeAlertBanner.title && activeAlertBanner.title.includes('High Demand'))
                      ? 'View Alert'
                      : activeAlertBanner.type === 'inquiry_approved'
                      ? 'View Status'
                      : 'Re-submit Now'}
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
          </LinearGradient>
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
              borderColor: C.barBorder,
              shadowColor: C.shadowColor,
            },
          ],
        }}
      >
        {TABS.map((tab) => (
          <Tab.Screen
            key={tab.name}
            name={tab.name}
            component={SCREENS[tab.name]}
            options={({ route }) => ({
              tabBarStyle: ((routeName) => {
                const hiddenScreens = ['ChatScreen', 'QuotationTemplate', 'InboxScreen'];

                if (hiddenScreens.includes(routeName)) {
                  return { display: 'none' };
                }

                return [
                  styles.tabBar,
                  {
                    backgroundColor: C.bar,
                    borderColor: C.barBorder,
                    shadowColor: C.shadowColor,
                  },
                ];
              })(getFocusedRouteNameFromRoute(route)),

              tabBarIcon: ({ focused }) =>
                tab.isCenter ? (
                  <CenterTabItem
                    label={tab.label}
                    icon={tab.icon}
                    iconActive={tab.iconActive}
                    focused={focused}
                    C={C}
                    hasNotif={hasUnreadNotifs}
                  />
                ) : (
                  <TabItem
                    label={tab.label}
                    icon={tab.icon}
                    iconActive={tab.iconActive}
                    focused={focused}
                    C={C}
                    hasNotif={tab.name === 'Earnings'}
                  />
                ),

              tabBarButton: tab.isCenter
                ? (props) => (
                    <TouchableOpacity
                      {...props}
                      activeOpacity={0.85}
                      style={[props.style, styles.centerTabButton]}
                    />
                  )
                : undefined,
            })}
          />
        ))}
      </Tab.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: Platform.OS === 'ios' ? 26 : 14,
    height: 82,
    borderRadius: 30,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8,
    elevation: 15,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
  },

  tabItem: {
    flex: 1,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },

  iconWrap: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 4,
  },

  tabLabel: {
    width: '100%',
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 0,
    textAlign: 'center',
    fontWeight: '500',
  },

  tabLabelActive: {
    fontWeight: '600',
  },

  activeDot: {
    width: 14,
    height: 3,
    borderRadius: 1.5,
    marginTop: 5,
  },

  notifDot: {
    position: 'absolute',
    top: -2,
    right: -6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
    borderWidth: 1.5,
    borderColor: '#FFF',
  },

  centerTabButton: {
    top: -18,
    flex: 1,
  },

  centerWrap: {
    height: 78,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  centerRing: {
    padding: 5,
    borderRadius: 34,
    marginBottom: 2,
  },

  centerButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
    elevation: 12,
  },

  centerLabel: {
    width: 70,
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
    fontWeight: '500',
  },

  centerNotifDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4B4B',
    borderWidth: 1.5,
    borderColor: '#5B6EF5',
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
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 15,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },

  floatingBannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },

  floatingBannerIconWrapRejected: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  floatingBannerIconWrapApproved: {
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#6EE7B7',
  },

  floatingBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 4,
    letterSpacing: 0.3,
  },

  floatingBannerMessage: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
    marginBottom: 10,
  },

  floatingBannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  floatingBannerActionBtn: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    elevation: 2,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  floatingBannerActionBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  floatingBannerDismissBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },

  floatingBannerDismissBtnText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '500',
  },

  floatingBannerCloseIcon: {
    padding: 4,
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
});