import React, { useContext } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack'; // Added Stack
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { ThemeContext } from '../context/ThemeContext';

// Import Screens
import NewsFeedScreen from '../pages/NewsFeedScreen';
import BookingsScreen from '../pages/BookingsScreen';
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

  return (
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

  tabBarItem: {
    paddingVertical: 1,
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
  
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.2,
    marginTop: 2,
  },
  tabLabelActive: {
    fontWeight: '700',
  },
});