import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { ThemeContext } from '../context/ThemeContext';
import { useUnread } from '../context/UnreadContext';
import ProfileHeader from '../navigation/ProfileHeader';
import { CONFIG } from '../config';

const { width } = Dimensions.get('window');

export default function HeaderSection({
  navigation,
  userName = 'Provider',
  avatarUrl = null,
  search = '',
  onSearchChange = () => {},
  onInboxPress,
  onMenuPress,
}) {
  const theme = useContext(ThemeContext) || {};
  const isDark = theme.isDark ?? false;
  const toggleTheme = theme.toggleTheme ?? (() => {});

  const { unreadCount = 0, setUnreadCount } = useUnread() || {};

  const socketRef = useRef(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [actualUserName, setActualUserName] = useState(userName);
  const [onlineStatus] = useState(true); // always online once logged in

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const fetchTotalUnreadCount = async (userId) => {
    try {
      const response = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat/user/${userId}`);
      if (response.ok) {
        const threads = await response.json();
        if (Array.isArray(threads)) {
          const total = threads.reduce((sum, thread) => {
            return sum + (thread && typeof thread.unreadCount === 'number' ? thread.unreadCount : 0);
          }, 0);
          setUnreadCount(total);
        }
      }
    } catch (error) {
      console.error('Failed to fetch total unread count:', error);
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const response = await fetch(`${CONFIG.AUTH_SERVICE_URL}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const user = data.provider || data.user || data;
        if (user?.name) setActualUserName(user.name);
      } catch (error) {
        console.error('Failed to load user:', error);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    let isMounted = true;
    const setupHeaderSocket = async () => {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (!storedUserId) return;
      if (isMounted) await fetchTotalUnreadCount(storedUserId);

      socketRef.current = io(CONFIG.SEEKER_SERVICE_URL);
      socketRef.current.emit('addUser', storedUserId);
      socketRef.current.on('getMessage', (incomingData) => {
        if (incomingData && incomingData.senderId !== storedUserId) {
          setUnreadCount((prev) => (prev || 0) + 1);
        }
      });
    };
    setupHeaderSocket();
    return () => {
      isMounted = false;
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((part) => part[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleInboxPress = () => {
    setUnreadCount(0);
    if (onInboxPress) onInboxPress();
    else if (navigation) navigation.navigate('InboxScreen');
  };

  const handleMenuPress = () => {
    if (onMenuPress) { onMenuPress(); return; }
    setIsSidebarVisible(true);
  };

  const handleCloseSidebar = () => setIsSidebarVisible(false);

  const T = {
    bg: isDark ? '#14141F' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    greeting: isDark ? '#94A3B8' : '#64748B',
    name: isDark ? '#F1F5F9' : '#1E293B',
    iconBg: isDark ? '#1E293B' : '#F1F5F9',
    iconColor: isDark ? '#E2E8F0' : '#1E293B',
    searchBg: isDark ? '#1E293B' : '#F8FAFC',
    searchBorder: isDark ? '#334155' : '#E2E8F0',
    searchText: isDark ? '#F1F5F9' : '#1E293B',
    placeholderColor: isDark ? '#64748B' : '#94A3B8',
  };

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />

      <View style={[styles.headerContainer, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
        {/* Subtle gradient shimmer across top */}
        <LinearGradient
          colors={isDark ? ['#7C3AED18', '#4F46E508'] : ['#7C3AED0A', '#4F46E504']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientBand}
          pointerEvents="none"
        />

        <View style={styles.topRow}>
          {/* Left: Avatar + Greeting */}
          <View style={styles.userSection}>
            <TouchableOpacity style={styles.avatarTouchable} activeOpacity={0.85}>
              <LinearGradient
                colors={['#7C3AED', '#4F46E5']}
                style={styles.avatarRing}
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarFallbackText}>{getInitials(actualUserName)}</Text>
                  </View>
                )}
              </LinearGradient>
              {/* Online status dot */}
              <View style={[styles.onlineDot, { borderColor: T.bg }]} />
            </TouchableOpacity>

            <View style={styles.userTextContainer}>
              <Text style={[styles.greetingText, { color: T.greeting }]}>
                {getGreeting()} 👋
              </Text>
              <Text style={[styles.userNameText, { color: T.name }]} numberOfLines={1}>
                {actualUserName}
              </Text>
            </View>
          </View>

          {/* Right: Actions */}
          <View style={styles.actionsContainer}>
            {/* Dark / Light toggle */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: T.iconBg }]}
              onPress={toggleTheme}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isDark ? 'weather-sunny' : 'weather-night'}
                size={20}
                color={isDark ? '#FBBF24' : '#6366F1'}
              />
            </TouchableOpacity>

            {/* Inbox / Chat */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: T.iconBg }]}
              onPress={handleInboxPress}
              activeOpacity={0.7}
            >
              <MaterialIcons name="chat-bubble-outline" size={21} color={T.iconColor} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Hamburger / Menu */}
            <TouchableOpacity
              style={[styles.menuBtn, { backgroundColor: T.iconBg, borderColor: T.border }]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <View style={styles.burgerLines}>
                <View style={[styles.burgerLine, { backgroundColor: T.iconColor }]} />
                <View style={[styles.burgerLine, { width: 13, backgroundColor: T.iconColor }]} />
                <View style={[styles.burgerLine, { backgroundColor: T.iconColor }]} />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search services, categories..."
            placeholderTextColor={T.placeholderColor}
            value={search}
            onChangeText={onSearchChange}
            style={[
              styles.searchBar,
              { backgroundColor: T.searchBg, borderColor: T.searchBorder },
            ]}
            inputStyle={[styles.searchInput, { color: T.searchText }]}
            iconColor={T.placeholderColor}
          />
        </View>
      </View>

      {isSidebarVisible && (
        <View style={StyleSheet.absoluteFillObject}>
          <ProfileHeader
            navigation={navigation}
            userName={actualUserName}
            onLogout={handleCloseSidebar}
            externalVisible={isSidebarVisible}
            onClose={handleCloseSidebar}
          />
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 54 : 38,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 26,
    borderBottomRightRadius: 26,
    borderBottomWidth: 1,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  gradientBand: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 4,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatarRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#5B3FBF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981',
    borderWidth: 2,
  },
  userTextContainer: {
    justifyContent: 'center',
    flex: 1,
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burgerLines: {
    width: 18,
    height: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  burgerLine: {
    width: 18,
    height: 2.5,
    borderRadius: 2,
  },
  searchContainer: {
    marginTop: 2,
  },
  searchBar: {
    borderRadius: 16,
    elevation: 0,
    borderWidth: 1.5,
    height: 48,
  },
  searchInput: {
    fontSize: 14,
    alignSelf: 'center',
    minHeight: 0,
  },
});