import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert, TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { BottomInsetContext } from '../context/BottomInsetContext';
import { ThemeContext } from '../context/ThemeContext';
import { IP_ADDRESS, AUTH_SERVICE_URL, ADMIN_SERVICE_URL } from '../config';
import { io } from 'socket.io-client';
import { clearAllAuthStorage, getStoredProviderAuth } from '../pages/IT22129376/services/providerAuthStorage';

const API_URL = AUTH_SERVICE_URL || `http://${IP_ADDRESS}:4003`;
const ADMIN_API_URL = ADMIN_SERVICE_URL || `http://${IP_ADDRESS}:5001`;

// Import Screens
import NewsFeedScreen from '../pages/NewsFeedScreen';
import BookingsScreen from '../pages/BookingsScreen';
import ProviderScheduleScreen from '../screens/ProviderScheduleScreen';
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
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        // The nested stack needs the same bounded layout as the root stack.
        cardStyle: Platform.OS === 'web' ? { flex: 1, minHeight: 0, height: '100%' } : undefined,
      }}
    >
      <Stack.Screen name="NewsFeedMain" component={NewsFeedScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChatScreen" component={ChatScreen} />
      <Stack.Screen name="QuotationTemplate" component={QuotationTemplate} />
      <Stack.Screen name="InboxScreen" component={InboxScreen} />
    </Stack.Navigator>
  );
}

const TABS = [
  { name: 'HomeTab', label: 'Home', tKey: 'home', icon: 'home-outline', iconActive: 'home' },
  { name: 'Bookings', label: 'My Jobs', tKey: 'myJobs', icon: 'briefcase-outline', iconActive: 'briefcase' },
  { name: 'CalendarTab', label: 'Calendar', tKey: 'calendar', icon: 'calendar-month-outline', iconActive: 'calendar-month' },
  { name: 'Earnings', label: 'Earnings', tKey: 'earnings', icon: 'wallet-outline', iconActive: 'wallet' },
  { name: 'Profile', label: 'Profile', tKey: 'profile', icon: 'account-outline', iconActive: 'account' },
];

const SCREENS = {
  HomeTab: HomeStack,
  Bookings: BookingsScreen,
  CalendarTab: ProviderScheduleScreen,
  Earnings: EarningsScreen,
  Profile: ProfileScreen,
};

const LIGHT = {
  bar: '#FFFFFF',
  barBorder: 'rgba(20,20,30,0.06)',
  activeIcon: '#166534',
  inactiveIcon: '#ADAAC0',
  activeLabel: '#166534',
  inactiveLabel: '#ADAAC0',
  indicator: '#15803D',
  shadowColor: '#3A3560',
  centerGradient: ['#15803D', '#0284C7'],
  centerGlow: '#15803D',
  centerIcon: '#FFFFFF',
  centerRing: 'rgba(37, 99, 235,0.14)',
};

const DARK = {
  bar: '#101512',
  barBorder: 'rgba(255,255,255,0.06)',
  activeIcon: '#86C99A',
  inactiveIcon: '#7C7C8D',
  activeLabel: '#86C99A',
  inactiveLabel: '#7C7C8D',
  indicator: '#15803D',
  shadowColor: '#000000',
  centerGradient: ['#15803D', '#0284C7'],
  centerGlow: '#15803D',
  centerIcon: '#FFFFFF',
  centerRing: 'rgba(134, 201, 154,0.12)',
};

function ProviderTabBar({ state, navigation, C }) {
  const bottomInset = useContext(BottomInsetContext);
  const { t } = useTranslation();
  const currentRoute = state.routes[state.index];
  if (['ChatScreen', 'QuotationTemplate', 'InboxScreen'].includes(getFocusedRouteNameFromRoute(currentRoute))) return null;
  return (
    <View style={[styles.tabBar, { backgroundColor: C.bar, borderTopColor: C.barBorder, paddingBottom: 8 + bottomInset, minHeight: 76 + bottomInset }]}>
      {state.routes.map((route, index) => {
        const tab = TABS.find(item => item.name === route.name);
        if (!tab) return null;
        const focused = state.index === index;
        const translatedLabel = tab.tKey ? t(tab.tKey, tab.label) : tab.label;
        return <TouchableOpacity
          key={route.key}
          style={styles.tabButton}
          accessibilityRole="button"
          accessibilityLabel={translatedLabel}
          accessibilityState={{ selected: focused }}
          activeOpacity={0.7}
          onPress={() => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          }}
          onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        ><TabItem {...tab} label={translatedLabel} focused={focused} C={C} /></TouchableOpacity>;
      })}
    </View>
  );
}

function TabItem({ label, icon, iconActive, focused, C, hasNotif }) {
  const iconName = focused ? iconActive : icon;

  return (
    <View style={styles.tabItem}>
      <View style={[styles.iconWrap, focused && { backgroundColor: C.activeIcon === '#86C99A' ? '#202A23' : '#EAF7EE' }]}>
        <MaterialCommunityIcons
          name={iconName}
          size={23}
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

      const fetchWithTimeout = async (url, opts = {}, ms = 2500) => {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), ms);
        try {
          return await fetch(url, { ...opts, signal: ctrl.signal });
        } finally {
          clearTimeout(tid);
        }
      };

      const checkStatusAndNotifications = async () => {
        if (isLoggingOutRef.current) return;

        try {
          const currentUserId = userId;
          const currentToken = token;

          if (!currentUserId) return;

          const response = await fetchWithTimeout(`${ADMIN_API_URL}/api/inquiries/provider-status/${currentUserId}`, {}, 5000);
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
            const notifRes = await fetchWithTimeout(`${ADMIN_API_URL}/api/inquiries/notifications/${currentUserId}`, {}, 5000);
            const notifData = await notifRes.json();

            if (notifRes.ok && Array.isArray(notifData.data)) {
              allNotifs = [...allNotifs, ...notifData.data];
            }
          } catch (e) {
            // silent
          }

          if (currentToken) {
            try {
              const authNotifRes = await fetchWithTimeout(`${API_URL}/notifications`, {
                headers: { Authorization: `Bearer ${currentToken}` },
              }, 5000);

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
      intervalId = setInterval(checkStatusAndNotifications, 15000);
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
                ? ['#EAF7EE', '#D8E8DC']
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
                  ? { backgroundColor: '#A7D6B4' }
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
                    ? '#166534'
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
                      ? { backgroundColor: '#166534' }
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
        tabBar={props => <ProviderTabBar {...props} C={C} />}
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
                    hasNotif={false}
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
    minHeight: 76,
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#D8E8DC',
    paddingTop: 8,
    paddingBottom: 8,
    elevation: 0,
  },
  tabButton: { flex: 1, minWidth: 0, minHeight: 60, alignItems: 'center', justifyContent: 'center' },
  tabItem: { width: '100%', minWidth: 0, height: 60, alignItems: 'center', justifyContent: 'center', gap: 3 },
  iconWrap: { width: 38, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', position: 'relative' },

  tabLabel: {
    width: '100%',
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 0,
    textAlign: 'center',
    fontWeight: '500',
  },

  tabLabelActive: {
    fontWeight: '700',
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
    borderColor: '#15803D',
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
