import React, { useContext, useEffect, useRef, useState } from 'react';
import { 
  View, TouchableOpacity, StyleSheet, Platform, Image, Dimensions,
} from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { ThemeContext } from '../context/ThemeContext';
import { useUnread } from '../context/UnreadContext';
import ProfileHeader from '../navigation/ProfileHeader';
import { CONFIG } from '../config';

const { width, height } = Dimensions.get('window');

export default function HeaderSection({
  navigation,
  userName = 'Kasun',
  avatarUrl = null,
  search = '',
  onSearchChange = () => {},
  onInboxPress,
  onMenuPress,
}) {
  const theme = useContext(ThemeContext) || {};
  const isDark = theme.isDark ?? false;

  const { unreadCount = 0, setUnreadCount } = useUnread() || {};

  const socketRef = useRef(null);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [actualUserName, setActualUserName] = useState(userName);

  const fetchTotalUnreadCount = async (userId) => {
    try {
      const response = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat/user/${userId}`);
      if (response.ok) {
        const threads = await response.json();
        
        // Safeguard against non-array response or undefined items
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
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) return;

        const data = await response.json();
        const user = data.provider || data.user || data;

        if (user?.name) {
          setActualUserName(user.name);
        }
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

      if (isMounted) {
        await fetchTotalUnreadCount(storedUserId);
      }

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
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  };

  const handleInboxPress = () => {
    setUnreadCount(0);
    if (onInboxPress) {
      onInboxPress();
    } else if (navigation) {
      navigation.navigate('InboxScreen');
    }
  };

  const handleMenuPress = () => {
    if (onMenuPress) {
      onMenuPress();
      return;
    }
    setIsSidebarVisible(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarVisible(false);
  };

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' },
        ]}
      >
        <View style={styles.topRow}>
          <View style={styles.userSection}>
            <TouchableOpacity style={styles.avatarTouchable} activeOpacity={0.8}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{getInitials(actualUserName)}</Text>
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.userTextContainer}>
              <Text style={[styles.greetingText, { color: isDark ? '#98989D' : '#6B7280' }]}>
                Hello 👋
              </Text>
              <Text style={[styles.userNameText, { color: isDark ? '#F2F2F7' : '#1F2937' }]}>
                {actualUserName}
              </Text>
            </View>
          </View>

          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[
                styles.iconButton,
                { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
              ]}
              onPress={handleInboxPress}
              activeOpacity={0.7}
            >
              <MaterialIcons
                name="chat-bubble-outline"
                size={22}
                color={isDark ? '#F2F2F7' : '#1F2937'}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.menuBtn,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F5F5F7',
                  borderColor: isDark ? '#3A3A3C' : '#EBEBEB',
                },
              ]}
              onPress={handleMenuPress}
              activeOpacity={0.7}
            >
              <View style={styles.burgerLines}>
                <View
                  style={[
                    styles.burgerLine,
                    { backgroundColor: isDark ? '#F2F2F7' : '#111111' },
                  ]}
                />
                <View
                  style={[
                    styles.burgerLine,
                    { width: 14, backgroundColor: isDark ? '#F2F2F7' : '#111111' },
                  ]}
                />
                <View
                  style={[
                    styles.burgerLine,
                    { backgroundColor: isDark ? '#F2F2F7' : '#111111' },
                  ]}
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search services, categories..."
            placeholderTextColor={isDark ? '#8E8E93' : '#9CA3AF'}
            value={search}
            onChangeText={onSearchChange}
            style={[
              styles.searchBar,
              {
                backgroundColor: isDark ? '#2C2C2E' : '#F9FAFB',
                borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
              },
            ]}
            inputStyle={[
              styles.searchInput,
              { color: isDark ? '#F2F2F7' : '#111111' },
            ]}
            iconColor={isDark ? '#8E8E93' : '#9CA3AF'}
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
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarTouchable: {
    borderRadius: 22,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#7C3AED',
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  userTextContainer: {
    justifyContent: 'center',
  },
  greetingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '700',
  },
  actionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
    fontSize: 10,
    fontWeight: '800',
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    height: 2,
    borderRadius: 1,
  },
  searchContainer: {
    marginTop: 4,
  },
  searchBar: {
    borderRadius: 14,
    elevation: 0,
    borderWidth: 1,
    height: 46,
  },
  searchInput: {
    fontSize: 14,
    alignSelf: 'center',
    minHeight: 0,
  },
});