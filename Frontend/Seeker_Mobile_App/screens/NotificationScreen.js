import { seekerNotificationDestination } from '../utils/seekerNotifications';
import PageHeader from '../components/PageHeader';
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
import { useTheme } from '../hooks/useTheme';
import { useNotification } from '../context/NotificationContext';

export default function NotificationScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const {
    notifications: liveNotifications,
    loading: inboxLoading,
    markAsRead: markHomeNotificationAsRead,
    markAllAsRead: markAllHomeNotificationsAsRead,
    clearNotifications,
    syncNotifications,
    syncError,
  } = useNotification();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    fetchAllNotifications();
    return navigation.addListener('focus', () => fetchAllNotifications(false));
  }, [navigation, syncNotifications]);
  useEffect(() => { setNotifications(liveNotifications); }, [liveNotifications]);

  const showUpdateError = () => {
    if (Platform.OS === 'web') window.alert('Unable to update notifications. Please retry.');
    else Alert.alert('Update failed', 'Unable to update notifications. Please retry.');
  };
  const fetchAllNotifications = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try { await syncNotifications(false); }
    finally { setLoading(false); setRefreshing(false); }
  };
  const markAsRead = async id => {
    if (!await markHomeNotificationAsRead(id)) showUpdateError();
  };
  const markAllAsRead = async () => {
    if (!await markAllHomeNotificationsAsRead()) showUpdateError();
  };
  const clearAll = async () => {
    if (!await clearNotifications()) showUpdateError();
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
        iconName = 'description';
        iconColor = '#8B5CF6';
        bgColor = '#8B5CF615';
        break;
      default:
        break;
    }

    return (
      <TouchableOpacity
        style={[
          styles.card,
          isDarkMode && styles.cardDark,
          !item.isRead && (isDarkMode ? styles.unreadCardDark : styles.unreadCard),
        ]}
        onPress={() => {
          if (!item.isRead) markAsRead(item._id);
          const target = seekerNotificationDestination(item);
          navigation.navigate(target.name, target.params);
        }}
      >
        <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
          <MaterialIcons name={iconName} size={22} color={iconColor} />
        </View>
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.title,
                isDarkMode && styles.titleDark,
                !item.isRead && (isDarkMode ? styles.unreadTextDark : styles.unreadText),
              ]}
            >
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          <Text style={[styles.message, isDarkMode && styles.messageDark]}>{item.message}</Text>
          <View style={styles.footerRow}>
            <Text style={[styles.date, isDarkMode && styles.dateDark]}>{formatDate(item.createdAt)}</Text>
            {item.action && <Text style={styles.actionLink}>{item.action}</Text>}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ========== Loading state ==========
  if (loading || inboxLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkMode ? '#1a1a2e' : '#4F46E5'}
        />
        <PageHeader title={<>Notifications</>} onBack={() => navigation.goBack()} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#007bff'} />
        </View>
      </SafeAreaView>
    );
  }

  // ========== Main UI ==========
  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#1a1a2e' : '#4F46E5'}
      />

      {/* ========== GRADIENT HEADER ========== */}
      <PageHeader title={<>Notifications</>} onBack={() => navigation.goBack()} />

      <View style={styles.container}>
        {/* Tabs – no border */}
        <View style={[styles.tabsContainer, isDarkMode && styles.tabsContainerDark]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.tab,
                isDarkMode && styles.tabDark,
                activeTab === 'all' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('all')}
            >
              <Text
                style={[
                  styles.tabText,
                  isDarkMode && styles.tabTextDark,
                  activeTab === 'all' && styles.activeTabText,
                ]}
              >
                All
              </Text>
              {notifications.length > 0 && (
                <View style={[styles.tabBadge, isDarkMode && styles.tabBadgeDark]}>
                  <Text style={[styles.tabBadgeText, isDarkMode && styles.tabBadgeTextDark]}>
                    {notifications.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {['booking', 'message', 'bid', 'high_demand_alert', 'quote'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.tab,
                  isDarkMode && styles.tabDark,
                  activeTab === type && styles.activeTab,
                ]}
                onPress={() => setActiveTab(type)}
              >
                <Text
                  style={[
                    styles.tabText,
                    isDarkMode && styles.tabTextDark,
                    activeTab === type && styles.activeTabText,
                  ]}
                >
                  {type.replace('_', ' ').charAt(0).toUpperCase() + type.replace('_', ' ').slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Action buttons – no border */}
        <View style={[styles.actionHeader, isDarkMode && styles.actionHeaderDark]}>
          <TouchableOpacity onPress={markAllAsRead} style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]}>
            <MaterialIcons name="done-all" size={18} color={isDarkMode ? '#818cf8' : '#007bff'} />
            <Text style={[styles.actionBtnText, isDarkMode && { color: '#818cf8' }]}>Mark all read</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={clearAll} style={[styles.actionBtn, isDarkMode && styles.actionBtnDark]}>
            <MaterialIcons name="delete-sweep" size={18} color="#ef4444" />
            <Text style={[styles.actionBtnText, { color: '#ef4444' }]}>Clear all</Text>
          </TouchableOpacity>
        </View>

        {syncError ? <TouchableOpacity accessibilityRole="button" onPress={() => fetchAllNotifications()}><Text accessibilityRole="alert" style={{ padding: 16, color: isDarkMode ? '#FCD34D' : '#92400E' }}>{syncError} Tap to retry.</Text></TouchableOpacity> : null}
        {/* Notification list */}
        {getFilteredNotifications().length === 0 ? (
          <View style={styles.center}>
            <MaterialIcons
              name="notifications-off"
              size={60}
              color={isDarkMode ? '#334155' : '#d1d5db'}
            />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>{syncError ? 'Notifications unavailable' : 'No notifications'}</Text>
            <Text style={[styles.emptySubtitle, isDarkMode && styles.textMutedDark]}>{syncError ? 'Refresh to check your latest updates.' : "You're all caught up!"}</Text>
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
                colors={[isDarkMode ? '#818cf8' : '#007bff']}
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

  // ── Dark Theme Overrides ──
  safeAreaDark: {
    backgroundColor: '#0f1121',
  },
  tabsContainerDark: {
    backgroundColor: '#16213e',
  },
  tabDark: {
    backgroundColor: '#1f2b48',
  },
  tabTextDark: {
    color: '#94A3B8',
  },
  tabBadgeDark: {
    backgroundColor: '#2d3b5e',
  },
  tabBadgeTextDark: {
    color: '#E2E8F0',
  },
  actionHeaderDark: {
    backgroundColor: '#16213e',
  },
  actionBtnDark: {
    backgroundColor: '#1f2b48',
  },
  cardDark: {
    backgroundColor: '#16213e',
    shadowColor: '#000',
    shadowOpacity: 0.2,
  },
  unreadCardDark: {
    borderLeftWidth: 4,
    borderLeftColor: '#818cf8',
    backgroundColor: '#1a2444',
  },
  titleDark: {
    color: '#CBD5E1',
  },
  unreadTextDark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  messageDark: {
    color: '#94A3B8',
  },
  dateDark: {
    color: '#64748B',
  },
  textDark: {
    color: '#FFFFFF',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
