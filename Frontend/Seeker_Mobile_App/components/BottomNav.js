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
      id: 'MyPosts',
      label: isSi ? 'මගේ පළ කිරීම්' : 'My Posts',
      icon: 'article',
      activeIcon: 'article',
      routeName: 'MyPostsScreen',
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
      case 'Sessions': return ['SeekerServiceSessions', 'SeekerServiceSessionDetails'].includes(currentRouteName);
      case 'Create': return currentRouteName === 'CreatePostScreen';
      case 'MyPosts': return currentRouteName === 'MyPostsScreen';
      case 'Bookings': return currentRouteName === 'BookingsScreen';
      case 'Profile': return ['ProfileScreen', 'SeekerCalendar'].includes(currentRouteName);
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
              style={styles.navItem}
              onPress={() => navigate(item.routeName)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <LinearGradient
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.createButton, { borderColor: isDarkMode ? '#0F172A' : '#ffffff' }]}
              >
                <MaterialIcons name={item.icon} size={30} color="#fff" />
              </LinearGradient>
              <Text numberOfLines={1} style={[styles.createNavLabel, { color: active ? activeColor : (isDarkMode ? '#cbd5e1' : '#475569') }]}>
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
                size={23}
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
  navContainer: { flexShrink: 0, backgroundColor: '#ffffff' },
  navContainerDark: { backgroundColor: '#0F172A' },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingVertical: 8,
    paddingHorizontal: 2,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomNavDark: { backgroundColor: '#0F172A', borderTopColor: '#283449' },
  navItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    width: 38,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { width: '100%', textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: '500' },
  activeLabel: { fontWeight: '700' },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  createNavLabel: { width: '100%', textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: '700' },
});

export default BottomNav;
