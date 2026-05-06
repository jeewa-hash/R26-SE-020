import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('all');
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'booking',
      title: 'Booking Confirmed',
      message: 'Your HVAC repair appointment has been confirmed with John Miller.',
      time: '2 minutes ago',
      read: false,
      icon: 'checkmark-circle',
      iconColor: '#10B981',
      action: 'View Booking',
    },
    {
      id: 2,
      type: 'message',
      title: 'New Message',
      message: 'Sarah from Apex Electrical replied to your service request.',
      time: '1 hour ago',
      read: false,
      icon: 'chatbubble',
      iconColor: '#667eea',
      action: 'View Message',
    },
    {
      id: 3,
      type: 'bid',
      title: 'New Bid Received',
      message: '3 providers have placed bids on your cleaning service post.',
      time: '3 hours ago',
      read: true,
      icon: 'gavel',
      iconColor: '#F59E0B',
      action: 'View Bids',
    },
    {
      id: 4,
      type: 'review',
      title: 'New Review',
      message: 'John Miller left a 5-star review for your recent service.',
      time: 'Yesterday',
      read: true,
      icon: 'star',
      iconColor: '#FBBF24',
      action: 'Read Review',
    },
    {
      id: 5,
      type: 'payment',
      title: 'Payment Received',
      message: 'Your payment of $180 has been processed successfully.',
      time: 'Yesterday',
      read: true,
      icon: 'card',
      iconColor: '#10B981',
      action: 'View Receipt',
    },
    {
      id: 6,
      type: 'reminder',
      title: 'Upcoming Appointment',
      message: 'Reminder: Kitchen plumbing service tomorrow at 10:00 AM.',
      time: '2 days ago',
      read: true,
      icon: 'time',
      iconColor: '#6366F1',
      action: 'View Details',
    },
    {
      id: 7,
      type: 'promotion',
      title: 'Special Offer',
      message: 'Get 20% off on your next cleaning service. Limited time offer!',
      time: '3 days ago',
      read: true,
      icon: 'pricetag',
      iconColor: '#FF6B6B',
      action: 'Claim Offer',
    },
  ]);

  const handleMarkAsRead = (id) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const handleMarkAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: () => {
            setNotifications(prev =>
              prev.map(notif => ({ ...notif, read: true }))
            );
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete All',
      'Are you sure you want to delete all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: () => {
            setNotifications([]);
          },
        },
      ]
    );
  };

  const handleNotificationPress = (notification) => {
    handleMarkAsRead(notification.id);
    
    // Navigate based on notification type
    switch (notification.type) {
      case 'booking':
        navigation.navigate('ProfileScreen', { tab: 'bookings' });
        break;
      case 'message':
        navigation.navigate('ChatScreen');
        break;
      case 'bid':
        navigation.navigate('BiddingScreen');
        break;
      case 'review':
        navigation.navigate('ProfileScreen', { tab: 'history' });
        break;
      default:
        Alert.alert(notification.title, notification.message);
    }
  };

  const getFilteredNotifications = () => {
    if (activeTab === 'all') return notifications;
    if (activeTab === 'unread') return notifications.filter(n => !n.read);
    return notifications.filter(n => n.type === activeTab);
  };

  const getIconName = (iconName) => {
    if (iconName === 'checkmark-circle') return 'checkmark-circle';
    if (iconName === 'chatbubble') return 'chatbubble-outline';
    if (iconName === 'gavel') return 'gavel';
    if (iconName === 'star') return 'star-outline';
    if (iconName === 'card') return 'card-outline';
    if (iconName === 'time') return 'time-outline';
    if (iconName === 'pricetag') return 'pricetag-outline';
    return 'notifications-outline';
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {notifications.length > 0 && (
            <>
              <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.headerAction}>
                <Ionicons name="mail-open-outline" size={22} color="#667eea" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteAll} style={styles.headerAction}>
                <Ionicons name="trash-outline" size={22} color="#EF4444" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      {/* Tabs */}
      {notifications.length > 0 && (
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

            <TouchableOpacity
              style={[styles.tab, activeTab === 'unread' && styles.activeTab]}
              onPress={() => setActiveTab('unread')}
            >
              <Text style={[styles.tabText, activeTab === 'unread' && styles.activeTabText]}>
                Unread
              </Text>
              {unreadCount > 0 && (
                <View style={[styles.tabBadge, styles.unreadBadge]}>
                  <Text style={styles.tabBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'booking' && styles.activeTab]}
              onPress={() => setActiveTab('booking')}
            >
              <Ionicons name="calendar-outline" size={16} color={activeTab === 'booking' ? '#fff' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'booking' && styles.activeTabText]}>
                Bookings
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'message' && styles.activeTab]}
              onPress={() => setActiveTab('message')}
            >
              <Ionicons name="chatbubble-outline" size={16} color={activeTab === 'message' ? '#fff' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'message' && styles.activeTabText]}>
                Messages
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'bid' && styles.activeTab]}
              onPress={() => setActiveTab('bid')}
            >
              <Ionicons name="gavel" size={16} color={activeTab === 'bid' ? '#fff' : '#6B7280'} />
              <Text style={[styles.tabText, activeTab === 'bid' && styles.activeTabText]}>
                Bids
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      )}

      {/* Notifications List */}
      {getFilteredNotifications().length > 0 ? (
        <ScrollView style={styles.notificationsList} showsVerticalScrollIndicator={false}>
          {getFilteredNotifications().map((notification) => (
            <TouchableOpacity
              key={notification.id}
              style={[styles.notificationCard, !notification.read && styles.unreadCard]}
              onPress={() => handleNotificationPress(notification)}
              activeOpacity={0.7}
            >
              <View style={[styles.notificationIcon, { backgroundColor: `${notification.iconColor}15` }]}>
                <Ionicons name={getIconName(notification.icon)} size={24} color={notification.iconColor} />
              </View>
              
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, !notification.read && styles.unreadTitle]}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationTime}>{notification.time}</Text>
                </View>
                <Text style={styles.notificationMessage} numberOfLines={2}>
                  {notification.message}
                </Text>
                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationAction}>{notification.action}</Text>
                  {!notification.read && <View style={styles.unreadDot} />}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-off-outline" size={80} color="#D1D5DB" />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! When you receive notifications, they'll appear here.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerAction: {
    padding: 4,
  },
  tabsContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
    gap: 6,
  },
  activeTab: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#fff',
  },
  tabBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadBadge: {
    backgroundColor: '#FF6B6B',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1F2937',
  },
  notificationsList: {
    flex: 1,
    padding: 16,
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#F9F5FF',
    borderLeftWidth: 3,
    borderLeftColor: '#667eea',
  },
  notificationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  unreadTitle: {
    color: '#667eea',
  },
  notificationTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationAction: {
    fontSize: 12,
    fontWeight: '500',
    color: '#667eea',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B6B',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    marginTop: 100,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});