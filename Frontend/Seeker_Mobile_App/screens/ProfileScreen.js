import React, { useState, useEffect, useContext } from 'react';

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
import { confirmLogout } from '../utils/confirmLogout';
import { LanguageContext } from '../context/LanguageContext';
import { IP_ADDRESS, AUTH_SERVICE_URL as LIVE_AUTH_URL } from '../config';

const BASE_AUTH_URL = LIVE_AUTH_URL || `http://${IP_ADDRESS}:4003`;
const AUTH_SERVICE_URL = `${BASE_AUTH_URL}/seeker`;

// ─────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────
const P = {
  indigo: '#4F46E5',
  indigoDeep: '#4338CA',
  indigoSoft: '#EEF2FF',
  indigoSoftDark: '#1E1B4B',
  indigoLight: '#A5B4FC',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#ECFDF5',
  emeraldSoftDark: '#064E3B',
  emeraldLight: '#34D399',
  amber: '#F59E0B',
  amberDark: '#92400E',
  amberSoft: '#FEF3C7',
  amberSoftDark: '#78350F',
  rose: '#EF4444',
  roseDark: '#DC2626',
  roseSoft: '#FEF2F2',
  roseSoftDark: '#7F1D1D',
  roseLight: '#FCA5A5',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

// ─────────────────────────────────────────────────────────────
// Helpers (no hardcoded user content)
// ─────────────────────────────────────────────────────────────
const getProfileImage = (imagePath) => {
  if (!imagePath) return null; // 👈 no fake pravatar
  if (String(imagePath).startsWith('http')) return imagePath;
  return `${BASE_AUTH_URL}/${String(imagePath).replace(/^\/+/, '')}`;
};

const getLocationString = (userObj, isSi) => {
  if (userObj?.district) return userObj.district;
  if (userObj?.address) return userObj.address;
  if (userObj?.location && typeof userObj.location === 'string') return userObj.location;
  return isSi ? 'ස්ථානය සටහන් කර නැත' : 'Location not set';
};

// Deterministic gradient from a name — used when there's no real avatar
const AVATAR_GRADIENTS = [
  ['#4f46e5', '#7c3aed'],
  ['#059669', '#10b981'],
  ['#d97706', '#f59e0b'],
  ['#e11d48', '#fb7185'],
  ['#0284c7', '#38bdf8'],
  ['#7c3aed', '#c084fc'],
  ['#ea580c', '#fb923c'],
];

const getAvatarGradient = (name) => {
  const ch = (name || 'U').trim().charAt(0).toUpperCase();
  const code = ch.charCodeAt(0) || 0;
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
};

const getInitial = (name) => {
  const trimmed = String(name || '').trim();
  if (!trimmed) return 'U';
  return trimmed.charAt(0).toUpperCase();
};

// Real "member since" — only if the backend actually supplies a date
const getMemberSinceLabel = (userObj, isSi, language) => {
  const raw =
    userObj?.memberSince ||
    userObj?.createdAt ||
    userObj?.joinedAt ||
    userObj?.registeredAt;
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  try {
    const locale = isSi ? 'si-LK' : language || 'en';
    return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  } catch {
    return d.toLocaleDateString('en', { month: 'long', year: 'numeric' });
  }
};

// Greeting — personalized from real user name, never fabricated
const getGreeting = (userObj, isSi) => {
  const first = String(userObj?.name || '').trim().split(/\s+/)[0];
  if (!first) return isSi ? 'ආයුබෝවන්' : 'Welcome';
  return isSi ? `ආයුබෝවන්, ${first}` : `Hi, ${first}`;
};

// Grouped menu sections
const getMenuSections = (isSi) => [
  {
    id: 'activity',
    label: isSi ? 'ක්‍රියාකාරකම්' : 'Activity',
    items: [
      {
        id: 'myposts',
        title: isSi ? 'මගේ පළ කිරීම්' : 'My Posts',
        subtitle: isSi ? 'ඔබ පළ කළ ඉල්ලීම්' : 'Your posted service requests',
        icon: 'newspaper',
        iconType: 'ion',
        color: '#06B6D4',
        screen: 'MyPostsScreen',
      },
      {
        id: 'serviceSessions',
        title: isSi ? 'මගේ සේවා සැසි' : 'My Service Sessions',
        subtitle: isSi ? 'සේවා ඉල්ලීම් සහ මිල ගණන්' : 'Requests, quotations & sessions',
        icon: 'assignment',
        iconType: 'material',
        color: '#4F46E5',
        screen: 'SeekerServices',
      },
      {
        id: 'calendar',
        title: isSi ? 'දින දර්ශනය' : 'Calendar',
        subtitle: isSi ? 'මාසික සහ සතිපතා සේවා සැලසුම්' : 'Month, week & agenda views',
        icon: 'calendar',
        iconType: 'ion',
        color: '#6366F1',
        screen: 'SeekerCalendar',
      },
      {
        id: 'history',
        title: isSi ? 'සේවා ඉතිහාසය' : 'Service History',
        subtitle: isSi ? 'අවසන් වූ සේවාවන්' : 'Completed bookings',
        icon: 'time',
        iconType: 'ion',
        color: '#10B981',
        screen: 'HistoryScreen',
      },
      {
        id: 'starpoints',
        title: isSi ? 'තරු ලකුණු' : 'Star Points & Rewards',
        subtitle: isSi ? 'ලැබූ ලකුණු සහ වට්ටම්' : 'Points & special offers',
        icon: 'star',
        iconType: 'ion',
        color: '#F59E0B',
        screen: 'StarPointsScreen',
      },
    ],
  },
  {
    id: 'account',
    label: isSi ? 'ගිණුම' : 'Account',
    items: [
      {
        id: 'language',
        title: isSi ? 'භාෂාව වෙනස් කරන්න' : 'Change Language',
        subtitle: isSi ? 'වත්මන් භාෂාව: සිංහල' : 'Current: English',
        icon: 'translate',
        iconType: 'material',
        color: '#8B5CF6',
        screen: 'Language',
      },
    ],
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
  const { language } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';

  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const menuSections = getMenuSections(isSi);

  const [userData, setUserData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || user?.telephone || '',
    location: getLocationString(user, isSi),
    avatar: getProfileImage(user?.profilePicture || user?.profileImage || user?.avatar),
  });

  useEffect(() => {
    setUserData((current) => ({
      ...current,
      name: user?.name || current.name,
      email: user?.email || current.email,
      phone: user?.phone || user?.telephone || current.phone,
      location: getLocationString(user, isSi),
      avatar: getProfileImage(user?.profilePicture || user?.profileImage || user?.avatar),
    }));
  }, [user, isSi]);

  // Derived (real) values
  const displayName = userData.name || (isSi ? 'පරිශීලකයා' : 'User');
  const greeting = getGreeting({ name: userData.name }, isSi);
  const memberSinceLabel = getMemberSinceLabel(user, isSi, language);
  const avatarGradient = getAvatarGradient(displayName);
  const initial = getInitial(displayName);

  const handleMenuPress = (screen) => {
    navigation.navigate(screen);
  };

  const handleLogout = () => {
    confirmLogout(async () => {
      try {
        await logout();
        navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
      } catch (error) {
        console.log('Logout error:', error);
        if (Platform.OS === 'web') window.alert('Unable to logout. Please try again.');
        else Alert.alert('Error', 'Unable to logout. Please try again.');
      }
    });
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
        backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[P.indigo]}
            tintColor={P.indigo}
          />
        }
      >
        {/* ── Hero profile card ── */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={
              isDarkMode
                ? [P.indigoSoftDark, '#312E81']
                : [P.indigo, P.indigoDeep]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroDeco1} />
            <View style={styles.heroDeco2} />

            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroGreeting} numberOfLines={1}>
                  {greeting}
                </Text>
                <Text style={styles.heroSubGreeting}>
                  {isSi ? 'ඔබගේ ගිණුම' : 'Your account'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.heroIconBtn}
                onPress={toggleTheme}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isDarkMode ? 'moon' : 'sunny'}
                  size={20}
                  color={P.white}
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          <View
            style={[
              styles.profileCard,
              isDarkMode && { backgroundColor: P.slate800, borderColor: P.slate700 },
            ]}
          >
            <View style={styles.avatarContainer}>
              <View
                style={[
                  styles.avatarRing,
                  isDarkMode && { backgroundColor: P.slate800, borderColor: P.slate700 },
                ]}
              >
                {userData.avatar ? (
                  <Image source={{ uri: userData.avatar }} style={styles.avatar} />
                ) : (
                  <LinearGradient
                    colors={avatarGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.avatarFallback}
                  >
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </LinearGradient>
                )}
              </View>

              <TouchableOpacity
                style={styles.cameraIcon}
                onPress={() => setShowEditModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="camera" size={16} color={P.white} />
              </TouchableOpacity>
            </View>

            <Text
              style={[styles.userName, isDarkMode && { color: P.white }]}
              numberOfLines={1}
            >
              {displayName}
            </Text>

            <View style={styles.locationRow}>
              <Ionicons
                name="location-outline"
                size={14}
                color={isDarkMode ? P.slate400 : P.slate500}
              />
              <Text
                style={[styles.locationText, isDarkMode && { color: P.slate400 }]}
                numberOfLines={1}
              >
                {userData.location}
              </Text>
            </View>

            {/* Member since — only if backend provides a real date */}
            {memberSinceLabel ? (
              <View style={styles.metaRow}>
                <View
                  style={[
                    styles.metaChip,
                    isDarkMode && { backgroundColor: P.slate800, borderColor: P.slate700 },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={isDarkMode ? P.indigoLight : P.indigo}
                  />
                  <Text
                    style={[styles.metaChipText, isDarkMode && { color: P.indigoLight }]}
                  >
                    {isSi ? 'සාමාජිකත්වය: ' : 'Member since '}
                    {memberSinceLabel}
                  </Text>
                </View>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.editProfileBtn,
                isDarkMode && { backgroundColor: P.indigoSoftDark, borderColor: P.indigo },
              ]}
              onPress={() => setShowEditModal(true)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="create-outline"
                size={16}
                color={isDarkMode ? P.indigoLight : P.indigo}
              />
              <Text
                style={[styles.editProfileBtnText, isDarkMode && { color: P.indigoLight }]}
              >
                {isSi ? 'පැතිකඩ සංස්කරණය' : 'Edit Profile'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Menu sections ── */}
        {menuSections.map((section) => (
          <View key={section.id} style={styles.menuSection}>
            <Text
              style={[styles.sectionLabel, isDarkMode && { color: P.slate400 }]}
            >
              {section.label.toUpperCase()}
            </Text>

            <View
              style={[
                styles.menuCard,
                isDarkMode && { backgroundColor: P.slate800, borderColor: P.slate700 },
              ]}
            >
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleMenuPress(item.screen)}
                    activeOpacity={0.7}
                    style={[
                      styles.menuItem,
                      !isLast && [
                        styles.menuItemBordered,
                        isDarkMode && { borderColor: P.slate700 },
                      ],
                    ]}
                  >
                    <View
                      style={[
                        styles.menuIcon,
                        {
                          backgroundColor: isDarkMode
                            ? `${item.color}22`
                            : `${item.color}15`,
                        },
                      ]}
                    >
                      {renderMenuIcon(item)}
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.menuTitle, isDarkMode && { color: P.white }]}
                        numberOfLines={1}
                      >
                        {item.title}
                      </Text>
                      {item.subtitle ? (
                        <Text
                          style={[
                            styles.menuSubtitle,
                            isDarkMode && { color: P.slate400 },
                          ]}
                          numberOfLines={1}
                        >
                          {item.subtitle}
                        </Text>
                      ) : null}
                    </View>

                    <View
                      style={[
                        styles.chevronWrap,
                        isDarkMode && { backgroundColor: P.slate900 },
                      ]}
                    >
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={isDarkMode ? P.slate400 : P.slate500}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* ── Logout ── */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[P.rose, P.roseDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={20} color={P.white} />
            <Text style={styles.logoutText}>
              {isSi ? 'ඉවත් වන්න' : 'Logout'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* ── Edit Modal ── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              isDarkMode && { backgroundColor: P.slate800 },
            ]}
          >
            <View
              style={[
                styles.modalHandle,
                isDarkMode && { backgroundColor: P.slate700 },
              ]}
            />

            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={[styles.modalTitle, isDarkMode && { color: P.white }]}
                >
                  {isSi ? 'පැතිකඩ සංස්කරණය' : 'Edit Profile'}
                </Text>
                <Text
                  style={[styles.modalSubtitle, isDarkMode && { color: P.slate400 }]}
                >
                  {isSi
                    ? 'ඔබගේ තොරතුරු යාවත්කාලීන කරන්න'
                    : 'Update your personal details'}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalCloseBtn,
                  isDarkMode && { backgroundColor: P.slate700 },
                ]}
                onPress={() => setShowEditModal(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color={isDarkMode ? P.white : P.slate900} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <TouchableOpacity
                style={[
                  styles.changePhotoButton,
                  isDarkMode && { borderColor: P.slate700, backgroundColor: P.slate900 },
                ]}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.changePhotoIcon,
                    isDarkMode && { backgroundColor: P.indigoSoftDark },
                  ]}
                >
                  <Ionicons
                    name="camera"
                    size={20}
                    color={isDarkMode ? P.indigoLight : P.indigo}
                  />
                </View>
                <Text
                  style={[
                    styles.changePhotoText,
                    isDarkMode && { color: P.indigoLight },
                  ]}
                >
                  {isSi ? 'පැතිකඩ ඡායාරූපය වෙනස් කරන්න' : 'Change Profile Photo'}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={isDarkMode ? P.slate400 : P.slate500}
                />
              </TouchableOpacity>

              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, isDarkMode && { color: P.slate300 }]}
                >
                  {isSi ? 'සම්පූර්ණ නම' : 'Full Name'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isDarkMode && {
                      backgroundColor: P.slate900,
                      borderColor: P.slate700,
                      color: P.white,
                    },
                  ]}
                  value={userData.name}
                  onChangeText={(text) => setUserData({ ...userData, name: text })}
                  placeholderTextColor={isDarkMode ? P.slate500 : P.slate400}
                />
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputLabelRow}>
                  <Text
                    style={[styles.inputLabel, isDarkMode && { color: P.slate300 }]}
                  >
                    {isSi ? 'විද්‍යුත් තැපෑල' : 'Email'}
                  </Text>
                  <View
                    style={[
                      styles.lockedChip,
                      isDarkMode && { backgroundColor: P.slate700 },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed"
                      size={10}
                      color={isDarkMode ? P.slate400 : P.slate500}
                    />
                    <Text
                      style={[
                        styles.lockedChipText,
                        isDarkMode && { color: P.slate400 },
                      ]}
                    >
                      {isSi ? 'වෙනස් කළ නොහැක' : 'Read-only'}
                    </Text>
                  </View>
                </View>
                <TextInput
                  style={[
                    styles.input,
                    styles.inputDisabled,
                    isDarkMode && {
                      backgroundColor: P.slate900,
                      borderColor: P.slate700,
                      color: P.slate400,
                    },
                  ]}
                  value={userData.email}
                  editable={false}
                  placeholderTextColor={isDarkMode ? P.slate500 : P.slate400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, isDarkMode && { color: P.slate300 }]}
                >
                  {isSi ? 'දුරකථන අංකය' : 'Phone Number'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isDarkMode && {
                      backgroundColor: P.slate900,
                      borderColor: P.slate700,
                      color: P.white,
                    },
                  ]}
                  value={userData.phone}
                  onChangeText={(text) => setUserData({ ...userData, phone: text })}
                  keyboardType="phone-pad"
                  placeholderTextColor={isDarkMode ? P.slate500 : P.slate400}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text
                  style={[styles.inputLabel, isDarkMode && { color: P.slate300 }]}
                >
                  {isSi ? 'දිස්ත්‍රික්කය / ස්ථානය' : 'District / Location'}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isDarkMode && {
                      backgroundColor: P.slate900,
                      borderColor: P.slate700,
                      color: P.white,
                    },
                  ]}
                  value={userData.location}
                  onChangeText={(text) => setUserData({ ...userData, location: text })}
                  placeholderTextColor={isDarkMode ? P.slate500 : P.slate400}
                  placeholder={isSi ? 'උදා: කොළඹ' : 'e.g., Colombo'}
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
                      ? [P.indigoLight, P.indigo]
                      : [P.indigo, P.indigoDeep]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.saveGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color={P.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={18} color={P.white} />
                      <Text style={styles.saveButtonText}>
                        {isSi ? 'වෙනස්කම් සුරකින්න' : 'Save Changes'}
                      </Text>
                    </>
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

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.slate50 },
  containerDark: { backgroundColor: P.slate900 },
  scrollContent: { paddingBottom: 30 },

  // ── Hero ──
  heroWrap: { marginBottom: 22 },
  heroBanner: {
    height: 160,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 16,
    paddingBottom: 24,
    overflow: 'hidden',
    position: 'relative',
  },
  heroDeco1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -100,
    right: -60,
  },
  heroDeco2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -80,
    left: -30,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '800',
    color: P.white,
    letterSpacing: -0.3,
  },
  heroSubGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    fontWeight: '500',
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Profile card ──
  profileCard: {
    marginTop: -60,
    marginHorizontal: 16,
    backgroundColor: P.white,
    borderRadius: 22,
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
      },
      android: { elevation: 5 },
    }),
  },
  avatarContainer: {
    position: 'absolute',
    top: -50,
    alignSelf: 'center',
  },
  avatarRing: {
    padding: 5,
    borderRadius: 62,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 40,
    fontWeight: '900',
    color: P.white,
    letterSpacing: -1,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: P.indigo,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: P.white,
  },
  userName: {
    fontSize: 22,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
    marginBottom: 4,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
    maxWidth: '90%',
  },
  locationText: {
    fontSize: 13,
    color: P.slate500,
    fontWeight: '500',
    flexShrink: 1,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: P.indigoSoft,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  metaChipText: { fontSize: 11.5, fontWeight: '700', color: P.indigo },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: P.indigoSoft,
    borderWidth: 1,
    borderColor: P.indigo,
    minWidth: 160,
  },
  editProfileBtnText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: P.indigo,
    letterSpacing: 0.2,
  },

  // ── Menu sections ──
  menuSection: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: P.slate500,
    letterSpacing: 0.8,
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  menuCard: {
    marginHorizontal: 16,
    backgroundColor: P.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: P.slate200,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuItemBordered: { borderBottomWidth: 1, borderColor: P.slate100 },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: P.slate900,
    letterSpacing: -0.1,
  },
  menuSubtitle: {
    fontSize: 12,
    color: P.slate500,
    marginTop: 2,
    fontWeight: '500',
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: P.slate100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // ── Logout ──
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: P.rose,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: P.white },

  // ── Modal ──
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: P.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: P.slate300,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 12.5,
    color: P.slate500,
    marginTop: 2,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: P.slate100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { paddingHorizontal: 20, paddingBottom: 30 },

  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: P.slate200,
    borderRadius: 14,
    marginBottom: 20,
    backgroundColor: P.slate50,
  },
  changePhotoIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changePhotoText: {
    flex: 1,
    fontSize: 13.5,
    color: P.indigo,
    fontWeight: '700',
  },

  inputGroup: { marginBottom: 16 },
  inputLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: P.slate700,
    marginBottom: 6,
  },
  lockedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.slate100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  lockedChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: P.slate500,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: P.slate50,
    borderWidth: 1,
    borderColor: P.slate200,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: P.slate900,
    fontWeight: '500',
  },
  inputDisabled: {
    backgroundColor: P.slate100,
    color: P.slate500,
  },

  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: P.indigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: P.white,
    letterSpacing: 0.2,
  },
});