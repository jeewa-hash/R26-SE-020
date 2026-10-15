import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

const HIDDEN_ROUTES = new Set([
  'Login', 'Register', 'VerifyOTP', 'Language', 'Onboarding',
]);

const BottomNav = ({ navigationRef, currentRouteName, isRootNav = false }) => {
  const { isDarkMode } = useTheme();

  // This bar is beside the navigator rather than inside a Stack.Screen.
  // Using the ref avoids the useRoute/useNavigation context error.
  if (!isRootNav || HIDDEN_ROUTES.has(currentRouteName)) {
    return null;
  }

  const navigate = (screenName) => {
    if (navigationRef?.isReady?.()) {
      navigationRef.navigate(screenName);
    } else if (navigationRef?.current?.navigate) {
      navigationRef.current.navigate(screenName);
    }
  };

  const navItems = [
    { id: 'Home', label: 'Home', icon: 'home', routeName: 'Home' },
    { id: 'Feed', label: 'Feed', icon: 'feed', routeName: 'FeedScreen' },
    {
      id: 'Create', label: 'Create', icon: 'add',
      routeName: 'CreatePostScreen', isCreateButton: true,
    },
    {
<<<<<<< Updated upstream
      id: 'Bookings', label: 'Bookings', icon: 'calendar-today',
=======
      id: 'Feed',
      label: isSi ? 'පළ කිරීම්' : 'Feed',
      icon: 'explore',
      activeIcon: 'explore',
      routeName: 'FeedScreen',
    },
    {
      id: 'Sessions',
      label: isSi ? 'සැසි' : 'Sessions',
      icon: 'assignment',
      activeIcon: 'assignment',
      routeName: 'SeekerServiceSessions',
    },
    {
      id: 'Create',
      label: isSi ? 'නව ඉල්ලුම' : 'Post Job',
      icon: 'add',
      routeName: 'CreatePostScreen',
      isCreateButton: true,
    },
    {
      id: 'Calendar',
      label: isSi ? 'දින දර්ශනය' : 'Calendar',
      icon: 'calendar-today',
      activeIcon: 'calendar-today',
      routeName: 'SeekerCalendar',
    },
    {
      id: 'Bookings',
      label: isSi ? 'ඇණවුම්' : 'Bookings',
      icon: 'event-note',
      activeIcon: 'event-note',
>>>>>>> Stashed changes
      routeName: 'BookingsScreen',
    },
    { id: 'Profile', label: 'Profile', icon: 'person', routeName: 'ProfileScreen' },
  ];

  const isActive = (itemId) => {
    switch (itemId) {
      case 'Home': return currentRouteName === 'Home' || currentRouteName === 'HomeScreen';
      case 'Feed': return currentRouteName === 'FeedScreen';
      case 'Sessions': return ['SeekerServiceSessions', 'SeekerServiceSessionDetails'].includes(currentRouteName);
      case 'Create': return currentRouteName === 'CreatePostScreen';
      case 'Calendar': return currentRouteName === 'SeekerCalendar';
      case 'Bookings': return currentRouteName === 'BookingsScreen';
      case 'Profile': return currentRouteName === 'ProfileScreen';
      default: return false;
    }
  };

  const inactiveColor = isDarkMode ? '#94A3B8' : '#999';
  const activeColor = isDarkMode ? '#818cf8' : '#667eea';

  return (
    <View style={[styles.navContainer, isDarkMode && styles.navContainerDark]}>
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);

        if (item.isCreateButton) {
          return (
            <TouchableOpacity key={item.id} style={styles.createNavItem}
              onPress={() => navigate(item.routeName)} activeOpacity={0.8}>
              <LinearGradient
<<<<<<< Updated upstream
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createButton}
=======
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.createButton, { borderColor: isDarkMode ? '#0F172A' : '#ffffff' }]}
>>>>>>> Stashed changes
              >
                <MaterialIcons name={item.icon} size={28} color="#fff" />
              </LinearGradient>
<<<<<<< Updated upstream
              <Text style={[styles.navLabel, { color: inactiveColor }, active && [styles.activeLabel, { color: activeColor }]]}>
=======
              <Text numberOfLines={1} style={[styles.createNavLabel, { color: active ? activeColor : (isDarkMode ? '#cbd5e1' : '#475569') }]}>
>>>>>>> Stashed changes
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={item.id} style={styles.navItem}
            onPress={() => navigate(item.routeName)} activeOpacity={0.7}>
            <MaterialIcons name={item.icon} size={24} color={active ? activeColor : inactiveColor} />
            <Text style={[styles.navLabel, { color: active ? activeColor : inactiveColor }, active && styles.activeLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: { paddingTop: 16, flexShrink: 0, backgroundColor: '#fff' },
  navContainerDark: { backgroundColor: '#1a1a2e' },
  bottomNav: {
<<<<<<< Updated upstream
    flexDirection: 'row', flexShrink: 0,
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8,
    borderTopWidth: 1, borderTopColor: '#E8ECF0', shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 8,
=======
    flexShrink: 0,
    minHeight: 68,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 12,
  },
  bottomNavDark: {
    backgroundColor: '#0F172A',
    borderTopColor: '#1E293B',
    shadowOpacity: 0.4,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  iconWrapper: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeLabel: {
    fontWeight: '800',
  },
  createNavItem: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    flexDirection: 'column',
    backgroundColor: 'transparent',
>>>>>>> Stashed changes
  },
  bottomNavDark: { backgroundColor: '#16213e', borderTopColor: '#2d3561', shadowOpacity: 0.3 },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
  navLabel: { fontSize: 10, marginTop: 2 },
  activeLabel: { fontWeight: '600' },
  createNavItem: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: -16 },
  createButton: {
    width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center',
    marginBottom: 2, shadowColor: '#667eea', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
});

export default BottomNav;
