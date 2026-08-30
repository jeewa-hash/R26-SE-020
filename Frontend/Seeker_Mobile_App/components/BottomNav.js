// components/BottomNav.js
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import { useAuth } from '../context/AuthContext';
import { IP_ADDRESS } from '../config';

const BASE_AUTH_URL = `http://${IP_ADDRESS}:4003`;

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${BASE_AUTH_URL}/${imagePath.replace(/^\/+/, '')}`;
};

const HIDDEN_ROUTES = new Set([
  'Login',
  'Register',
  'VerifyOTP',
  'Language',
  'Onboarding',

  // Full-screen/detail flows
  'FollowUpScreen',
  'ProvidersScreen',
  'ProviderProfile',
  'RequestQuotationDetails',
  'PostResponsesScreen',
  'BidResponsesScreen',
  'UserQuotesScreen',
  'FeedbackScreen',
  'NotificationScreen',
  'ChatScreen',
  'EditProfileScreen',
  'SeasonalDemandsScreen',
  'RescheduleScreen',

  // IT22129376 My Jobs detail/action screens
  'IT22129376JobDetails',
  'IT22129376QuoteDetails',
  'IT22129376CoordinationReview',
  'IT22129376SuggestedSlots',
  'IT22129376ConfirmJob',
  'IT22129376ScheduledJobDetails',
  'IT22129376JobHistoryDetails',

  // Profile sub-pages / utility pages
  'MyBidsScreen',
  'MyPostsScreen',
  'HistoryScreen',
  'StarPointsScreen',
  'PaymentScreen',
  'SettingsScreen',
  'HelpScreen',
  'SpendAnalyticsScreen',
]);

const routeToTab = {
  Home: 'Home',
  HomeScreen: 'Home',

  FeedScreen: 'Feed',

  MyJobsScreen: 'MyJobs',
  MyJobs: 'MyJobs',

  ChatListScreen: 'Chat',

  ProfileScreen: 'Profile',
};

const BottomNav = ({ navigationRef, currentRouteName, isRootNav = false }) => {
  const { isDarkMode } = useTheme();
  const { unreadCount = {} } = useChat();
  const { user } = useAuth();

  const [selectedTab, setSelectedTab] = React.useState('Home');
  const [storedUser, setStoredUser] = React.useState(null);

  const totalUnread = Object.values(unreadCount).reduce(
    (total, count) => total + Number(count || 0),
    0
  );

  React.useEffect(() => {
    const loadStoredUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('user');

        if (userData) {
          setStoredUser(JSON.parse(userData));
        }
      } catch (error) {
        console.log('BottomNav user load error:', error);
      }
    };

    loadStoredUser();
  }, []);

  React.useEffect(() => {
    const mappedTab = routeToTab[currentRouteName];

    if (mappedTab) {
      setSelectedTab(mappedTab);
    }
  }, [currentRouteName]);

  // Old screens may still contain <BottomNav />.
  // Returning null prevents duplicate nav bars.
  if (!isRootNav) {
    return null;
  }

  if (HIDDEN_ROUTES.has(currentRouteName)) {
    return null;
  }

  const displayUser = user || storedUser;

  const profileImageUrl =
    getFullImageUrl(displayUser?.profileImage || displayUser?.avatar) ||
    'https://i.pravatar.cc/150?img=7';

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
      id: 'MyJobs',
      label: 'My Jobs',
      icon: 'work',
      routeName: 'MyJobsScreen',
    },
    {
      id: 'Chat',
      label: 'Chat',
      icon: 'chat',
      routeName: 'ChatListScreen',
      showBadge: totalUnread > 0,
      badgeCount: totalUnread,
    },
    {
      id: 'Profile',
      routeName: 'ProfileScreen',
      isProfile: true,
    },
  ];

  const handlePress = (item) => {
    setSelectedTab(item.id);

    if (navigationRef?.current?.navigate && item.routeName) {
      navigationRef.current.navigate(item.routeName);
    }
  };

  const isActive = (itemId) => selectedTab === itemId;

  const inactiveColor = isDarkMode ? '#94A3B8' : '#9CA3AF';
  const activeColor = isDarkMode ? '#818cf8' : '#667eea';

  return (
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);

        if (item.isProfile) {
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => handlePress(item)}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.profileNavWrap,
                  active && styles.profileNavWrapActive,
                  active && isDarkMode && styles.profileNavWrapActiveDark,
                ]}
              >
                <Image
                  source={{ uri: profileImageUrl }}
                  style={styles.profileNavImage}
                />
              </View>
            </TouchableOpacity>
          );
        }

        const showBadge = item.id === 'Chat' && item.showBadge;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.iconContainer,
                active && styles.iconContainerActive,
                active && isDarkMode && styles.iconContainerActiveDark,
              ]}
            >
              <MaterialIcons
                name={item.icon}
                size={23}
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
                { color: active ? activeColor : inactiveColor },
                active && styles.navLabelActive,
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
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 50,
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
    paddingVertical: 2,
  },
  iconContainer: {
    width: 38,
    height: 30,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconContainerActive: {
    backgroundColor: '#EEF2FF',
  },
  iconContainerActiveDark: {
    backgroundColor: 'rgba(129, 140, 248, 0.16)',
  },
  navLabel: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
  },
  navLabelActive: {
    fontWeight: '800',
  },
  profileNavWrap: {
    width: 45,
    height: 45,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileNavWrapActive: {
    backgroundColor: '#EEF2FF',
  },
  profileNavWrapActiveDark: {
    backgroundColor: 'rgba(129, 140, 248, 0.16)',
  },
  profileNavImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
});

export default BottomNav;