// components/BottomNav.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';

const HIDDEN_ROUTES = new Set([
  'Login',
  'Register',
  'VerifyOTP',
  'Language',
  'Onboarding',

  'ProviderProfile',
  'ProvidersScreen',
  'RequestQuotationDetails',
  'BidCoordinationScreen',
  'BidResponsesScreen',
  'UserQuotesScreen',
  'BiddingScreen',
  'PostResponsesScreen',

  'FollowUpScreen',
  'ChatScreen',
  'ChatListScreen',
  'NotificationScreen',
  'FeedbackScreen',
  'SeasonalDemandsScreen',

  'SettingsScreen',
  'HelpScreen',
  'PaymentScreen',
  'HistoryScreen',
  'SpendAnalyticsScreen',
  'StarPointsScreen',

  'MyPostsScreen',
  'MyBidsScreen',
  'RescheduleScreen',
]);

const routeToTab = {
  Home: 'Home',
  HomeScreen: 'Home',
  FeedScreen: 'Feed',
  CreatePostScreen: 'Create',
  BookingsScreen: 'Bookings',
  ProfileScreen: 'Profile',
};

const BottomNav = ({ navigationRef, currentRouteName, isRootNav = false }) => {
  const { isDarkMode } = useTheme();
  const { unreadCount } = useChat();

  // Total unread messages across all chats
  const totalUnread = Object.values(unreadCount).reduce((a, b) => a + b, 0);

  const navItems = [
    {
      id: 'Home',
      label: 'Home',
      icon: 'home',
      routeName: 'Home',
    },
    {
      id: 'Feed',
      label: 'Feed',
      icon: 'feed',
      routeName: 'FeedScreen',
    },
    {
      id: 'Create',
      label: 'Create',
      icon: 'add',
      routeName: 'CreatePostScreen',
      isCreateButton: true,
    },
    {
      id: 'Bookings',
      label: 'Bookings',
      icon: 'calendar-today',
      routeName: 'BookingsScreen',
    },
    {
      id: 'Chat',
      label: 'Chat',
      icon: 'chat',
      onPress: () => navigation.navigate('ChatListScreen'),
      showBadge: totalUnread > 0,
      badgeCount: totalUnread,
    },
    {
      id: 'Profile',
      label: 'Profile',
      icon: 'person',
      routeName: 'ProfileScreen',
    },
  ];

  const isActive = (itemId) => {
    switch (itemId) {
      case 'Home': return route.name === 'Home' || route.name === 'HomeScreen';
      case 'Feed': return route.name === 'FeedScreen';
      case 'Create': return route.name === 'CreatePostScreen';
      case 'Bookings': return route.name === 'BookingsScreen';
      case 'Chat': return route.name === 'ChatListScreen';
      case 'Profile': return route.name === 'ProfileScreen';
      default: return false;
    }
  };

  const isActive = (itemId) => selectedTab === itemId;

  const inactiveColor = isDarkMode ? '#94A3B8' : '#999';
  const activeColor = isDarkMode ? '#818cf8' : '#667eea';

  return (
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);

        if (item.isCreateButton) {
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.createNavItem}
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButton}
              >
                <MaterialIcons name={item.icon} size={28} color="#fff" />
              </LinearGradient>
              <Text
                style={[
                  styles.navLabel,
                  { color: inactiveColor },
                  active && { color: activeColor, fontWeight: '600' },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }

        // Show badge only on Chat tab
        const showBadge = item.id === 'Chat' && item.showBadge;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <View style={styles.iconWrapper}>
              <MaterialIcons
                name={item.icon}
                size={24}
                color={active ? activeColor : inactiveColor}
              />
              {showBadge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {item.badgeCount > 99 ? '99+' : item.badgeCount}
                  </Text>
                </View>
              )}
            </View>
            <Text
              style={[
                styles.navLabel,
                { color: inactiveColor },
                active && { color: activeColor, fontWeight: '600' },
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 78,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 100,
  },
  bottomNavDark: {
    backgroundColor: '#16213e',
    borderTopColor: '#2d3561',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  navLabel: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  createNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
  },
  createButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  navLabel: {
    fontSize: 11,
    marginTop: 4,
  },
  navLabelActive: {
    fontWeight: '700',
  },
});

export default BottomNav;
