// screens/BookingsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';

const API_BASE_URL = CONFIG.SEEKER_SERVICE_URL;
const PROVIDER_SERVICE_URL = `${CONFIG.PROVIDER_SERVICE_URL}/portfolio/all-providers`;

// ─────────────────────────────────────────────────────────────
// Helper: group flat request array by sessionId
// ─────────────────────────────────────────────────────────────
const groupBySession = (requests) => {
  const map = new Map();
  requests.forEach((req) => {
    const key = req.sessionId || req._id;
    if (!map.has(key)) {
      map.set(key, {
        sessionId: key,
        detectedCategory: req.detectedCategory,
        detectedObject: req.detectedObject,
        briefDescription: req.briefDescription,
        urgencyLevel: req.urgencyLevel,
        serviceLocation: req.serviceLocation,
        createdAt: req.createdAt,
        requests: [],
      });
    }
    map.get(key).requests.push(req);
  });
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );
};

export default function BookingsScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const { createOrGetChat } = useChat();

  const [groupedBookings, setGroupedBookings] = useState([]);
  const [providersMap, setProvidersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});

  const [totalSessions, setTotalSessions] = useState(0);
  const [confirmedSessions, setConfirmedSessions] = useState(0);
  const [pendingSessions, setPendingSessions] = useState(0);

  // ─────────────────────────────────────────────────────────────
  // Fetch all providers into a map keyed by provider id
  // ─────────────────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(PROVIDER_SERVICE_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) return {};
      const data = await response.json();
      if (data.success && data.providers) {
        const map = {};
        data.providers.forEach((item) => {
          const provider = item.provider || {};
          if (provider.id) {
            map[provider.id] = { ...provider, portfolio: item.portfolio || {} };
          }
        });
        return map;
      }
      return {};
    } catch {
      return {};
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Fetch bookings and group by session
  // ─────────────────────────────────────────────────────────────
  const fetchBookings = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        setError('Please log in to view your bookings.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/request-quotations/seeker/${userId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.requests) {
        const sorted = data.requests.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        const groups = groupBySession(sorted);
        setGroupedBookings(groups);

        const total = groups.length;
        const confirmed = groups.filter((g) =>
          g.requests.some((r) => r.status === 'confirmed')
        ).length;
        const pending = groups.filter((g) =>
          g.requests.every((r) => r.status === 'pending')
        ).length;

        setTotalSessions(total);
        setConfirmedSessions(confirmed);
        setPendingSessions(pending);

        const providerMap = await fetchProviders();
        setProvidersMap(providerMap);
      } else {
        setError(data.message || 'Failed to load bookings.');
      }
    } catch (err) {
      console.error('BOOKINGS FETCH ERROR:', err);
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchProviders]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString) =>
    new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return {
          bg: isDarkMode ? 'rgba(16, 185, 129, 0.2)' : '#D1FAE5',
          color: '#10B981',
          icon: 'checkmark-circle',
          text: 'Confirmed',
        };
      case 'pending':
        return {
          bg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FEF3C7',
          color: '#F59E0B',
          icon: 'time-outline',
          text: 'Pending',
        };
      case 'cancelled':
        return {
          bg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
          color: '#EF4444',
          icon: 'close-circle',
          text: 'Cancelled',
        };
      default:
        return {
          bg: isDarkMode ? '#242f4d' : '#F3F4F6',
          color: isDarkMode ? '#94A3B8' : '#6B7280',
          icon: 'help-circle-outline',
          text: status,
        };
    }
  };

  const getServiceTitle = (group) => {
    const cat = group.detectedCategory || 'Service';
    const obj = group.detectedObject || '';
    return obj ? `${cat} – ${obj}` : cat;
  };

  const getProvider = (providerId) => providersMap[providerId] || null;

  const getProviderName = (providerId) => {
    const p = getProvider(providerId);
    return p?.name || `Provider #${String(providerId).slice(-4)}`;
  };

  const getProviderImage = (providerId) => {
    const p = getProvider(providerId);
    if (p?.profileImage) {
      const norm = p.profileImage.replace(/\\/g, '/');
      if (norm.startsWith('http')) return norm;
      return `${CONFIG.PROVIDER_SERVICE_URL}/${norm}`;
    }
    const hash = providerId ? parseInt(String(providerId).slice(-2), 16) || 1 : 1;
    return `https://i.pravatar.cc/150?img=${(hash % 70) + 1}`;
  };

  const getSessionOverallStatus = (group) => {
    const statuses = group.requests.map((r) => r.status);
    if (statuses.some((s) => s === 'confirmed')) return 'confirmed';
    if (statuses.some((s) => s === 'cancelled') && statuses.every((s) => s === 'cancelled'))
      return 'cancelled';
    return 'pending';
  };

  const toggleExpand = (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  };

  // ─────────────────────────────────────────────────────────────
  //  UPDATED: handleMessage – now passes booking details to ChatScreen
  // ─────────────────────────────────────────────────────────────
  const handleMessage = async (request, group = {}) => {
    try {
      const currentUserId = await AsyncStorage.getItem('userId');
      if (!currentUserId) {
        Alert.alert('Error', 'Please log in to send a message.');
        return;
      }

      const receiverId = request.providerId;
      const chatId = await createOrGetChat(currentUserId, receiverId);

      if (!chatId) {
        Alert.alert('Error', 'Could not start chat. Please try again.');
        return;
      }

      const provider = getProvider(receiverId);
      const name = provider?.name || `Provider ${String(receiverId).slice(-4)}`;
      const avatar = getProviderImage(receiverId);

      // ─── Extract booking request details ──────────────────
      const postTitle = request.detectedObject || request.detectedCategory || group?.detectedObject || group?.detectedCategory || 'Service Request';
      const postDescription = request.briefDescription || group?.briefDescription || '';
      const postCategory = 'Service Request';
      const postUrgency = request.urgencyLevel || group?.urgencyLevel || 'Normal';
      const postImage = request.images?.[0] || request.photos?.[0] || request.image || group?.images?.[0] || null;

      // ─── Clean initial prompt for FB/Insta post inquiry ───
      const initialMessage = `Hi! I would like to discuss this service request with you.`;

      navigation.navigate('ChatScreen', {
        chatId,
        userId: receiverId,
        userName: name,
        userAvatar: avatar,
        userRole: 'Provider',
        // ─── Pass booking details as post context ──────────
        source: 'booking',
        isBooking: true,
        postId: request._id || request.sessionId || group?.sessionId,
        requestId: request._id || request.sessionId || group?.sessionId,
        postTitle: postTitle,
        postDescription: postDescription,
        postImage: postImage,
        postCategory: postCategory,
        postUrgency: postUrgency,
        initialMessage: initialMessage,
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  const handleViewQuote = (request) => {
    navigation.navigate('RequestQuotationDetails', {
      requestId: request._id,
      request,
      providerId: request.providerId,
    });
  };

  const handleViewProviderProfile = (providerId) => {
    const provider = getProvider(providerId);
    if (!provider) {
      Alert.alert('Error', 'Provider information not found.');
      return;
    }
    navigation.navigate('ProviderProfile', {
      providerItem: {
        provider,
        portfolio: provider.portfolio || {},
        match: { category_match: true, district_match: true, priority: 'HIGH' },
      },
      finalDecision: null,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.headerBtn, isDarkMode && styles.headerBtnDark]}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <View style={styles.headerBtn} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#667eea'} />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading your bookings…
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.headerBtn, isDarkMode && styles.headerBtnDark]}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity
          style={[styles.headerBtn, isDarkMode && styles.headerBtnDark]}
          onPress={onRefresh}
        >
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, isDarkMode && styles.statNumberDark]}>
            {totalSessions}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
            Total
          </Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>
            {confirmedSessions}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
            Confirmed
          </Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>
            {pendingSessions}
          </Text>
          <Text style={[styles.statLabel, isDarkMode && styles.statLabelDark]}>
            Pending
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
          Service Requests
        </Text>
        <Text style={[styles.sectionCount, isDarkMode && styles.textMutedDark]}>
          {totalSessions} {totalSessions === 1 ? 'request' : 'requests'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? '#818cf8' : '#667eea']}
          />
        }
      >
        {error ? (
          <View style={styles.centerBox}>
            <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
            <Text style={[styles.errorText, isDarkMode && styles.textMutedDark]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : groupedBookings.length === 0 ? (
          <View style={styles.centerBox}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={isDarkMode ? '#334155' : '#D1D5DB'}
            />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              No bookings yet
            </Text>
            <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
              Your service requests will appear here once you request a quote from a provider.
            </Text>
          </View>
        ) : (
          groupedBookings.map((group) => {
            const overallStatus = getSessionOverallStatus(group);
            const overallStyle = getStatusStyle(overallStatus);
            const title = getServiceTitle(group);
            const date = formatDate(group.createdAt);
            const time = formatTime(group.createdAt);
            const providerCount = group.requests.length;
            const isExpanded = expandedSessions[group.sessionId] ?? true;

            return (
              <View
                key={group.sessionId}
                style={[styles.sessionCard, isDarkMode && styles.sessionCardDark]}
              >
                <LinearGradient
                  colors={isDarkMode ? ['#16213e', '#1a2238'] : ['#ffffff', '#f8f9ff']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardTop}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      style={styles.serviceIconBubble}
                    >
                      <Ionicons name="construct-outline" size={20} color="#fff" />
                    </LinearGradient>

                    <View style={styles.cardTopInfo}>
                      <Text
                        style={[styles.serviceTitle, isDarkMode && styles.textDark]}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>
                      <View style={styles.metaRow}>
                        <Ionicons
                          name="calendar-outline"
                          size={12}
                          color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
                        />
                        <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                          {date} at {time}
                        </Text>
                      </View>
                      {group.urgencyLevel ? (
                        <View style={styles.metaRow}>
                          <Ionicons
                            name="flash-outline"
                            size={12}
                            color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
                          />
                          <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                            {group.urgencyLevel} urgency
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {overallStatus !== 'pending' && (
                      <View style={[styles.statusBadge, { backgroundColor: overallStyle.bg }]}>
                        <Ionicons name={overallStyle.icon} size={13} color={overallStyle.color} />
                        <Text style={[styles.statusText, { color: overallStyle.color }]}>
                          {overallStyle.text}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.divider, isDarkMode && styles.dividerDark]} />

                  <TouchableOpacity
                    style={styles.providersHeader}
                    onPress={() => toggleExpand(group.sessionId)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.providersHeaderLeft}>
                      <Ionicons
                        name="people-outline"
                        size={15}
                        color={isDarkMode ? '#818cf8' : '#667eea'}
                      />
                      <Text style={[styles.providersLabel, isDarkMode && styles.providersLabelDark]}>
                        {providerCount} Provider{providerCount !== 1 ? 's' : ''} Contacted
                      </Text>
                    </View>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
                    />
                  </TouchableOpacity>

                  {isExpanded &&
                    group.requests.map((req, idx) => {
                      const pId = String(req.providerId);
                      const pName = getProviderName(pId);
                      const pImage = getProviderImage(pId);
                      const pStatus = getStatusStyle(req.status);
                      const isLast = idx === group.requests.length - 1;

                      return (
                        <View key={req._id}>
                          <View style={styles.providerRow}>
                            <TouchableOpacity
                              onPress={() => handleViewProviderProfile(pId)}
                              activeOpacity={0.8}
                            >
                              <Image source={{ uri: pImage }} style={styles.providerAvatar} />
                            </TouchableOpacity>

                            <View style={styles.providerInfo}>
                              <TouchableOpacity onPress={() => handleViewProviderProfile(pId)}>
                                <Text
                                  style={[styles.providerName, isDarkMode && styles.textDark]}
                                  numberOfLines={1}
                                >
                                  {pName}
                                </Text>
                              </TouchableOpacity>
                              <View style={[styles.providerStatusChip, { backgroundColor: pStatus.bg }]}>
                                <Ionicons name={pStatus.icon} size={11} color={pStatus.color} />
                                <Text style={[styles.providerStatusText, { color: pStatus.color }]}>
                                  {pStatus.text}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.providerActions}>
                              <TouchableOpacity
                                style={[styles.iconBtn, isDarkMode && styles.iconBtnDark]}
                                onPress={() => handleMessage(req, group)}
                              >
                                <Ionicons
                                  name="chatbubble-outline"
                                  size={16}
                                  color={isDarkMode ? '#818cf8' : '#667eea'}
                                />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.viewQuoteBtn, isDarkMode && styles.viewQuoteBtnDark]}
                                onPress={() => handleViewQuote(req)}
                              >
                                <Ionicons
                                  name="document-text-outline"
                                  size={14}
                                  color={isDarkMode ? '#a78bfa' : '#8B5CF6'}
                                />
                                <Text
                                  style={[
                                    styles.viewQuoteBtnText,
                                    isDarkMode && styles.viewQuoteBtnTextDark,
                                  ]}
                                >
                                  Quote
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {!isLast && (
                            <View style={[styles.rowSeparator, isDarkMode && styles.rowSeparatorDark]} />
                          )}
                        </View>
                      );
                    })}
                </LinearGradient>
              </View>
            );
          })
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles (unchanged – keep your existing styles)
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  containerDark: {
    backgroundColor: '#0f1121',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 18,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  statsContainerDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '800',
    color: '#667eea',
    marginBottom: 2,
  },
  statNumberDark: {
    color: '#818cf8',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  statLabelDark: {
    color: '#94A3B8',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  statDividerDark: {
    backgroundColor: '#2d3561',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCount: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sessionCard: {
    marginBottom: 16,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 5,
  },
  sessionCardDark: {
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 22,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  serviceIconBubble: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  cardTopInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    alignSelf: 'flex-start',
    flexShrink: 0,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 12,
  },
  dividerDark: {
    backgroundColor: '#2d3561',
  },
  providersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  providersHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  providersLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667eea',
  },
  providersLabelDark: {
    color: '#818cf8',
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  providerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: '#667eea',
    marginRight: 10,
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerStatusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  providerStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconBtnDark: {
    backgroundColor: '#242f4d',
  },
  viewQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#F5F3FF',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  viewQuoteBtnDark: {
    backgroundColor: '#1e1b4b',
    borderColor: '#7c3aed',
  },
  viewQuoteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  viewQuoteBtnTextDark: {
    color: '#a78bfa',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 52,
  },
  rowSeparatorDark: {
    backgroundColor: '#1e2a45',
  },
  descriptionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 12,
    backgroundColor: '#F8F9FF',
    borderRadius: 10,
    padding: 10,
  },
  descriptionBoxDark: {
    backgroundColor: '#0f172a',
  },
  descriptionText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
  centerBox: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 14,
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
    lineHeight: 20,
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});