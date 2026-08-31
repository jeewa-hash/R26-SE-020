import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

const HIDDEN_ROUTES = new Set([
  'Login', 'Register', 'VerifyOTP', 'Language', 'Onboarding',
  'FollowUpScreen', 'ProvidersScreen', 'ProviderProfile',
  'RequestQuotationDetails', 'PostResponsesScreen', 'BidResponsesScreen',
  'UserQuotesScreen', 'FeedbackScreen', 'NotificationScreen', 'ChatScreen',
  'EditProfileScreen', 'SeasonalDemandsScreen', 'RescheduleScreen',
  'IT22129376JobDetails', 'IT22129376QuoteDetails',
  'IT22129376CoordinationReview', 'IT22129376SuggestedSlots',
  'IT22129376ConfirmJob', 'IT22129376ScheduledJobDetails',
  'IT22129376JobHistoryDetails', 'MyBidsScreen', 'MyPostsScreen',
  'HistoryScreen', 'StarPointsScreen', 'PaymentScreen', 'SettingsScreen',
  'HelpScreen', 'SpendAnalyticsScreen',
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
      id: 'Bookings', label: 'Bookings', icon: 'calendar-today',
      routeName: 'BookingsScreen',
    },
    { id: 'Profile', label: 'Profile', icon: 'person', routeName: 'ProfileScreen' },
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

  const inactiveColor = isDarkMode ? '#94A3B8' : '#999';
  const activeColor = isDarkMode ? '#818cf8' : '#667eea';

  return (
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);

        if (item.isCreateButton) {
          return (
            <TouchableOpacity key={item.id} style={styles.createNavItem}
              onPress={() => navigate(item.routeName)} activeOpacity={0.8}>
              <LinearGradient
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.createButton}
              >
                <MaterialIcons name={item.icon} size={28} color="#fff" />
              </LinearGradient>
              <Text style={[styles.navLabel, { color: inactiveColor }, active && [styles.activeLabel, { color: activeColor }]]}>
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
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    backgroundColor: '#fff', paddingVertical: 8, paddingHorizontal: 8,
    borderTopWidth: 1, borderTopColor: '#E8ECF0', shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.05,
    shadowRadius: 8, elevation: 8,
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
