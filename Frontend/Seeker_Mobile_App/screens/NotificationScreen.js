import React, { useState, useEffect } from 'react';
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
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;
const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:3002`;
const QUOTATIONS_URL = `${PROVIDER_SERVICE_URL}/api/provider/quotations/seeker/me`;
const READ_QUOTES_KEY = 'readQuotes';

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchAllNotifications();
    const intervalId = setInterval(() => fetchAllNotifications(false), 15000);
    return () => clearInterval(intervalId);
  }, []);

  // ========== Helper functions for persistent read status ==========
  const getReadQuoteIds = async () => {
    try {
      const stored = await AsyncStorage.getItem(READ_QUOTES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveReadQuoteId = async (id) => {
    try {
      const current = await getReadQuoteIds();
      if (!current.includes(id)) {
        current.push(id);
        await AsyncStorage.setItem(READ_QUOTES_KEY, JSON.stringify(current));
      }
    } catch (e) {
      console.warn('Failed to save read quote ID:', e);
    }
  };

  // ========== Fetch notifications ==========
  const fetchAllNotifications = async (showLoading = true) => {
    if (showLoading && !refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      // 1. Auth service notifications
      let authNotifications = [];
      try {
        const authRes = await fetch(`${API_URL}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          authNotifications = Array.isArray(authData) ? authData : (authData.data || []);
        }
      } catch (err) {
        console.warn('Auth notifications fetch failed:', err);
      }

      // 2. Quotations from provider service
      let quoteNotifications = [];
      try {
        const quoteRes = await fetch(QUOTATIONS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const quoteData = await quoteRes.json();

        if (quoteData.success && quoteData.data) {
          const readIds = await getReadQuoteIds();

          quoteNotifications = quoteData.data.map((quote) => {
            const id = `quote_${quote._id}`;
            return {
              _id: id,
              type: 'quote',
              title: `New Quote: LKR ${quote.price}`,
              message: quote.notes || `Duration: ${quote.durationText || '1 day'}`,
              createdAt: quote.createdAt,
              isRead: readIds.includes(id),
              icon: 'document-text',
              iconColor: '#8B5CF6',
              action: 'View Quote',
              quoteId: quote._id,
              providerRequestId: quote.providerRequestId,
              providerId: quote.providerId?._id || quote.providerId,
              price: quote.price,
              duration: quote.durationText,
              status: quote.status,
              providerName: quote.providerId?.name || 'Provider',
            };
          });
        }
      } catch (err) {
        console.warn('Quotations fetch failed:', err);
      }

      // 3. Merge and sort (newest first)
      const combined = [...authNotifications, ...quoteNotifications].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
      setNotifications(combined);
    } catch (error) {
      console.error('Failed to fetch notifications', error);
      setNotifications([]);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  // ========== Mark as read ==========
  const markAsRead = async (id) => {
    if (id.startsWith('quote_')) {
      await saveReadQuoteId(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      return;
    }

    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  // ========== Mark all as read ==========
  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });

      const quoteIds = notifications
        .filter((n) => n.type === 'quote')
        .map((n) => n._id);
      for (const id of quoteIds) {
        await saveReadQuoteId(id);
      }

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      console.error('Failed to mark all as read', err);
    }
  };

  // ========== Clear all ==========
  const clearAll = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications([]);
    } catch (err) {
      setNotifications([]);
      console.error('Failed to clear notifications', err);
    }
  };

  // ========== Helpers ==========
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

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.type === activeTab);
  };

  // ========== Render item ==========
  const renderItem = ({ item }) => {
    let iconName = 'notifications';
    let iconColor = '#6b7280';
    let bgColor = '#f3f4f6';

    if (!item.isRead) {
      iconColor = '#007bff';
      bgColor = '#007bff15';
    }

    switch (item.type) {
      case 'high_demand_alert':
        iconName = 'trending-up';
        break;
      case 'booking':
        iconName = 'event-available';
        break;
      case 'message':
        iconName = 'chat';
        break;
      case 'bid':
        iconName = 'gavel';
        break;
      case 'quote':
        iconName = 'document-text';
        iconColor = '#8B5CF6';
        bgColor = '#8B5CF615';
        break;
      default:
        break;
    }

    return (
      <TouchableOpacity
        style={[styles.card, !item.isRead && styles.unreadCard]}
        onPress={() => {
          if (!item.isRead) markAsRead(item._id);
          if (item.type === 'quote') {
            if (item.providerRequestId) {
              navigation.navigate('RequestQuotationDetails', {
                requestId: item.providerRequestId,
                request: null,
                providerId: item.providerId,
              });
            } else {
              Alert.alert('Error', 'Request ID not found for this quotation.');
            }
          }
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <MaterialIcons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, !item.isRead && styles.unreadText]}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.message}>{item.message}</Text>
          <View style={styles.footerRow}>
            <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
            {item.action && <Text style={styles.actionLink}>{item.action}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ========== Loading state ==========
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Notifications</Text>
            <View style={{ width: 40 }} />
          </View>
        </LinearGradient>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      </SafeAreaView>
    );
  }

  // ========== Main UI ==========
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* ========== GRADIENT HEADER ========== */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
      </LinearGradient>

      <View style={styles.container}>
        {/* Tabs – no border */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
                All
              </Text>
              {notifications.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            {['booking', 'message', 'bid', 'high_demand_alert', 'quote'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.tab, activeTab === type && styles.activeTab]}
                onPress={() => setActiveTab(type)}
              >
                <Text style={[styles.tabText, activeTab === type && styles.activeTabText]}>
                  {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action buttons – no border */}
        <View style={styles.actionHeader}>
          <TouchableOpacity onPress={markAllAsRead} style={styles.actionBtn}>
            <MaterialIcons name="done-all" size={18} color="#007bff" />
            <Text style={styles.actionBtnText}>Mark all read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={styles.actionBtn}>
            <MaterialIcons name="delete-sweep" size={18} color="#ef4444" />
            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Clear all</Text>
          </TouchableOpacity>
        </View>

        {/* Notification list */}
        {getFilteredNotifications().length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="notifications-off" size={60} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You're all caught up!</Text>
          </View>
        ) : (
          <FlatList
            data={getFilteredNotifications()}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchAllNotifications(false);
                }}
                colors={['#007bff']}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ========== Styles ==========
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  headerGradient: {
    paddingBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    // No border
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#007bff',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 18,
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    // No border
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#007bff',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    fontSize: 12,
    color: '#9ca3af',
  },
  actionLink: {
    fontSize: 12,
    color: '#007bff',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007bff',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 5,
  },
});