import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { LanguageContext } from '../context/LanguageContext';

const HIDDEN_ROUTES = new Set([
  'Login', 'Register', 'VerifyOTP', 'Language', 'Onboarding',
]);

const BottomNav = ({ navigationRef, currentRouteName, isRootNav = false }) => {
  const { isDarkMode } = useTheme();
  const { language } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';

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
    {
      id: 'Home',
      label: isSi ? 'මුල් පිටුව' : 'Home',
      icon: 'home',
      activeIcon: 'home-filled',
      routeName: 'Home',
    },
    {
      id: 'Feed',
      label: isSi ? 'පළ කිරීම්' : 'Feed',
      icon: 'explore',
      activeIcon: 'explore',
      routeName: 'FeedScreen',
    },
    {
      id: 'Create',
      label: isSi ? 'නව ඉල්ලුම' : 'Post Job',
      icon: 'add',
      routeName: 'CreatePostScreen',
      isCreateButton: true,
    },
    {
      id: 'Bookings',
      label: isSi ? 'ඇණවුම්' : 'Bookings',
      icon: 'event-note',
      activeIcon: 'event-note',
      routeName: 'BookingsScreen',
    },
    {
      id: 'Profile',
      label: isSi ? 'මගේ ගිණුම' : 'Profile',
      icon: 'person-outline',
      activeIcon: 'person',
      routeName: 'ProfileScreen',
    },
  ];

  const isActive = (itemId) => {
    switch (itemId) {
      case 'Home': return currentRouteName === 'Home' || currentRouteName === 'HomeScreen';
      case 'Feed': return currentRouteName === 'FeedScreen';
      case 'Create': return currentRouteName === 'CreatePostScreen';
      case 'Bookings': return currentRouteName === 'BookingsScreen';
      case 'Profile': return currentRouteName === 'ProfileScreen';
      default: return false;
    }
  };

  const inactiveColor = isDarkMode ? '#94A3B8' : '#64748B';
  const activeColor = isDarkMode ? '#818cf8' : '#4F46E5';
  const activeBg = isDarkMode ? 'rgba(129, 140, 248, 0.15)' : 'rgba(79, 70, 229, 0.1)';

  return (
    <View style={[styles.navContainer, isDarkMode && styles.navContainerDark]}>
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);

        if (item.isCreateButton) {
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.createNavItem}
              onPress={() => navigate(item.routeName)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <LinearGradient
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.createButton}
              >
                <MaterialIcons name={item.icon} size={30} color="#fff" />
              </LinearGradient>
              <Text style={[styles.createNavLabel, { color: active ? activeColor : (isDarkMode ? '#cbd5e1' : '#475569') }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => navigate(item.routeName)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <View style={[styles.iconWrapper, active && { backgroundColor: activeBg }]}>
              <MaterialIcons
                name={active && item.activeIcon ? item.activeIcon : item.icon}
                size={26}
                color={active ? activeColor : inactiveColor}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navLabel,
                { color: active ? activeColor : inactiveColor },
                active && styles.activeLabel,
              ]}
            >
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
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  activeLabel: {
    fontWeight: '800',
  },
  createNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
    flexDirection: 'row', flexShrink: 0,
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8,
    borderTopWidth: 1, borderTopColor: '#E8ECF0', shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 8,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  createNavLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
});

export default BottomNav;
