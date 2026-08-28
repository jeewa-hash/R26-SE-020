// components/BottomNav.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

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
  const [selectedTab, setSelectedTab] = React.useState('Home');

  React.useEffect(() => {
    const mappedTab = routeToTab[currentRouteName];
    if (mappedTab) {
      setSelectedTab(mappedTab);
    }
  }, [currentRouteName]);

  // Old screen-level <BottomNav /> usages will return null.
  // The navbar should be rendered only once from App.js.
  if (!isRootNav) {
    return null;
  }

  if (HIDDEN_ROUTES.has(currentRouteName)) {
    return null;
  }

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
      id: 'Profile',
      label: 'Profile',
      icon: 'person',
      routeName: 'ProfileScreen',
    },
  ];

  const handlePress = (item) => {
    setSelectedTab(item.id);

    if (navigationRef?.current) {
      navigationRef.current.navigate(item.routeName);
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
              onPress={() => handlePress(item)}
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
                  { color: active ? activeColor : inactiveColor },
                  active && styles.navLabelActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => handlePress(item)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
              color={active ? activeColor : inactiveColor}
            />

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
    height: 78,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingBottom: 10,
    paddingTop: 8,
    paddingHorizontal: 10,
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
  },
  createNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
  },
  createButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
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
