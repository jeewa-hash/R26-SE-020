// screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { IP_ADDRESS } from '../config';

const AUTH_SERVICE_URL = `http://${IP_ADDRESS}:4003/seeker`;
const BASE_AUTH_URL = `http://${IP_ADDRESS}:4003`;

const getProfileImage = (imagePath) => {
  if (!imagePath) return 'https://i.pravatar.cc/150?img=7';
  if (imagePath.startsWith('http')) return imagePath;
  return `${BASE_AUTH_URL}/${imagePath.replace(/^\/+/, '')}`;
};

const getLocationString = (userObj) => {
  if (userObj?.district) return userObj.district;
  if (userObj?.address) return userObj.address;
  if (userObj?.location && typeof userObj.location === 'string') {
    return userObj.location;
  }
  return 'Location not set';
};

const menuItems = [
  {
    id: 'bookings',
    title: 'My Requests',
    icon: 'calendar',
    iconType: 'ion',
    color: '#667eea',
    screen: 'BookingsScreen',
  },
  {
    id: 'myjobs',
    title: 'My Jobs',
    icon: 'work',
    iconType: 'material',
    color: '#667eea',
    screen: 'MyJobsScreen',
  },
  {
    id: 'mybids',
    title: 'My Bids',
    icon: 'gavel',
    iconType: 'material',
    color: '#4ECDC4',
    screen: 'MyBidsScreen',
  },
  {
    id: 'myposts',
    title: 'My Posts',
    icon: 'newspaper',
    iconType: 'ion',
    color: '#45B7D1',
    screen: 'MyPostsScreen',
  },
  {
    id: 'history',
    title: 'Service History',
    icon: 'time',
    iconType: 'ion',
    color: '#96CEB4',
    screen: 'HistoryScreen',
  },
  {
    id: 'starpoints',
    title: 'Star Points',
    icon: 'star',
    iconType: 'ion',
    color: '#FBBF24',
    screen: 'StarPointsScreen',
  },
];

const renderMenuIcon = (item) => {
  if (item.iconType === 'material') {
    return <MaterialIcons name={item.icon} size={22} color={item.color} />;
  }

  return <Ionicons name={item.icon} size={22} color={item.color} />;
};

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { isDarkMode, toggleTheme } = useTheme();
  const { user, saveUser, logout } = useAuth();

  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [userData, setUserData] = useState({
    name: user?.name || 'User',
    email: user?.email || '',
    phone: user?.phone || user?.telephone || '',
    location: getLocationString(user),
    memberSince: 'January 2024',
    avatar: getProfileImage(user?.profilePicture || user?.profileImage || user?.avatar),
    starPoints: 1250,
    totalServices: 24,
  });

  useEffect(() => {
    setUserData((current) => ({
      ...current,
      name: user?.name || current.name,
      email: user?.email || current.email,
      phone: user?.phone || user?.telephone || current.phone,
      location: getLocationString(user),
      avatar: getProfileImage(user?.profilePicture || user?.profileImage || user?.avatar),
    }));
  }, [user]);

  const handleMenuPress = (screen) => {
    navigation.navigate(screen);
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
              await AsyncStorage.removeItem('userId');

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

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const storedUser = await AsyncStorage.getItem('user');

      if (storedUser) {
        const parsed = JSON.parse(storedUser);

        setUserData((current) => ({
          ...current,
          name: parsed.name || current.name,
          email: parsed.email || current.email,
          phone: parsed.phone || parsed.telephone || current.phone,
          location: getLocationString(parsed),
          avatar: getProfileImage(parsed.profilePicture || parsed.profileImage || parsed.avatar),
        }));
      }
    } catch (error) {
      console.log('Refresh profile error:', error);
    }

    setRefreshing(false);
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);

    try {
      const userId = await AsyncStorage.getItem('userId');

      if (!userId) {
        Alert.alert('Error', 'User ID not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      const token = await AsyncStorage.getItem('userToken');

      const payload = {
        name: userData.name,
        telephone: userData.phone,
        district: userData.location,
      };

      const response = await fetch(`${AUTH_SERVICE_URL}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        const storedUser = await AsyncStorage.getItem('user');

        if (storedUser) {
          const currentUser = JSON.parse(storedUser);

          const updatedUser = {
            ...currentUser,
            name: userData.name,
            telephone: userData.phone,
            district: userData.location,
          };

          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

          if (typeof saveUser === 'function') {
            await saveUser(updatedUser);
          }
        }

        Alert.alert('Success', 'Profile updated successfully!');
        setShowEditModal(false);
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile.');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor="#667eea"
          />
        }
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ['#1a1a2e', '#16213e']
              : ['#667eea', '#764ba2', '#f093fb']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Text style={styles.headerTitle}>My Profile</Text>

            <TouchableOpacity
              onPress={toggleTheme}
              style={styles.backButton}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isDarkMode ? 'moon' : 'sunny'}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: userData.avatar }}
                style={styles.avatar}
              />

              <TouchableOpacity
                style={styles.cameraIcon}
                onPress={() => setShowEditModal(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <Text style={styles.userName}>{userData.name}</Text>

            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#ffffffcc" />
              <Text style={styles.locationText}>{userData.location}</Text>
            </View>

          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.totalServices}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.starPoints}</Text>
              <Text style={styles.statLabel}>Star Points</Text>
            </View>

          </View>
        </LinearGradient>

        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, isDarkMode && styles.menuItemDark]}
              onPress={() => handleMenuPress(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                {renderMenuIcon(item)}
              </View>

              <Text style={[styles.menuTitle, isDarkMode && styles.textDark]}>
                {item.title}
              </Text>

              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
            <LinearGradient
              colors={
                isDarkMode
                  ? ['#1a1a2e', '#16213e']
                  : ['#667eea', '#764ba2']
              }
              style={styles.modalHeader}
            >
              <Text style={styles.modalTitle}>Edit Profile</Text>

              <TouchableOpacity
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={styles.modalBody}>
              <TouchableOpacity
                style={[styles.changePhotoButton, isDarkMode && styles.changePhotoButtonDark]}
                activeOpacity={0.8}
              >
                <Ionicons name="camera" size={24} color="#667eea" />
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
                  Full Name
                </Text>

                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={userData.name}
                  onChangeText={(text) => setUserData({ ...userData, name: text })}
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
                  Email
                </Text>

                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={userData.email}
                  editable={false}
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
                  Phone
                </Text>

                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={userData.phone}
                  onChangeText={(text) => setUserData({ ...userData, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>
                  District / Location
                </Text>

                <TextInput
                  style={[styles.input, isDarkMode && styles.inputDark]}
                  value={userData.location}
                  onChangeText={(text) => setUserData({ ...userData, location: text })}
                  placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
                  placeholder="e.g., Colombo"
                />
              </View>

              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveProfile}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    isDarkMode
                      ? ['#2d3561', '#1a1a2e']
                      : ['#667eea', '#764ba2']
                  }
                  style={styles.saveGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 30,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#667eea',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#ffffffcc',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#ffffffcc',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff20',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#ffffffcc',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ffffff30',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItemDark: {
    backgroundColor: '#16213e',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 14,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalContainerDark: {
    backgroundColor: '#16213e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  modalBody: {
    padding: 20,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 20,
  },
  changePhotoButtonDark: {
    borderColor: '#2d3561',
  },
  changePhotoText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  inputDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
    color: '#fff',
  },
  saveButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
    marginBottom: 30,
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
});
