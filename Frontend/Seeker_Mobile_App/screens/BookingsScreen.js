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
import { API_BASE_URL, AUTH_SERVICE_URL, ML_SERVICE_URL } from '../config';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import { LanguageContext } from '../context/LanguageContext';

const PROVIDER_SERVICE_URL = `${ML_SERVICE_URL}/portfolio/all-providers`;

// ─────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────
const P = {
  indigo: '#4F46E5',
  indigoDeep: '#4338CA',
  indigoSoft: '#EEF2FF',
  indigoSoftDark: '#1E1B4B',
  indigoLight: '#A5B4FC',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#ECFDF5',
  emeraldSoftDark: '#064E3B',
  emeraldLight: '#34D399',
  amber: '#D97706',
  amberSoft: '#FFFBEB',
  amberSoftDark: '#78350F',
  amberLight: '#FBBF24',
  rose: '#EF4444',
  roseDark: '#991B1B',
  roseSoft: '#FEF2F2',
  roseSoftDark: '#7F1D1D',
  roseLight: '#FCA5A5',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

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

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProviders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(PROVIDER_SERVICE_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        throw new Error(`Provider lookup failed: ${response.status}`);
      }
      const data = await response.json();
      if (data.success && data.providers) {
        const map = {};
        data.providers.forEach((item) => {
          const provider = item.provider || {};
          const providerId = provider.id || provider._id || provider.userId;
          if (providerId) {
            map[String(providerId)] = { ...provider, portfolio: item.portfolio || {} };
          }
        });
        return map;
      }
      return {};
    } catch (error) {
      console.warn('PROVIDER LOOKUP ERROR:', error);
      return {};
    }
  }, []);

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
          bg: isDarkMode ? P.emeraldSoftDark : P.emeraldSoft,
          border: isDarkMode ? '#065F46' : '#A7F3D0',
          color: P.emerald,
          text: isSi ? 'තහවුරුයි' : 'Confirmed',
        };
      case 'pending':
        return {
          bg: isDarkMode ? P.amberSoftDark : P.amberSoft,
          border: isDarkMode ? '#92400E' : '#FDE68A',
          color: P.amber,
          text: isSi ? 'පොරොත්තුවේ' : 'Pending',
        };
      case 'cancelled':
      case 'canceled':
        return {
          bg: isDarkMode ? P.roseSoftDark : P.roseSoft,
          border: isDarkMode ? '#991B1B' : '#FECACA',
          color: P.rose,
          text: isSi ? 'අවලංගුයි' : 'Cancelled',
        };
      case 'rejected':
        return {
          bg: isDarkMode ? P.slate800 : P.slate100,
          border: isDarkMode ? P.slate700 : P.slate200,
          color: isDarkMode ? P.slate400 : P.slate500,
          text: isSi ? 'ප්‍රතික්ෂේපිත' : 'Declined',
        };
      default:
        return {
          bg: isDarkMode ? P.slate800 : P.slate100,
          border: isDarkMode ? P.slate700 : P.slate200,
          color: isDarkMode ? P.slate400 : P.slate500,
          text: status
            ? String(status).replace(/_/g, ' ').replace(/^\w/, (l) => l.toUpperCase())
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

  const getProvider = (providerId) => {
    const id = providerId && typeof providerId === 'object'
      ? providerId._id || providerId.id
      : providerId;
    return id ? providersMap[String(id)] || null : null;
  };

  const getProviderName = (providerId) => {
    const p = getProvider(providerId);
    const firstLastName = [p?.firstName, p?.lastName].filter(Boolean).join(' ');
    return p?.name || p?.fullName || p?.businessName || firstLastName ||
      p?.email?.split('@')[0] || (isSi ? 'සපයන්නාගේ නම නොමැත' : 'Provider name unavailable');
  };

  const getProviderImage = (providerId) => {
    const p = getProvider(providerId);
    if (!p?.profileImage) return null;
    const norm = p.profileImage.replace(/\\/g, '/');
    if (norm.startsWith('http')) return norm;
    return `${AUTH_SERVICE_URL}/${norm.replace(/^\/+/, '')}`;
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
          backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
        />
        <PageHeader
          title={<>{isSi ? 'මගේ ඇණවුම්' : 'My Bookings'}</>}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.centerContainer}>
          <View style={[styles.loadingRing, isDarkMode && { backgroundColor: P.indigoSoftDark }]}>
            <ActivityIndicator size="large" color={P.indigo} />
          </View>
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
        backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
      />

      <PageHeader
        title={<>{isSi ? 'මගේ ඇණවුම්' : 'My Bookings'}</>}
        onBack={() => navigation.goBack()}
        renderActions={({ textColor }) => (
          <TouchableOpacity
            style={styles.headerRefreshBtn}
            onPress={onRefresh}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={22} color={textColor} />
          </TouchableOpacity>
        )}
      />

      {/* ── Summary strip ── */}
      <View style={[styles.summaryStrip, isDarkMode && styles.summaryStripDark]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, isDarkMode && { color: P.white }]}>
            {counts.all}
          </Text>
          <Text style={[styles.summaryLabel, isDarkMode && { color: P.slate400 }]}>
            {isSi ? 'මුළු' : 'Total'}
          </Text>
        </View>

        <View style={[styles.summaryDivider, isDarkMode && { backgroundColor: P.slate700 }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: P.amber }]}>{counts.pending}</Text>
          <Text style={[styles.summaryLabel, isDarkMode && { color: P.slate400 }]}>
            {isSi ? 'පොරොත්තු' : 'Pending'}
          </Text>
        </View>

        <View style={[styles.summaryDivider, isDarkMode && { backgroundColor: P.slate700 }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: P.emerald }]}>{counts.confirmed}</Text>
          <Text style={[styles.summaryLabel, isDarkMode && { color: P.slate400 }]}>
            {isSi ? 'තහවුරු' : 'Confirmed'}
          </Text>
        </View>

        <View style={[styles.summaryDivider, isDarkMode && { backgroundColor: P.slate700 }]} />

        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: P.rose }]}>{counts.cancelled}</Text>
          <Text style={[styles.summaryLabel, isDarkMode && { color: P.slate400 }]}>
            {isSi ? 'අවලංගු' : 'Cancelled'}
          </Text>
        </View>
      </View>

      {/* ── Top controls ── */}
      <View style={[styles.topControls, isDarkMode && styles.topControlsDark]}>
        <View style={[styles.searchBox, isDarkMode && styles.searchBoxDark]}>
          <Ionicons
            name="search-outline"
            size={20}
            color={isDarkMode ? P.slate400 : P.slate500}
          />
          <TextInput
            style={[styles.searchInput, isDarkMode && styles.textDark]}
            placeholder={isSi ? 'සේවාව හෝ සපයන්නා සොයන්න' : 'Search service or provider'}
            placeholderTextColor={isDarkMode ? P.slate500 : P.slate400}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={isDarkMode ? P.slate400 : P.slate500}
              />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {[
            { key: 'all', label: isSi ? 'සියල්ල' : 'All', count: counts.all },
            { key: 'pending', label: isSi ? 'පොරොත්තු' : 'Pending', count: counts.pending },
            { key: 'confirmed', label: isSi ? 'තහවුරු' : 'Confirmed', count: counts.confirmed },
            { key: 'cancelled', label: isSi ? 'අවලංගු' : 'Cancelled', count: counts.cancelled },
          ].map((tab) => {
            const isSelected = activeFilter === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setActiveFilter(tab.key)}
                style={[
                  styles.filterChip,
                  isSelected && styles.filterChipActive,
                  isDarkMode && !isSelected && styles.filterChipDark,
                ]}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    isSelected && styles.filterChipTextActive,
                    isDarkMode && !isSelected && styles.textMutedDark,
                  ]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.filterCountBadge,
                    isSelected && styles.filterCountBadgeActive,
                    isDarkMode && !isSelected && { backgroundColor: P.slate700 },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      isSelected && styles.filterCountTextActive,
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
      </View>

      {/* ── Main list ── */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[P.indigo]}
            tintColor={isDarkMode ? P.indigoLight : P.indigo}
          />
        }
      >
        {error ? (
          <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
            <View style={[styles.emptyIconWrap, { backgroundColor: isDarkMode ? P.roseSoftDark : P.roseSoft }]}>
              <Ionicons name="alert-circle-outline" size={44} color={P.rose} />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              {isSi ? 'දෝෂයක් සිදු විය' : 'Something went wrong'}
            </Text>
            <Text style={[styles.emptyDesc, isDarkMode && styles.textMutedDark]}>
              {error}
            </Text>
            <TouchableOpacity
              style={styles.actionBtnPrimary}
              onPress={onRefresh}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={18} color={P.white} style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnPrimaryText}>
                {isSi ? 'නැවත උත්සාහ කරන්න' : 'Try Again'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : filteredBookings.length === 0 ? (
          <View style={[styles.emptyCard, isDarkMode && styles.emptyCardDark]}>
            <View style={[styles.emptyIconWrap, isDarkMode && { backgroundColor: P.indigoSoftDark }]}>
              <Ionicons
                name={searchQuery ? 'search-outline' : 'receipt-outline'}
                size={44}
                color={isDarkMode ? P.indigoLight : P.indigo}
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
                ? (isSi ? 'වෙනත් වචනයක් යොදා සොයා බලන්න.' : 'Try a different search or clear the filter.')
                : (isSi
                    ? 'සේවා සපයන්නන්ගෙන් මිල ගණන් ඉල්ලූ පසු ඔබගේ ඇණවුම් මෙහි දිස්වේ.'
                    : 'Your bookings will appear here once you request a quote from a provider.')}
            </Text>

            {searchQuery ? (
              <TouchableOpacity
                style={[styles.actionBtnSecondary, isDarkMode && { backgroundColor: P.slate800 }]}
                onPress={() => {
                  setSearchQuery('');
                  setActiveFilter('all');
                }}
              >
                <Text style={[styles.actionBtnSecondaryText, isDarkMode && { color: P.slate200 }]}>
                  {isSi ? 'සෙවුම ඉවත් කරන්න' : 'Clear Search'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() => navigation.navigate('CreatePostScreen')}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={20} color={P.white} style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnPrimaryText}>
                  {isSi ? 'නව සේවාවක් සොයන්න' : 'Request a Service'}
                </Text>
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
              <View key={group.sessionId} style={[styles.card, isDarkMode && styles.cardDark]}>
                {/* Header: icon + title + status */}
                <View style={styles.cardHeader}>
                  <View style={[styles.catIconWrap, isDarkMode && styles.catIconWrapDark]}>
                    <Ionicons
                      name={categoryIcon}
                      size={26}
                      color={isDarkMode ? P.indigoLight : P.indigo}
                    />
                  </View>

                  <View style={styles.cardTitleWrap}>
                    <Text
                      style={[styles.serviceTitle, isDarkMode && styles.textDark]}
                      numberOfLines={2}
                    >
                      {title}
                    </Text>
                    <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                      {date} · {time}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: overallStyle.bg, borderColor: overallStyle.border },
                    ]}
                  >
                    <View
                      style={[styles.statusDot, { backgroundColor: overallStyle.color }]}
                    />
                    <Text style={[styles.statusBadgeText, { color: overallStyle.color }]}>
                      {overallStyle.text}
                    </Text>
                  </View>
                </View>

                {/* Location & urgent */}
                <View style={styles.infoRow}>
                  {group.serviceLocation && typeof group.serviceLocation === 'string' && (
                    <View style={styles.infoPill}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={isDarkMode ? P.slate400 : P.slate500}
                      />
                      <Text
                        style={[styles.infoPillText, isDarkMode && styles.textMutedDark]}
                        numberOfLines={1}
                      >
                        {group.serviceLocation}
                      </Text>
                    </View>
                  )}

                  {isUrgent && (
                    <View
                      style={[
                        styles.infoPill,
                        {
                          backgroundColor: isDarkMode ? P.roseSoftDark : P.roseSoft,
                          borderColor: isDarkMode ? P.roseDark : '#FECACA',
                        },
                      ]}
                    >
                      <Ionicons name="flash" size={12} color={P.rose} />
                      <Text style={[styles.infoPillText, { color: P.rose, fontWeight: '800' }]}>
                        {isSi ? 'හදිසි' : 'Urgent'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description */}
                {group.briefDescription ? (
                  <Text
                    style={[styles.descText, isDarkMode && styles.textMutedDark]}
                    numberOfLines={2}
                  >
                    {group.briefDescription}
                  </Text>
                ) : null}

                {/* Accordion toggle */}
                <TouchableOpacity
                  style={[styles.accordionBtn, isDarkMode && styles.accordionBtnDark]}
                  onPress={() => toggleExpand(group.sessionId)}
                  activeOpacity={0.75}
                >
                  <View style={styles.accordionLeft}>
                    <View
                      style={[
                        styles.accordionIconWrap,
                        isDarkMode && { backgroundColor: P.indigoSoftDark },
                      ]}
                    >
                      <Ionicons
                        name="people"
                        size={16}
                        color={isDarkMode ? P.indigoLight : P.indigo}
                      />
                    </View>
                    <Text style={[styles.accordionBtnText, isDarkMode && styles.textDark]}>
                      {isExpanded
                        ? (isSi ? `${providerCount} සපයන්නන් සඟවන්න` : `Hide ${providerCount} provider${providerCount !== 1 ? 's' : ''}`)
                        : (isSi ? `${providerCount} සපයන්නන් බලන්න` : `View ${providerCount} provider${providerCount !== 1 ? 's' : ''}`)}
                    </Text>
                  </View>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={isDarkMode ? P.slate400 : P.slate500}
                  />
                </TouchableOpacity>

                {/* Expanded providers */}
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
                          <View style={styles.providerBlock}>
                            <View style={styles.providerTopRow}>
                              <TouchableOpacity
                                onPress={() => handleViewProviderProfile(pId)}
                                activeOpacity={0.8}
                              >
                                <View
                                  style={[
                                    styles.providerAvatarRing,
                                    isDarkMode && { borderColor: P.indigoSoftDark },
                                  ]}
                                >
                                  {pImage ? (
                                    <Image source={{ uri: pImage }} style={styles.providerAvatar} />
                                  ) : (
                                    <View
                                      style={[
                                        styles.providerAvatar,
                                        styles.providerAvatarPlaceholder,
                                        isDarkMode && { backgroundColor: P.indigoSoftDark },
                                      ]}
                                    >
                                      <Ionicons
                                        name="person"
                                        size={22}
                                        color={isDarkMode ? P.indigoLight : P.indigo}
                                      />
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>

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

                                <View
                                  style={[
                                    styles.providerStatusBadge,
                                    { backgroundColor: pStatus.bg, borderColor: pStatus.border },
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.providerStatusDot,
                                      { backgroundColor: pStatus.color },
                                    ]}
                                  />
                                  <Text
                                    style={[styles.providerStatusText, { color: pStatus.color }]}
                                  >
                                    {pStatus.text}
                                  </Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.providerActionsRow}>
                              <TouchableOpacity
                                style={[
                                  styles.actionBtnHalf,
                                  isDarkMode && styles.actionBtnHalfDark,
                                ]}
                                onPress={() => handleMessage(req, group)}
                                activeOpacity={0.8}
                              >
                                <Ionicons
                                  name="chatbubble-ellipses-outline"
                                  size={18}
                                  color={isDarkMode ? P.indigoLight : P.indigo}
                                />
                                <Text
                                  style={[styles.actionBtnHalfText, isDarkMode && styles.textDark]}
                                >
                                  {isSi ? 'චැට්' : 'Chat'}
                                </Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.actionBtnHalfSolid}
                                onPress={() => handleViewQuote(req)}
                                activeOpacity={0.85}
                              >
                                <Ionicons name="document-text-outline" size={18} color={P.white} />
                                <Text style={styles.actionBtnHalfSolidText}>
                                  {isSi ? 'මිල ගණන්' : 'View Quote'}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {!isLast && (
                            <View
                              style={[styles.rowDivider, isDarkMode && styles.rowDividerDark]}
                            />
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
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.slate50 },
  containerDark: { backgroundColor: P.slate900 },

  headerRefreshBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Summary strip ──
  summaryStrip: {
    flexDirection: 'row',
    backgroundColor: P.white,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderColor: P.slate200,
  },
  summaryStripDark: {
    backgroundColor: P.slate800,
    borderColor: P.slate700,
  },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryValue: {
    fontSize: 20,
    fontWeight: '900',
    color: P.slate900,
    letterSpacing: -0.4,
  },
  summaryLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: P.slate500,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: P.slate200,
    marginVertical: 6,
  },

  // ── Top controls ──
  topControls: {
    backgroundColor: P.white,
    borderBottomWidth: 1,
    borderColor: P.slate200,
    paddingTop: 12,
    paddingBottom: 12,
  },
  topControlsDark: { backgroundColor: P.slate800, borderColor: P.slate700 },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.slate100,
    marginHorizontal: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: P.slate200,
    gap: 10,
  },
  searchBoxDark: { backgroundColor: P.slate900, borderColor: P.slate700 },
  searchInput: { flex: 1, fontSize: 15, color: P.slate900, paddingVertical: 0 },

  filterScroll: { paddingHorizontal: 16, paddingTop: 12, gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.white,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: P.slate200,
  },
  filterChipDark: { backgroundColor: P.slate900, borderColor: P.slate700 },
  filterChipActive: { backgroundColor: P.indigo, borderColor: P.indigo },
  filterChipText: { fontSize: 13, fontWeight: '700', color: P.slate600 },
  filterChipTextActive: { color: P.white },
  filterCountBadge: {
    backgroundColor: P.slate100,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  filterCountBadgeActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterCountText: { fontSize: 10.5, fontWeight: '800', color: P.slate600 },
  filterCountTextActive: { color: P.white },

  // ── List ──
  listContent: { padding: 16, paddingBottom: 40 },

  // ── Card ──
  card: {
    backgroundColor: P.white,
    borderRadius: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.slate200,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  cardDark: { backgroundColor: P.slate800, borderColor: P.slate700 },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  catIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: P.indigoSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIconWrapDark: { backgroundColor: P.indigoSoftDark },
  cardTitleWrap: { flex: 1, justifyContent: 'center', paddingTop: 2 },
  serviceTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  metaText: { fontSize: 12.5, color: P.slate500, fontWeight: '600' },

  // ── Status badge ──
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    alignSelf: 'flex-start',
  },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusBadgeText: { fontSize: 11.5, fontWeight: '800', letterSpacing: 0.1 },

  // ── Info row ──
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.slate100,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: P.slate200,
    maxWidth: '75%',
  },
  infoPillText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: P.slate600,
    flexShrink: 1,
  },

  // ── Description ──
  descText: {
    fontSize: 13,
    color: P.slate600,
    lineHeight: 19,
    marginTop: 10,
    fontWeight: '500',
  },

  // ── Accordion ──
  accordionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: P.slate50,
    borderWidth: 1,
    borderColor: P.slate200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 14,
    gap: 10,
  },
  accordionBtnDark: { backgroundColor: P.slate900, borderColor: P.slate700 },
  accordionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  accordionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accordionBtnText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    color: P.slate700,
    letterSpacing: -0.1,
  },

  // ── Providers ──
  providerList: { marginTop: 4 },
  providerBlock: { paddingVertical: 14 },
  providerTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  providerAvatarRing: {
    padding: 2,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: P.indigoSoft,
  },
  providerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  providerAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.indigoSoft,
  },
  providerMainInfo: { flex: 1, gap: 5 },
  providerName: { fontSize: 15, fontWeight: '800', color: P.slate900, letterSpacing: -0.2 },
  providerStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    gap: 5,
  },
  providerStatusDot: { width: 5, height: 5, borderRadius: 3 },
  providerStatusText: { fontSize: 10.5, fontWeight: '800' },

  // ── Actions ──
  providerActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtnHalf: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: P.indigo,
    backgroundColor: P.white,
    gap: 6,
  },
  actionBtnHalfDark: { backgroundColor: P.slate800 },
  actionBtnHalfText: { fontSize: 13.5, fontWeight: '800', color: P.indigo },
  actionBtnHalfSolid: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 12,
    backgroundColor: P.indigo,
    gap: 6,
  },
  actionBtnHalfSolidText: { fontSize: 13.5, fontWeight: '800', color: P.white },

  rowDivider: { height: 1, backgroundColor: P.slate100, marginLeft: 62 },
  rowDividerDark: { backgroundColor: P.slate700 },

  // ── Empty states ──
  emptyCard: {
    backgroundColor: P.white,
    borderRadius: 18,
    padding: 28,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: P.slate200,
  },
  emptyCardDark: { backgroundColor: P.slate800, borderColor: P.slate700 },
  emptyIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: P.indigoSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: P.slate900,
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  emptyDesc: {
    fontSize: 14,
    color: P.slate500,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 8,
    fontWeight: '500',
  },
  actionBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.indigo,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    minHeight: 48,
    minWidth: 170,
  },
  actionBtnPrimaryText: { color: P.white, fontWeight: '800', fontSize: 14 },
  actionBtnSecondary: {
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: P.slate100,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnSecondaryText: { fontSize: 14, fontWeight: '800', color: P.slate600 },

  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: { fontSize: 14, color: P.slate500, fontWeight: '600' },

  textDark: { color: P.slate50 },
  textMutedDark: { color: P.slate400 },
});