import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;

export default function NotificationScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch seeker notifications', err);
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (id) => {
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

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, !item.isRead && styles.unreadCard]}
      onPress={() => !item.isRead && markAsRead(item._id)}
    >
      <View style={[styles.iconContainer, { backgroundColor: !item.isRead ? '#007bff15' : '#f3f4f6' }]}>
        <MaterialIcons 
          name={item.type === 'high_demand_alert' ? 'trending-up' : 'notifications'} 
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
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#007bff" /></View>;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {notifications.length > 0 && (
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
        )}

        {notifications.length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons name="notifications-none" size={60} color="#d1d5db" />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubtitle}>You'll see your alerts here.</Text>
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={(item) => item._id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(false); }} colors={['#007bff']} />}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
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
  date: { fontSize: 12, color: '#9ca3af' },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#007bff' },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginTop: 15 },
  emptySubtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 5 },
});
