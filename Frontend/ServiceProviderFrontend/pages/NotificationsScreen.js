import React, { useState, useEffect, useLayoutEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003`;
const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();
    
    const intervalId = setInterval(() => {
      fetchNotifications(false);
    }, 3000); // 3 seconds fast live polling
    
    return () => clearInterval(intervalId);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Notifications',
      headerTitleStyle: {
        fontWeight: 'bold',
        color: '#111827',
      },
      headerLeft: () => (
        <TouchableOpacity 
          style={{ marginLeft: 15 }} 
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading && !refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';

      let adminNotifs = [];
      let authNotifs = [];

      // Fetch from Admin Service
      try {
        const adminRes = await fetch(`${ADMIN_API_URL}/api/inquiries/notifications/${userId}`);
        const adminData = await adminRes.json();
        if (adminRes.ok && adminData.data) {
          adminNotifs = adminData.data;
        }
      } catch (e) {}

      // Fetch from Auth Service if token available
      if (token) {
        try {
          const response = await fetch(`${API_URL}/notifications`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (response.ok && Array.isArray(data)) {
            authNotifs = data;
          }
        } catch (e) {}
      }

      // Merge and deduplicate by _id
      const combined = [...adminNotifs, ...authNotifs];
      const uniqueMap = new Map();
      combined.forEach(n => {
        if (n && n._id && !uniqueMap.has(n._id.toString())) {
          uniqueMap.set(n._id.toString(), n);
        }
      });

      const sortedList = Array.from(uniqueMap.values()).sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setNotifications(sortedList);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  const markAsRead = async (id) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      
      if (token) {
        fetch(`${API_URL}/notifications/${id}/read`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      
      if (token) {
        fetch(`${API_URL}/notifications/read-all`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  const clearAll = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      setNotifications([]);
      
      if (token) {
        fetch(`${API_URL}/notifications`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('Failed to clear notifications', err);
    }
  };

  const formatDate = (dateString) => {
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
    }
  };

  const renderItem = ({ item }) => {
    const isRejection = item.type === 'inquiry_rejected';
    const isApproval = item.type === 'inquiry_approved';
    const isSuspension = item.type === 'account_suspended';

    return (
      <TouchableOpacity 
        style={[
          styles.notificationCard,
          !item.isRead && styles.unreadCard,
          isRejection && styles.rejectionCard,
          isApproval && styles.approvalCard,
          isSuspension && styles.suspensionCard,
        ]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.iconContainer,
            isRejection
              ? { backgroundColor: '#fee2e2' }
              : isApproval
              ? { backgroundColor: '#d1fae5' }
              : isSuspension
              ? { backgroundColor: '#ffe4e6' }
              : { backgroundColor: !item.isRead ? '#6366f115' : '#f3f4f6' },
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
                : item.type === 'high_demand_alert'
                ? 'trending-up'
                : 'notifications'
            } 
            size={22} 
            color={
              isRejection
                ? '#dc2626'
                : isApproval
                ? '#059669'
                : isSuspension
                ? '#b91c1c'
                : !item.isRead
                ? '#6366f1'
                : '#6b7280'
            } 
          />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                !item.isRead && styles.unreadText,
                isRejection && styles.rejectionTitle,
                isApproval && styles.approvalTitle,
              ]}
            >
              {item.title}
            </Text>
            {!item.isRead && (
              <View
                style={[
                  styles.unreadDot,
                  isRejection && { backgroundColor: '#dc2626' },
                  isApproval && { backgroundColor: '#059669' },
                ]}
              />
            )}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          
          {isRejection && (
            <TouchableOpacity
              style={styles.reSubmitBtn}
              onPress={() => {
                if (!item.isRead) markAsRead(item._id);
                navigation.navigate('SubmitInquiry');
              }}
            >
              <MaterialIcons name="replay" size={14} color="#dc2626" />
              <Text style={styles.reSubmitBtnText}>Re-submit Inquiry Now</Text>
              <MaterialIcons name="chevron-right" size={16} color="#dc2626" />
            </TouchableOpacity>
          )}

          {isApproval && (
            <TouchableOpacity
              style={styles.approvalActionBtn}
              onPress={() => {
                if (!item.isRead) markAsRead(item._id);
                navigation.navigate('SubmitInquiry');
              }}
            >
              <MaterialIcons name="verified" size={14} color="#059669" />
              <Text style={styles.approvalActionBtnText}>View Cleared Penalty Status</Text>
              <MaterialIcons name="chevron-right" size={16} color="#059669" />
            </TouchableOpacity>
          )}

          <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" translucent={false} />
      <View style={styles.container}>
        {/* Top Header Bar */}
        <View style={styles.screenHeader}>
          <TouchableOpacity 
            style={styles.backBtn} 
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Notifications</Text>
            {notifications.length > 0 && (
              <View style={styles.badgeCount}>
                <Text style={styles.badgeCountText}>{notifications.length}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Action Header */}
        {notifications.length > 0 && (
          <View style={styles.actionHeader}>
            <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn} activeOpacity={0.7}>
              <MaterialIcons name="done-all" size={16} color="#4f46e5" />
              <Text style={styles.actionBtnText}>Mark all read</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={clearAll} style={[styles.actionBtn, styles.clearBtn]} activeOpacity={0.7}>
              <MaterialIcons name="delete-sweep" size={16} color="#ef4444" />
              <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Clear all</Text>
            </TouchableOpacity>
          </View>
        )}

        {notifications.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconContainer}>
              <MaterialIcons name="notifications-none" size={60} color="#d1d5db" />
            </View>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtitle}>You'll see your notifications here when they arrive.</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#6366f1']}
                tintColor="#6366f1"
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
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
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
    color: '#111827',
  },
  badgeCount: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeCountText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4f46e5',
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  clearBtn: {
    backgroundColor: '#fee2e2',
  },
  actionBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4f46e5',
  },
  listContainer: {
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  unreadCard: {
    backgroundColor: '#f9faff',
    borderLeftWidth: 4,
    borderLeftColor: '#6366f1',
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
    color: '#4b5563',
  },
  unreadText: {
    color: '#111827',
    fontWeight: 'bold',
  },
  message: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  rejectionCard: {
    backgroundColor: '#fffbfb',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  suspensionCard: {
    backgroundColor: '#fff1f2',
    borderLeftWidth: 4,
    borderLeftColor: '#991b1b',
    borderWidth: 1,
    borderColor: '#fecdd3',
  },
  rejectionTitle: {
    color: '#991b1b',
    fontWeight: '800',
  },
  reSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fee2e2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  reSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
  },
  approvalCard: {
    backgroundColor: '#f6fdf9',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  approvalTitle: {
    color: '#065f46',
    fontWeight: '800',
  },
  approvalActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#d1fae5',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6ee7b7',
  },
  approvalActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#047857',
  },
});
