import React, { useContext, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../pages/IT22129376/theme';
import { useRoute } from '@react-navigation/native';
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

export default function HeaderSection(props) {
  const route = useRoute();
  return route.name === 'NewsFeedMain' ? <HomeHeaderContent {...props} /> : null;
}

function HomeHeaderContent({
  navigation,
  userName = 'Provider',
  avatarUrl = null,
  search = '',
  onSearchChange = () => {},
  onInboxPress,
  onMenuPress,
}) {
  const { i18n } = useTranslation();
  const isSi = i18n.language === 'si';
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
    bg: isDark ? COLORS.darkBg : COLORS.bg,
    border: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    greeting: isDark ? '#94A3B8' : '#64748B',
    name: isDark ? '#F1F5F9' : '#161C18',
    iconBg: isDark ? '#161C18' : '#F1F5F9',
    iconColor: isDark ? '#D8E8DC' : '#161C18',
    searchBg: isDark ? COLORS.darkCard : COLORS.card,
    searchBorder: isDark ? COLORS.darkBorder : COLORS.border,
    searchText: isDark ? '#F1F5F9' : '#161C18',
    placeholderColor: isDark ? '#64748B' : '#94A3B8',
  };

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={T.bg} />

      <View style={[styles.headerContainer, { backgroundColor: T.bg, borderBottomColor: T.border }]}>
        <LinearGradient colors={isDark ? ['#0C0F0D', '#152119'] : ['#166534', '#15803D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.brandHeader}>
          <View style={styles.brandArea}>
            <Text style={styles.brandName}>WorkWave</Text>
            <Text style={styles.brandTagline}>{isSi ? 'ඔබේ සේවා ව්‍යාපාරය' : 'Your Service Business'}</Text>
          </View>
          <View style={[styles.headerActionsPill, { backgroundColor: isDark ? '#1A251E' : '#FFFFFF' }]}>
            <TouchableOpacity accessibilityLabel="Change language" onPress={() => i18n.changeLanguage(isSi ? 'en' : 'si')} style={[styles.languageButton, { backgroundColor: isDark ? '#293A2E' : '#EAF7EE' }]}><Text style={{ color: isDark ? '#B5DCC0' : '#166534', fontSize: 11, fontWeight: '700' }}>{isSi ? 'සිං' : 'EN'}</Text></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Toggle theme" style={styles.pillButton} onPress={toggleTheme}><MaterialCommunityIcons name={isDark ? 'weather-night' : 'weather-sunny'} size={21} color={isDark ? '#86C99A' : '#D97706'} /></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Messages" style={styles.pillButton} onPress={handleInboxPress}><MaterialIcons name="chat-bubble-outline" size={21} color={isDark ? '#D4EBDD' : '#334C70'} />{unreadCount > 0 ? <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View> : null}</TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Notifications" style={styles.pillButton} onPress={() => navigation.navigate('HomeTab', { screen: 'Notifications' })}><MaterialIcons name="notifications-none" size={23} color={isDark ? '#D4EBDD' : '#334C70'} /></TouchableOpacity>
            <TouchableOpacity accessibilityLabel="Open menu" style={styles.pillButton} onPress={handleMenuPress}><MaterialIcons name="menu" size={22} color={isDark ? '#D4EBDD' : '#334C70'} /></TouchableOpacity>
          </View>
        </LinearGradient>

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
          <ProfileHeader
            navigation={navigation}
            userName={actualUserName}
            userInitials={getInitials(actualUserName)}
            showHeader={false}
            onLogout={handleCloseSidebar}
            externalVisible={isSidebarVisible}
            onClose={handleCloseSidebar}
          />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  brandHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  brandArea: { flexGrow: 1, minWidth: 110 },
  brandName: { fontSize: 26, fontWeight: '800', color: '#FFFFFF', letterSpacing: -1 },
  brandTagline: { fontSize: 11, color: '#DBEAFE', marginTop: 2 },
  headerActionsPill: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, padding: 5, gap: 2 },
  pillButton: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  languageButton: { minWidth: 32, height: 30, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  headerContainer: { paddingBottom: 12, borderBottomWidth: 1 },
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
    shadowColor: '#166534',
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
    backgroundColor: '#166534',
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
