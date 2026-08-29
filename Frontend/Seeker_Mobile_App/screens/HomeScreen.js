import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../context/AuthContext';
import { IP_ADDRESS } from '../config';

const BASE_AUTH_URL = `http://${IP_ADDRESS}:4003`;

const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${BASE_AUTH_URL}/${imagePath.replace(/^\/+/, '')}`;
};

const menuSections = [
  {
    title: 'Activity',
    items: [
      {
        id: 'bookings',
        label: 'My Bookings',
        description: 'View current and previous bookings',
        icon: 'calendar-outline',
        iconType: 'ion',
        route: 'BookingsScreen',
      },
      {
        id: 'my-jobs',
        label: 'My Jobs',
        description: 'Track quotations, coordination and scheduled jobs',
        icon: 'work-outline',
        iconType: 'material',
        route: 'MyJobsScreen',
      },
      {
        id: 'bids',
        label: 'My Bids',
        description: 'View submitted bids and responses',
        icon: 'gavel',
        iconType: 'material',
        route: 'MyBidsScreen',
      },
      {
        id: 'posts',
        label: 'My Posts',
        description: 'Manage your service requests',
        icon: 'article',
        iconType: 'material',
        route: 'MyPostsScreen',
      },
      {
        id: 'history',
        label: 'History',
        description: 'Completed and cancelled activities',
        icon: 'time-outline',
        iconType: 'ion',
        route: 'HistoryScreen',
      },
    ],
  },
  {
    title: 'Payments & Rewards',
    items: [
      {
        id: 'points',
        label: 'Star Points',
        description: 'View your rewards and points',
        icon: 'star-outline',
        iconType: 'ion',
        route: 'StarPointsScreen',
      },
      {
        id: 'payment',
        label: 'Payment',
        description: 'Manage payment methods',
        icon: 'card-outline',
        iconType: 'ion',
        route: 'PaymentScreen',
      },
      {
        id: 'analytics',
        label: 'Spend Analytics',
        description: 'Track spending by service category',
        icon: 'bar-chart-outline',
        iconType: 'ion',
        route: 'SpendAnalyticsScreen',
      },
    ],
  },
  {
    title: 'Settings & Support',
    items: [
      {
        id: 'settings',
        label: 'Settings',
        description: 'App preferences and account settings',
        icon: 'settings-outline',
        iconType: 'ion',
        route: 'SettingsScreen',
      },
      {
        id: 'help',
        label: 'Help & Support',
        description: 'Get help with your account',
        icon: 'help-circle-outline',
        iconType: 'ion',
        route: 'HelpScreen',
      },
    ],
  },
];

const renderIcon = (item, color) => {
  if (item.iconType === 'material') {
    return <MaterialIcons name={item.icon} size={22} color={color} />;
  }

  if (item.iconType === 'feather') {
    return <Feather name={item.icon} size={22} color={color} />;
  }

  return <Ionicons name={item.icon} size={22} color={color} />;
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [storedUser, setStoredUser] = useState(null);

  const loadUserDetails = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');

      if (userData) {
        setStoredUser(JSON.parse(userData));
      }
    } catch (error) {
      console.log('Profile user load error:', error);
    }
  }, []);

  useEffect(() => {
    loadUserDetails();
  }, [loadUserDetails]);

  useFocusEffect(
    useCallback(() => {
      loadUserDetails();
    }, [loadUserDetails])
  );

  const displayUser = user || storedUser || {};

  const displayName =
    typeof displayUser?.name === 'string' && displayUser.name
      ? displayUser.name
      : typeof displayUser?.fullName === 'string' && displayUser.fullName
      ? displayUser.fullName
      : typeof displayUser?.username === 'string' && displayUser.username
      ? displayUser.username
      : typeof displayUser?.email === 'string'
      ? displayUser.email.split('@')[0]
      : 'Seeker';

  const email =
    typeof displayUser?.email === 'string' && displayUser.email
      ? displayUser.email
      : 'No email added';

  const phone =
    typeof displayUser?.phone === 'string' && displayUser.phone
      ? displayUser.phone
      : typeof displayUser?.telephone === 'string' && displayUser.telephone
      ? displayUser.telephone
      : 'No phone added';

  const district =
    typeof displayUser?.district === 'string' && displayUser.district
      ? displayUser.district
      : 'No district added';

  const profileImageUrl =
    getFullImageUrl(displayUser?.profileImage || displayUser?.avatar) ||
    'https://i.pravatar.cc/150?img=7';

  const handleMenuPress = (item) => {
    if (!item.route) return;
    navigation.navigate(item.route);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userRole');
              await AsyncStorage.removeItem('user');

              if (typeof logout === 'function') {
                await logout();
              }

              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } catch (error) {
              console.log('Logout error:', error);
              Alert.alert('Error', 'Unable to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#0f1121' : '#667eea'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ['#0f1121', '#1a1a2e', '#16213e']
              : ['#4765eb', '#926ee7', '#9d6aa3']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>Profile</Text>

            <TouchableOpacity
              style={styles.headerIconButton}
              onPress={toggleTheme}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDarkMode ? 'moon' : 'sunny'}
                size={21}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.profileHeader}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={{ uri: profileImageUrl }}
                style={styles.profileImage}
              />

              <View style={styles.onlineDot} />
            </View>

            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileEmail}>{email}</Text>

            <TouchableOpacity
              style={styles.editProfileButton}
              onPress={() => navigation.navigate('EditProfileScreen')}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={18} color="#667eea" />
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={19} color="#667eea" />
            </View>

            <View style={styles.infoTextBox}>
              <Text style={[styles.infoLabel, isDarkMode && styles.textMutedDark]}>
                Phone
              </Text>
              <Text style={[styles.infoValue, isDarkMode && styles.textDark]}>
                {phone}
              </Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          <View style={styles.infoItem}>
            <View style={styles.infoIconBox}>
              <Ionicons name="location-outline" size={19} color="#667eea" />
            </View>

            <View style={styles.infoTextBox}>
              <Text style={[styles.infoLabel, isDarkMode && styles.textMutedDark]}>
                District
              </Text>
              <Text style={[styles.infoValue, isDarkMode && styles.textDark]}>
                {district}
              </Text>
            </View>
          </View>
        </View>

        {menuSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
              {section.title}
            </Text>

            <View style={[styles.menuCard, isDarkMode && styles.menuCardDark]}>
              {section.items.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    index !== section.items.length - 1 && styles.menuItemBorder,
                    isDarkMode && index !== section.items.length - 1 && styles.menuItemBorderDark,
                  ]}
                  onPress={() => handleMenuPress(item)}
                  activeOpacity={0.75}
                >
                  <View style={styles.menuLeft}>
                    <View style={[styles.menuIconBox, isDarkMode && styles.menuIconBoxDark]}>
                      {renderIcon(item, isDarkMode ? '#818cf8' : '#667eea')}
                    </View>

                    <View style={styles.menuTextBox}>
                      <Text style={[styles.menuLabel, isDarkMode && styles.textDark]}>
                        {item.label}
                      </Text>

                      <Text style={[styles.menuDescription, isDarkMode && styles.textMutedDark]}>
                        {item.description}
                      </Text>
                    </View>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[styles.logoutButton, isDarkMode && styles.logoutButtonDark]}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={21} color="#EF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.versionBox}>
          <Text style={[styles.versionText, isDarkMode && styles.textMutedDark]}>
            Work Wave v1.0.0
          </Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0f1121',
  },
  scrollContent: {
    paddingBottom: 20,
  },

  headerGradient: {
    paddingTop: Platform.OS === 'android' ? 18 : 14,
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileHeader: {
    alignItems: 'center',
  },
  profileImageWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 4,
    borderColor: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 7,
    right: 7,
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#fff',
  },
  profileName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 4,
  },
  profileEmail: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    marginBottom: 16,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 22,
    gap: 6,
  },
  editProfileText: {
    color: '#667eea',
    fontSize: 13,
    fontWeight: '800',
  },

  infoCard: {
    marginHorizontal: 20,
    marginTop: -22,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 7,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextBox: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 14,
  },

  section: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  menuCardDark: {
    backgroundColor: '#16213e',
    borderWidth: 1,
    borderColor: '#2d3561',
  },
  menuItem: {
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  menuItemBorderDark: {
    borderBottomColor: '#2d3561',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuIconBoxDark: {
    backgroundColor: 'rgba(129, 140, 248, 0.16)',
  },
  menuTextBox: {
    flex: 1,
    paddingRight: 10,
  },
  menuLabel: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '800',
    marginBottom: 3,
  },
  menuDescription: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
  },

  logoutButton: {
    marginHorizontal: 20,
    marginTop: 24,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  logoutButtonDark: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: 'rgba(239, 68, 68, 0.24)',
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '900',
  },
  versionBox: {
    alignItems: 'center',
    marginTop: 18,
  },
  versionText: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '600',
  },

  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});