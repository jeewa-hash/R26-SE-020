import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView, Platform, ScrollView } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;

// Mock data from the other file to complement real notifications
const MOCK_NOTIFICATIONS = [
  {
    _id: 'mock1',
    type: 'booking',
    title: 'Booking Confirmed',
    message: 'Your HVAC repair appointment has been confirmed with John Miller.',
    createdAt: new Date(Date.now() - 120000).toISOString(),
    isRead: false,
    icon: 'checkmark-circle',
    iconColor: '#10B981',
    action: 'View Booking',
  },
  {
    _id: 'mock2',
    type: 'message',
    title: 'New Message',
    message: 'Sarah from Apex Electrical replied to your service request.',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    isRead: false,
    icon: 'chatbubble',
    iconColor: '#667eea',
    action: 'View Message',
  },
  {
    _id: 'mock3',
    type: 'bid',
    title: 'New Bid Received',
    message: '3 providers have placed bids on your cleaning service post.',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
    isRead: true,
    icon: 'gavel',
    iconColor: '#F59E0B',
    action: 'View Bids',
  }
];

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchNotifications();
    const intervalId = setInterval(() => fetchNotifications(false), 15000);
    return () => clearInterval(intervalId);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Notifications',
      headerLeft: () => (
        <TouchableOpacity style={{ marginLeft: 15 }} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={26} color="#333" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const fetchNotifications = async (showLoading = true) => {
    if (showLoading && !refreshing) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        // Combine real data with mock data for demonstration as requested
        const combinedData = [...data, ...MOCK_NOTIFICATIONS].sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
        setNotifications(combinedData);
      }
    } catch (err) {
      console.error('Failed to fetch seeker notifications', err);
      // If API fails, at least show mock data
      setNotifications(MOCK_NOTIFICATIONS);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id) => {
    if (id.startsWith('mock')) {
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      }
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      }
    } catch (err) {
      // Still mark mock ones as read locally
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      console.error('Failed to mark all as read', err);
    }
  };

  const clearAll = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/notifications`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setNotifications([]);
      }
    } catch (err) {
      setNotifications([]);
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

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.isRead);
    return notifications.filter(n => n.type === activeTab);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => !item.isRead && markAsRead(item._id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: !item.isRead ? '#007bff15' : '#f3f4f6' }]}>
        <MaterialIcons 
          name={
            item.type === 'high_demand_alert' ? 'trending-up' : 
            item.type === 'booking' ? 'event-available' :
            item.type === 'message' ? 'chat' :
            item.type === 'bid' ? 'gavel' : 'notifications'
          } 
          size={22} 
          color={!item.isRead ? '#007bff' : '#6b7280'} 
        />
      </View>
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, !item.isRead && styles.unreadText]}>{item.title}</Text>
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Tabs from the other file */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
              {notifications.length > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{notifications.length}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'unread' && styles.activeTab]}
              onPress={() => setActiveTab('unread')}
            >
              <Text style={[styles.tabText, activeTab === 'unread' && styles.activeTabText]}>Unread</Text>
              {unreadCount > 0 && (
                <View style={[styles.tabBadge, styles.unreadBadge]}>
                  <Text style={styles.tabBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            {['booking', 'message', 'bid', 'high_demand_alert'].map(type => (
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
                onRefresh={() => { setRefreshing(true); fetchNotifications(false); }} 
                colors={['#007bff']} 
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb', paddingTop: Platform.OS === 'android' ? 50 : 0 },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
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
    borderBottomWidth: 1, 
    borderBottomColor: '#f3f4f6',
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
  actionBtnText: { fontSize: 13, fontWeight: '600', color: '#007bff' },
  listContainer: { padding: 16 },
  card: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  unreadCard: { borderLeftWidth: 4, borderLeftColor: '#007bff' },
  iconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  title: { fontSize: 15, fontWeight: '600', color: '#4b5563' },
  unreadText: { color: '#111827', fontWeight: 'bold' },
  message: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 6 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  date: { fontSize: 12, color: '#9ca3af' },
  actionLink: { fontSize: 12, color: '#007bff', fontWeight: '600' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007bff' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 5 },
});
