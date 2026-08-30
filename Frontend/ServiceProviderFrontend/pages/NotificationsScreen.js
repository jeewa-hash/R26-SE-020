import React, { useState, useEffect, useLayoutEffect, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import { IP_ADDRESS } from '../config';
import { ThemeContext } from '../context/ThemeContext';

const API_URL = `http://${IP_ADDRESS}:4003`;
const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

// Configure foreground system notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'notifications' },
  { id: 'admin', label: 'System & Admin', icon: 'admin-panel-settings' },
  { id: 'messages', label: 'Messages', icon: 'chat' },
  { id: 'orders', label: 'Orders & Bookings', icon: 'shopping-bag' },
];

export default function NotificationScreen({ navigation }) {
  const { isDark = false } = useContext(ThemeContext) || {};

  const colors = isDark
    ? {
        bg: '#0F0F14',
        card: '#1C1C1E',
        textPrimary: '#F2F2F7',
        textSecondary: '#A1A1AA',
        textMuted: '#71717A',
        border: '#2C2C2E',
        headerBg: '#18181B',
        chipBg: '#27272A',
        chipText: '#A1A1AA',
        chipBadgeBg: '#3F3F46',
        chipBadgeText: '#D4D4D8',
        iconBgDefault: '#27272A',
        iconDefault: '#9CA3AF',
        actionBtnBg: '#1E1B4B',
        actionBtnText: '#818CF8',
        clearBtnBg: '#450A0A',
        clearBtnText: '#FCA5A5',
        emptyIconBg: '#27272A',
        emptyIconColor: '#52525B',
        rejectionBg: '#2C0B0E',
        rejectionBorder: '#7F1D1D',
        rejectionTitle: '#FCA5A5',
        approvalBg: '#062C1B',
        approvalBorder: '#065F46',
        approvalTitle: '#6EE7B7',
        suspensionBg: '#3A0C11',
        suspensionBorder: '#991B1B',
      }
    : {
        bg: '#F9FAFB',
        card: '#FFFFFF',
        textPrimary: '#111827',
        textSecondary: '#6B7280',
        textMuted: '#9CA3AF',
        border: '#F1F5F9',
        headerBg: '#FFFFFF',
        chipBg: '#F3F4F6',
        chipText: '#4B5563',
        chipBadgeBg: '#E5E7EB',
        chipBadgeText: '#4B5563',
        iconBgDefault: '#F3F4F6',
        iconDefault: '#6B7280',
        actionBtnBg: '#EEF2FF',
        actionBtnText: '#4F46E5',
        clearBtnBg: '#FEE2E2',
        clearBtnText: '#EF4444',
        emptyIconBg: '#F3F4F6',
        emptyIconColor: '#D1D5DB',
        rejectionBg: '#FFFBFB',
        rejectionBorder: '#FECACA',
        rejectionTitle: '#991B1B',
        approvalBg: '#F6FDF9',
        approvalBorder: '#A7F3D0',
        approvalTitle: '#065F46',
        suspensionBg: '#FFF1F2',
        suspensionBorder: '#FECDD3',
      };

  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
    fetchNotifications();
    setupSocketConnection();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    filterNotificationsByCategory(notifications, selectedCategory);
  }, [notifications, selectedCategory]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Notifications',
      headerStyle: { backgroundColor: colors.headerBg },
      headerTitleStyle: {
        fontWeight: 'bold',
        color: colors.textPrimary,
      },
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, isDark, colors.headerBg, colors.textPrimary]);

  // Request system notification permissions & set Android Notification Channel
  const registerForPushNotificationsAsync = async () => {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#6366F1',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('System notification permission not granted!');
    }
  };

  // Helper to trigger system notification popups in phone's top bar
  const triggerSystemNotification = async (title, body, data = {}) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: title || 'New Notification',
          body: body || '',
          data: data,
          sound: true,
        },
        trigger: null, // Display immediately
      });
    } catch (error) {
      console.error('Failed to display system notification:', error);
    }
  };

  // Real-time WebSocket setup with system tray notifications
  const setupSocketConnection = async () => {
    try {
      const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';

      socketRef.current = io(API_URL, {
        transports: ['websocket'],
        reconnection: true,
      });

      socketRef.current.on('connect', () => {
        socketRef.current.emit('join_notification_room', userId);
      });

      socketRef.current.on('new_notification', (newNotif) => {
        if (!newNotif || !newNotif._id) return;

        setNotifications((prev) => {
          const exists = prev.some((n) => n._id.toString() === newNotif._id.toString());
          if (exists) return prev;

          const categorizedNotif = {
            ...newNotif,
            category: newNotif.category || resolveCategory(newNotif.type),
          };

          // Trigger System Notification Bar Popup
          triggerSystemNotification(newNotif.title, newNotif.message, categorizedNotif);

          return [categorizedNotif, ...prev];
        });
      });
    } catch (error) {
      console.error('Failed to set up socket connection:', error);
    }
  };

  const resolveCategory = (type) => {
    if (!type) return 'admin';
    if (type.includes('inquiry') || type.includes('account') || type.includes('admin') || type.includes('suspended')) {
      return 'admin';
    }
    if (type.includes('message') || type.includes('chat')) {
      return 'messages';
    }
    if (type.includes('order') || type.includes('booking') || type.includes('payment')) {
      return 'orders';
    }
    return 'admin';
  };

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading && !refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';

      let adminNotifs = [];
      let authNotifs = [];

      try {
        const adminRes = await fetch(`${ADMIN_API_URL}/api/inquiries/notifications/${userId}`);
        const adminData = await adminRes.json();
        if (adminRes.ok && adminData.data) {
          adminNotifs = adminData.data.map((item) => ({
            ...item,
            category: item.category || 'admin',
          }));
        }
      } catch (e) {
        console.warn('Admin notifications fetch warning:', e);
      }

      if (token) {
        try {
          const response = await fetch(`${API_URL}/notifications`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (response.ok && Array.isArray(data)) {
            authNotifs = data.map((item) => ({
              ...item,
              category: item.category || resolveCategory(item.type),
            }));
          }
        } catch (e) {
          console.warn('General notifications fetch warning:', e);
        }
      }

      const combined = [...adminNotifs, ...authNotifs];
      const uniqueMap = new Map();
      combined.forEach((n) => {
        if (n && n._id && !uniqueMap.has(n._id.toString())) {
          uniqueMap.set(n._id.toString(), n);
        }
      });

      const sortedList = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setNotifications(sortedList);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const filterNotificationsByCategory = (list, category) => {
    if (category === 'all') {
      setFilteredNotifications(list);
    } else {
      setFilteredNotifications(list.filter((item) => item.category === category));
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const markAsRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );

      if (token) {
        fetch(`${API_URL}/notifications/${id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

      if (token) {
        fetch(`${API_URL}/notifications/read-all`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const clearAll = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setNotifications([]);

      if (token) {
        fetch(`${API_URL}/notifications`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const now = new Date();
    const diff = now - d;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const handleNotificationPress = (item) => {
    if (!item.isRead) markAsRead(item._id);

    if (item.type === 'inquiry_rejected' || item.type === 'inquiry_approved') {
      navigation.navigate('SubmitInquiry');
    } else if (item.category === 'messages' && item.chatId) {
      navigation.navigate('ChatScreen', { chatId: item.chatId });
    } else if (item.category === 'orders' && item.orderId) {
      navigation.navigate('OrderDetails', { orderId: item.orderId });
    }
  };

  const renderCategoryChips = () => (
    <View style={[styles.categoryContainer, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          const count = cat.id === 'all'
            ? notifications.length
            : notifications.filter((n) => n.category === cat.id).length;

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.chip,
                { backgroundColor: isActive ? '#6366F1' : colors.chipBg },
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={cat.icon}
                size={16}
                color={isActive ? '#FFFFFF' : colors.chipText}
              />
              <Text style={[styles.chipText, { color: isActive ? '#FFFFFF' : colors.chipText }]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[styles.chipBadge, { backgroundColor: isActive ? '#4F46E5' : colors.chipBadgeBg }]}>
                  <Text style={[styles.chipBadgeText, { color: isActive ? '#FFFFFF' : colors.chipBadgeText }]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }) => {
    const isRejection = item.type === 'inquiry_rejected';
    const isApproval = item.type === 'inquiry_approved';
    const isSuspension = item.type === 'account_suspended';
    const isMessage = item.category === 'messages';
    const isOrder = item.category === 'orders';

    let cardBg = colors.card;
    let borderColor = colors.border;

    if (isRejection) {
      cardBg = colors.rejectionBg;
      borderColor = colors.rejectionBorder;
    } else if (isApproval) {
      cardBg = colors.approvalBg;
      borderColor = colors.approvalBorder;
    } else if (isSuspension) {
      cardBg = colors.suspensionBg;
      borderColor = colors.suspensionBorder;
    } else if (!item.isRead) {
      cardBg = isDark ? '#1E1B4B22' : '#F9FAFF';
    }

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          { backgroundColor: cardBg, borderColor },
          !item.isRead && styles.unreadCard,
          isRejection && { borderLeftColor: '#DC2626' },
          isApproval && { borderLeftColor: '#059669' },
          isSuspension && { borderLeftColor: '#991B1B' },
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            isRejection
              ? { backgroundColor: isDark ? '#450A0A' : '#FEE2E2' }
              : isApproval
              ? { backgroundColor: isDark ? '#064E3B' : '#D1FAE5' }
              : isSuspension
              ? { backgroundColor: isDark ? '#4C0519' : '#FFE4E6' }
              : isMessage
              ? { backgroundColor: isDark ? '#075985' : '#E0F2FE' }
              : isOrder
              ? { backgroundColor: isDark ? '#78350F' : '#FEF3C7' }
              : { backgroundColor: !item.isRead ? (isDark ? '#312E81' : '#6366F115') : colors.iconBgDefault },
          ]}
        >
          <MaterialIcons
            name={
              isRejection
                ? 'replay'
                : isApproval
                ? 'verified'
                : isSuspension
                ? 'gavel'
                : isMessage
                ? 'chat'
                : isOrder
                ? 'shopping-bag'
                : item.type === 'high_demand_alert'
                ? 'trending-up'
                : 'notifications'
            }
            size={22}
            color={
              isRejection
                ? isDark ? '#FCA5A5' : '#DC2626'
                : isApproval
                ? isDark ? '#6EE7B7' : '#059669'
                : isSuspension
                ? isDark ? '#FDA4AF' : '#B91C1C'
                : isMessage
                ? isDark ? '#38BDF8' : '#0284C7'
                : isOrder
                ? isDark ? '#FBBF24' : '#D97706'
                : !item.isRead
                ? '#818CF8'
                : colors.iconDefault
            }
          />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                { color: colors.textPrimary },
                !item.isRead && styles.unreadText,
                isRejection && { color: colors.rejectionTitle },
                isApproval && { color: colors.approvalTitle },
              ]}
            >
              {item.title}
            </Text>
            {!item.isRead && (
              <View
                style={[
                  styles.unreadDot,
                  isRejection && { backgroundColor: '#DC2626' },
                  isApproval && { backgroundColor: '#059669' },
                ]}
              />
            )}
          </View>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{item.message}</Text>

          {isRejection && (
            <TouchableOpacity
              style={[styles.reSubmitBtn, { backgroundColor: isDark ? '#450A0A' : '#FEE2E2', borderColor: isDark ? '#991B1B' : '#FCA5A5' }]}
              onPress={() => {
                if (!item.isRead) markAsRead(item._id);
                navigation.navigate('SubmitInquiry');
              }}
            >
              <MaterialIcons name="replay" size={14} color={isDark ? '#FCA5A5' : '#DC2626'} />
              <Text style={[styles.reSubmitBtnText, { color: isDark ? '#FCA5A5' : '#DC2626' }]}>Re-submit Inquiry Now</Text>
              <MaterialIcons name="chevron-right" size={16} color={isDark ? '#FCA5A5' : '#DC2626'} />
            </TouchableOpacity>
          )}

          {isApproval && (
            <TouchableOpacity
              style={[styles.approvalActionBtn, { backgroundColor: isDark ? '#064E3B' : '#D1FAE5', borderColor: isDark ? '#047857' : '#6EE7B7' }]}
              onPress={() => {
                if (!item.isRead) markAsRead(item._id);
                navigation.navigate('SubmitInquiry');
              }}
            >
              <MaterialIcons name="verified" size={14} color={isDark ? '#6EE7B7' : '#059669'} />
              <Text style={[styles.approvalActionBtnText, { color: isDark ? '#6EE7B7' : '#047857' }]}>View Cleared Penalty Status</Text>
              <MaterialIcons name="chevron-right" size={16} color={isDark ? '#6EE7B7' : '#059669'} />
            </TouchableOpacity>
          )}

          <Text style={[styles.date, { color: colors.textMuted }]}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.bg }]}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.headerBg} translucent={false} />
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.screenHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.chipBg }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Notifications</Text>
            {notifications.length > 0 && (
              <View style={[styles.badgeCount, { backgroundColor: isDark ? '#312E81' : '#E0E7FF' }]}>
                <Text style={[styles.badgeCountText, { color: isDark ? '#A5B4FC' : '#4F46E5' }]}>{notifications.length}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {renderCategoryChips()}

        {notifications.length > 0 && (
          <View style={[styles.actionHeader, { backgroundColor: colors.headerBg, borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={markAllAsRead}
              style={[styles.actionBtn, { backgroundColor: colors.actionBtnBg }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="done-all" size={16} color={colors.actionBtnText} />
              <Text style={[styles.actionBtnText, { color: colors.actionBtnText }]}>Mark all read</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={clearAll}
              style={[styles.actionBtn, { backgroundColor: colors.clearBtnBg }]}
              activeOpacity={0.7}
            >
              <MaterialIcons name="delete-sweep" size={16} color={colors.clearBtnText} />
              <Text style={[styles.actionBtnText, { color: colors.clearBtnText }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {filteredNotifications.length === 0 ? (
          <View style={[styles.center, { backgroundColor: colors.bg }]}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.emptyIconBg }]}>
              <MaterialIcons name="notifications-none" size={60} color={colors.emptyIconColor} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>All caught up!</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              No notifications found in this category.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#6366F1']}
                tintColor="#6366F1"
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 28 : 0,
  },
  container: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  badgeCount: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  categoryContainer: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  chipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  chipBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  unreadText: {
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366F1',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  reSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
  },
  reSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  approvalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
  },
  approvalActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
});