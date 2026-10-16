import PageHeader from '../components/PageHeader';
// screens/BookingsScreen.js

import React, { useState, useEffect, useCallback, useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
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
import { IP_ADDRESS } from '../config';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import { LanguageContext } from '../context/LanguageContext';

const API_BASE_URL = `http://${IP_ADDRESS}:6000`;
const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:5000/portfolio/all-providers`;

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
  const { language } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';

  const [groupedBookings, setGroupedBookings] = useState([]);
  const [providersMap, setProvidersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedSessions, setExpandedSessions] = useState({});

  // Filter & Search states
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'pending' | 'confirmed' | 'cancelled'
  const [searchQuery, setSearchQuery] = useState('');

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
        setError(isSi ? 'ඔබගේ ඇණවුම් බැලීමට කරුණාකර ලොග් වන්න.' : 'Please log in to view your bookings.');
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

        const providerMap = await fetchProviders();
        setProvidersMap(providerMap);
      } else {
        setError(data.message || (isSi ? 'ඇණවුම් ලබා ගැනීම අසාර්ථක විය.' : 'Failed to load bookings.'));
      }
    } catch (err) {
      console.error('BOOKINGS FETCH ERROR:', err);
      setError(isSi ? 'සම්බන්ධ වීමට නොහැකි විය. කරුණාකර නැවත උත්සාහ කරන්න.' : 'Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchProviders, isSi]);

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
    if (!dateString) return '';
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return isSi ? 'අද' : 'Today';
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return isSi ? 'ඊයේ' : 'Yesterday';
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'confirmed':
      case 'accepted':
        return {
          bg: isDarkMode ? 'rgba(16, 185, 129, 0.15)' : '#ECFDF5',
          border: isDarkMode ? '#065F46' : '#A7F3D0',
          color: '#10B981',
          text: isSi ? 'තහවුරුයි' : 'Confirmed',
        };
      case 'pending':
        return {
          bg: isDarkMode ? 'rgba(245, 158, 11, 0.15)' : '#FFFBEB',
          border: isDarkMode ? '#92400E' : '#FDE68A',
          color: '#D97706',
          text: isSi ? 'පොරොත්තුවේ' : 'Pending',
        };
      case 'cancelled':
      case 'canceled':
        return {
          bg: isDarkMode ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
          border: isDarkMode ? '#991B1B' : '#FECACA',
          color: '#EF4444',
          text: isSi ? 'අවලංගුයි' : 'Cancelled',
        };
      case 'rejected':
        return {
          bg: isDarkMode ? 'rgba(107, 114, 128, 0.15)' : '#F3F4F6',
          border: isDarkMode ? '#374151' : '#E5E7EB',
          color: '#6B7280',
          text: isSi ? 'ප්‍රතික්ෂේපිත' : 'Declined',
        };
      default:
        return {
          bg: isDarkMode ? '#1E293B' : '#F8FAFC',
          border: isDarkMode ? '#334155' : '#E2E8F0',
          color: isDarkMode ? '#94A3B8' : '#64748B',
          text: status
            ? String(status).replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase())
            : (isSi ? 'සාමාන්‍ය' : 'Normal'),
        };
    }
  };

  const getServiceTitle = (group) => {
    const cat = group.detectedCategory || (isSi ? 'සේවාව' : 'Service');
    const obj = group.detectedObject || '';
    return obj ? `${cat} – ${obj}` : cat;
  };

  const getCategoryIcon = (category = '') => {
    const cat = category.toLowerCase();
    if (cat.includes('plumb') || cat.includes('water') || cat.includes('pipe')) return 'water-outline';
    if (cat.includes('clean')) return 'sparkles-outline';
    if (cat.includes('electric') || cat.includes('wire') || cat.includes('ac')) return 'flash-outline';
    if (cat.includes('garden') || cat.includes('grass')) return 'leaf-outline';
    if (cat.includes('paint')) return 'color-palette-outline';
    if (cat.includes('car') || cat.includes('vehicle')) return 'car-outline';
    if (cat.includes('wood') || cat.includes('furniture')) return 'hammer-outline';
    return 'construct-outline';
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
      return `http://${IP_ADDRESS}:5000/${norm}`;
    }
    const hash = providerId ? parseInt(String(providerId).slice(-2), 16) || 1 : 1;
    return `https://i.pravatar.cc/150?img=${(hash % 70) + 1}`;
  };

  const getSessionOverallStatus = (group) => {
    const statuses = group.requests.map((r) => String(r.status || '').toLowerCase());
    if (statuses.some((s) => s === 'confirmed' || s === 'accepted')) return 'confirmed';
    if (statuses.length > 0 && statuses.every((s) => s === 'cancelled' || s === 'canceled')) return 'cancelled';
    return 'pending';
  };

  const toggleExpand = (sessionId) => {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !(prev[sessionId] ?? false),
    }));
  };

  // ─────────────────────────────────────────────────────────────
  // Counts calculation
  // ─────────────────────────────────────────────────────────────
  const counts = useMemo(() => {
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;

    groupedBookings.forEach((group) => {
      const st = getSessionOverallStatus(group);
      if (st === 'confirmed') confirmed++;
      else if (st === 'cancelled') cancelled++;
      else pending++;
    });

    return {
      all: groupedBookings.length,
      pending,
      confirmed,
      cancelled,
    };
  }, [groupedBookings]);

  // ─────────────────────────────────────────────────────────────
  // Filtered & Searched bookings
  // ─────────────────────────────────────────────────────────────
  const filteredBookings = useMemo(() => {
    return groupedBookings.filter((group) => {
      const overallStatus = getSessionOverallStatus(group);

      if (activeFilter !== 'all' && overallStatus !== activeFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const cat = (group.detectedCategory || '').toLowerCase();
        const obj = (group.detectedObject || '').toLowerCase();
        const desc = (group.briefDescription || '').toLowerCase();
        const loc = typeof group.serviceLocation === 'string' ? group.serviceLocation.toLowerCase() : '';

        const matchesProvider = group.requests.some((r) =>
          getProviderName(r.providerId).toLowerCase().includes(query)
        );

        if (
          !cat.includes(query) &&
          !obj.includes(query) &&
          !desc.includes(query) &&
          !loc.includes(query) &&
          !matchesProvider
        ) {
          return false;
        }
      }

      return true;
    });
  }, [groupedBookings, activeFilter, searchQuery, providersMap]);

  // ─────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────
  const handleMessage = async (request, group = {}) => {
    try {
      const currentUserId = await AsyncStorage.getItem('userId');
      if (!currentUserId) {
        Alert.alert(isSi ? 'දැනුම්දීම' : 'Notice', isSi ? 'කරුණාකර පළමුව ලොග් වන්න.' : 'Please log in to send a message.');
        return;
      }

      const receiverId = request.providerId;
      const chatId = await createOrGetChat(currentUserId, receiverId);

      if (!chatId) {
        Alert.alert(isSi ? 'දෝෂයකි' : 'Error', isSi ? 'චැට් එක ආරම්භ කළ නොහැකි විය.' : 'Could not start chat. Please try again.');
        return;
      }

      const provider = getProvider(receiverId);
      const name = provider?.name || `Provider ${String(receiverId).slice(-4)}`;
      const avatar = getProviderImage(receiverId);

      const postTitle = request.detectedObject || request.detectedCategory || group?.detectedObject || group?.detectedCategory || 'Service Request';
      const postDescription = request.briefDescription || group?.briefDescription || '';
      const postCategory = 'Service Request';
      const postUrgency = request.urgencyLevel || group?.urgencyLevel || 'Normal';
      const postImage = request.images?.[0] || request.photos?.[0] || request.image || group?.images?.[0] || null;

      const initialMessage = isSi
        ? `ආයුබෝවන්! මට මෙම සේවා ඉල්ලීම පිළිබඳව ඔබ සමඟ කතා කිරීමට අවශ්‍යයි.`
        : `Hi! I would like to discuss this service request with you.`;

      navigation.navigate('ChatScreen', {
        chatId,
        userId: receiverId,
        userName: name,
        userAvatar: avatar,
        userRole: 'Provider',
        source: 'booking',
        isBooking: true,
        postId: request._id || request.sessionId || group?.sessionId,
        requestId: request._id || request.sessionId || group?.sessionId,
        postTitle,
        postDescription,
        postImage,
        postCategory,
        postUrgency,
        initialMessage,
      });
    } catch (error) {
      console.error('Error starting chat:', error);
      Alert.alert(isSi ? 'දෝෂයකි' : 'Error', isSi ? 'චැට් එක විවෘත කළ නොහැකි විය.' : 'Could not open chat.');
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
      Alert.alert(isSi ? 'දෝෂයකි' : 'Error', isSi ? 'සපයන්නාගේ තොරතුරු සොයාගත නොහැකි විය.' : 'Provider information not found.');
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
          backgroundColor={isDarkMode ? '#0F172A' : '#4338CA'}
        />
        <PageHeader title={<>{isSi ? 'මගේ ඇණවුම්' : 'My Bookings'}</>} onBack={() => navigation.goBack()} />
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            {isSi ? 'ඇණවුම් ලබා ගනිමින් පවතී…' : 'Loading your bookings…'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#0F172A' : '#4338CA'}
      />

      {/* Top Header - Compact & Clean */}
      <PageHeader title={<>{isSi ? 'මගේ ඇණවුම්' : 'My Bookings'}</>} onBack={() => navigation.goBack()} renderActions={({ textColor }) => <><TouchableOpacity
          style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          onPress={onRefresh}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-outline" size={20} color={textColor} />
        </TouchableOpacity></>} />

      {/* Clean Top Controls: Filter Pills + Compact Search */}
      <View style={[styles.topControls, isDarkMode && styles.topControlsDark]}>
        {/* Horizontal Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'all', label: isSi ? 'සියල්ල' : 'All', count: counts.all },
            { key: 'pending', label: isSi ? 'පොරොත්තුවේ' : 'Pending', count: counts.pending },
            { key: 'confirmed', label: isSi ? 'තහවුරු වූ' : 'Confirmed', count: counts.confirmed },
            { key: 'cancelled', label: isSi ? 'අවලංගු' : 'Cancelled', count: counts.cancelled },
          ].map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[
                  styles.tabPill,
                  isSelected && styles.tabPillActive,
                  isDarkMode && styles.tabPillDark,
                  isSelected && isDarkMode && styles.tabPillActiveDark,
                ]}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tabPillText,
                    isSelected && styles.tabPillTextActive,
                    isDarkMode && !isSelected && styles.textMutedDark,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.tabCountBadge,
                    isSelected && styles.tabCountBadgeActive,
                    isDarkMode && !isSelected && styles.tabCountBadgeDark,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountText,
                      isSelected && styles.tabCountTextActive,
                      isDarkMode && !isSelected && styles.textMutedDark,
                    ]}
                  >
                    {tab.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Compact Search Bar */}
        <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
          <Ionicons
            name="search-outline"
            size={16}
            color={isDarkMode ? '#64748B' : '#94A3B8'}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textDark]}
            placeholder={isSi ? 'සේවාව හෝ සපයන්නා සොයන්න…' : 'Search service, provider, category…'}
            placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#4F46E5']}
            tintColor={isDarkMode ? '#818CF8' : '#4F46E5'}
          />
        }
      >
        {error ? (
          <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
            <Ionicons name="alert-circle-outline" size={38} color="#EF4444" />
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              {isSi ? 'දෝෂයක් සිදු විය' : 'Connection Error'}
            </Text>
            <Text style={[styles.emptyDesc, isDarkMode && styles.textMutedDark]}>{error}</Text>
            <TouchableOpacity style={styles.actionBtnPrimary} onPress={onRefresh} activeOpacity={0.8}>
              <Ionicons name="refresh" size={15} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.actionBtnPrimaryText}>{isSi ? 'නැවත උත්සාහ කරන්න' : 'Try Again'}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
            <View style={[styles.emptyIconWrap, isDarkMode && styles.emptyIconWrapDark]}>
              <Ionicons
                name={searchQuery ? 'search-outline' : 'receipt-outline'}
                size={36}
                color={isDarkMode ? '#818CF8' : '#4F46E5'}
              />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              {searchQuery
                ? (isSi ? 'ප්‍රතිඵල හමු නොවීය' : 'No matching bookings')
                : activeFilter !== 'all'
                ? (isSi ? 'මෙම කාණ්ඩයේ ඇණවුම් නොමැත' : `No ${activeFilter} bookings`)
                : (isSi ? 'තවමත් ඇණවුම් නොමැත' : 'No bookings yet')}
            </Text>
            <Text style={[styles.emptyDesc, isDarkMode && styles.textMutedDark]}>
              {searchQuery
                ? (isSi ? 'වෙනත් වචනයක් යොදා සොයා බලන්න.' : 'Try a different search query or clear filters.')
                : (isSi
                    ? 'සේවා සපයන්නන්ගෙන් මිල ගණන් ඉල්ලූ පසු ඔබගේ ඇණවුම් මෙහි පිළිවෙළට දැකගත හැක.'
                    : 'Your service requests will appear here once you request a quote from providers.')}
            </Text>

            {searchQuery ? (
              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
              >
                <Text style={styles.actionBtnSecondaryText}>{isSi ? 'සෙවුම ඉවත් කරන්න' : 'Clear Search'}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => navigation.navigate('CreatePostScreen')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" style={{ marginRight: 4 }} />
                <Text style={styles.actionBtnPrimaryText}>{isSi ? 'නව සේවාවක් සොයන්න' : 'Request a Service'}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredBookings.map((group) => {
            const overallStatus = getSessionOverallStatus(group);
            const overallStyle = getStatusStyle(overallStatus);
            const title = getServiceTitle(group);
            const date = formatDate(group.createdAt);
            const time = formatTime(group.createdAt);
            const providerCount = group.requests.length;
            const isExpanded = expandedSessions[group.sessionId] ?? false;
            const categoryIcon = getCategoryIcon(group.detectedCategory || '');
            const isUrgent =
              group.urgencyLevel &&
              (group.urgencyLevel.toLowerCase().includes('high') ||
                group.urgencyLevel.toLowerCase().includes('urgent'));

            return (
              <View
                key={group.sessionId}
                style={[styles.card, isDarkMode && styles.cardDark]}
              >
                {/* 1. Main Card Info Row */}
                <View style={styles.cardMain}>
                  <View style={[styles.catIconWrap, isDarkMode && styles.catIconWrapDark]}>
                    <Ionicons
                      name={categoryIcon}
                      size={20}
                      color={isDarkMode ? '#818CF8' : '#4F46E5'}
                    />
                  </View>

                  <View style={styles.cardHeaderInfo}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[styles.serviceTitle, isDarkMode && styles.textDark]}
                        numberOfLines={1}
                      >
                        {title}
                      </Text>

                      {/* Clean Status Pill with dot */}
                      <View
                        style={[
                          styles.statusPill,
                          {
                            backgroundColor: overallStyle.bg,
                            borderColor: overallStyle.border,
                          },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: overallStyle.color }]} />
                        <Text style={[styles.statusPillText, { color: overallStyle.color }]}>
                          {overallStyle.text}
                        </Text>
                      </View>
                    </View>

                    {/* Subtitle / Metadata row */}
                    <View style={styles.metaRow}>
                      <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                        {date} • {time}
                      </Text>

                      {group.serviceLocation && typeof group.serviceLocation === 'string' && (
                        <>
                          <Text style={[styles.metaDivider, isDarkMode && styles.textMutedDark]}>•</Text>
                          <View style={styles.inlineLocation}>
                            <Ionicons
                              name="location-outline"
                              size={12}
                              color={isDarkMode ? '#94A3B8' : '#64748B'}
                            />
                            <Text
                              style={[styles.metaText, isDarkMode && styles.textMutedDark]}
                              numberOfLines={1}
                            >
                              {group.serviceLocation}
                            </Text>
                          </View>
                        </>
                      )}

                      {isUrgent && (
                        <View style={styles.urgentBadge}>
                          <Ionicons name="flash" size={10} color="#EF4444" />
                          <Text style={styles.urgentBadgeText}>
                            {isSi ? 'හදිසි' : 'Urgent'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* 2. Brief description (Clean, unobtrusive) */}
                {group.briefDescription ? (
                  <View style={styles.descWrap}>
                    <Text
                      style={[styles.descText, isDarkMode && styles.textMutedDark]}
                      numberOfLines={1}
                    >
                      {group.briefDescription}
                    </Text>
                  </View>
                ) : null}

                {/* 3. Providers Accordion Header */}
                <TouchableOpacity
                  style={[styles.accordionBar, isDarkMode && styles.accordionBarDark]}
                  onPress={() => toggleExpand(group.sessionId)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={isExpanded
                    ? (isSi ? `සපයන්නන් සඟවන්න (${providerCount})` : `Hide ${providerCount} providers`)
                    : (isSi ? `සපයන්නන් පෙන්වන්න (${providerCount})` : `Show ${providerCount} providers`)}
                >
                  <View style={styles.accordionLeft}>
                    <Ionicons
                      name="people-outline"
                      size={15}
                      color={isDarkMode ? '#818CF8' : '#4F46E5'}
                    />
                    <Text style={[styles.accordionTitle, isDarkMode && styles.textDark]}>
                      {isExpanded
                        ? (isSi ? `සපයන්නන් සඟවන්න (${providerCount})` : `Hide ${providerCount} providers`)
                        : (isSi ? `සපයන්නන් පෙන්වන්න (${providerCount})` : `Show ${providerCount} providers`)}
                    </Text>
                  </View>

                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={isDarkMode ? '#94A3B8' : '#64748B'}
                  />
                </TouchableOpacity>

                {/* 4. Provider Rows */}
                {isExpanded && (
                  <View style={styles.providerList}>
                    {group.requests.map((req, idx) => {
                      const pId = String(req.providerId);
                      const pName = getProviderName(pId);
                      const pImage = getProviderImage(pId);
                      const pStatus = getStatusStyle(req.status);
                      const isLast = idx === group.requests.length - 1;

                      return (
                        <View key={req._id || idx}>
                          <View style={styles.providerRow}>
                            {/* Avatar */}
                            <TouchableOpacity
                              onPress={() => handleViewProviderProfile(pId)}
                              activeOpacity={0.8}
                            >
                              <Image source={{ uri: pImage }} style={styles.providerAvatar} />
                            </TouchableOpacity>

                            {/* Info */}
                            <View style={styles.providerMainInfo}>
                              <TouchableOpacity
                                onPress={() => handleViewProviderProfile(pId)}
                                activeOpacity={0.7}
                              >
                                <Text
                                  style={[styles.providerName, isDarkMode && styles.textDark]}
                                  numberOfLines={1}
                                >
                                  {pName}
                                </Text>
                              </TouchableOpacity>

                              <View style={styles.providerStatusRow}>
                                <View style={[styles.miniDot, { backgroundColor: pStatus.color }]} />
                                <Text style={[styles.providerStatusText, { color: pStatus.color }]}>
                                  {pStatus.text}
                                </Text>
                              </View>
                            </View>

                            {/* Clean action buttons */}
                            <View style={styles.providerActions}>
                              <TouchableOpacity
                                style={[styles.chatBtnOutline, isDarkMode && styles.chatBtnOutlineDark]}
                                onPress={() => handleMessage(req, group)}
                                activeOpacity={0.75}
                              >
                                <Ionicons
                                  name="chatbubble-ellipses-outline"
                                  size={15}
                                  color={isDarkMode ? '#818CF8' : '#4F46E5'}
                                />
                                <Text style={[styles.chatBtnText, isDarkMode && styles.chatBtnTextDark]}>
                                  {isSi ? 'චැට්' : 'Chat'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={[styles.viewBtnSolid, isDarkMode && styles.viewBtnSolidDark]}
                                onPress={() => handleViewQuote(req)}
                                activeOpacity={0.8}
                              >
                                <Ionicons name="document-text-outline" size={13} color={isDarkMode ? '#CBD5E1' : '#475569'} />
                                <Text style={[styles.viewBtnSolidText, isDarkMode && styles.viewBtnSolidTextDark]}>
                                  {isSi ? 'මිල ගණන්' : 'Quote'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {!isLast && (
                            <View style={[styles.rowDivider, isDarkMode && styles.rowDividerDark]} />
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Clean, Balanced, Uncluttered Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#0B0F19',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleWrap: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Top Controls Bar (Clean Segment + Compact Search)
  topControls: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 10,
    paddingBottom: 10,
  },
  topControlsDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
    paddingBottom: 8,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
  },
  tabPillDark: {
    backgroundColor: '#1F2937',
  },
  tabPillActive: {
    backgroundColor: '#4F46E5',
  },
  tabPillActiveDark: {
    backgroundColor: '#4F46E5',
  },
  tabPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  tabCountBadgeDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },

  // Compact Search Box
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginHorizontal: 16,
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 36,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#1E293B',
    paddingVertical: 0,
  },

  // Content List
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },

  // Booking Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  cardDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },

  // Card Main Row
  cardMain: {
    flexDirection: 'row',
    padding: 14,
    alignItems: 'flex-start',
  },
  catIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  catIconWrapDark: {
    backgroundColor: '#1E1B4B',
  },
  cardHeaderInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  serviceTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 4,
    gap: 5,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  metaDivider: {
    fontSize: 10,
    color: '#CBD5E1',
  },
  inlineLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    maxWidth: 120,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 6,
    gap: 2,
    marginLeft: 4,
  },
  urgentBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#EF4444',
  },

  // Description
  descWrap: {
    marginHorizontal: 14,
    marginBottom: 8,
  },
  descText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },

  // Accordion Header
  accordionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 14,
    marginBottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  accordionBarDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accordionTitle: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },

  // Provider List
  providerList: {
    paddingHorizontal: 14,
    paddingTop: 0,
    paddingBottom: 8,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  providerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  providerMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  providerName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  providerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  providerStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },

  // Action Buttons
  providerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chatBtnOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 3,
  },
  chatBtnOutlineDark: {
    backgroundColor: '#111827',
    borderColor: '#334155',
  },
  chatBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  chatBtnTextDark: {
    color: '#CBD5E1',
  },
  viewBtnSolid: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 3,
  },
  viewBtnSolidDark: {
    backgroundColor: '#1F2937',
    borderColor: '#334155',
  },
  viewBtnSolidText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  viewBtnSolidTextDark: {
    color: '#CBD5E1',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: 46,
  },
  rowDividerDark: {
    backgroundColor: '#1E293B',
  },

  // Empty & Status Cards
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  emptyIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyIconWrapDark: {
    backgroundColor: '#1E1B4B',
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },
  actionBtnSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Centered Loading
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
  },

  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
