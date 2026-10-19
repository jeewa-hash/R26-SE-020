import PageHeader from '../components/PageHeader';
import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BottomNav from '../components/BottomNav';
import {
  API_BASE_URL as SEEKER_API_BASE_URL,
  PROVIDER_SERVICE_URL,
  AUTH_SERVICE_URL,
} from '../config';
import { useTheme } from '../hooks/useTheme';
import { LanguageContext } from '../context/LanguageContext';
import RequestQuotationModal from './IT22129376/components/RequestQuotationModal';

// ======================================================
// API BASE URLS
// ======================================================
const API_BASE_URL = PROVIDER_SERVICE_URL;
const QUOTATION_API_URL = `${SEEKER_API_BASE_URL}/request-quotations`;

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
  emeraldSoft: '#ECFDF5',
  emeraldSoftDark: '#064E3B',
  emeraldLight: '#34D399',
  amber: '#F59E0B',
  amberSoft: '#FEF3C7',
  amberSoftDark: '#78350F',
  amberLight: '#FBBF24',
  amberDark: '#92400E',
  rose: '#EF4444',
  roseSoft: '#FEE2E2',
  roseSoftDark: '#7F1D1D',
  roseLight: '#FCA5A5',
  roseDark: '#991B1B',
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
  like: '#1877F2',
  likeSoft: '#EBF5FF',
  likeSoftDark: '#1E3A8A',
};

// ─────────────────────────────────────────────────────────────
// Deterministic avatar gradient (used only when there's no real photo)
// ─────────────────────────────────────────────────────────────
const AVATAR_GRADIENTS = [
  ['#4f46e5', '#7c3aed'],
  ['#059669', '#10b981'],
  ['#d97706', '#f59e0b'],
  ['#e11d48', '#fb7185'],
  ['#0284c7', '#38bdf8'],
  ['#7c3aed', '#c084fc'],
  ['#ea580c', '#fb923c'],
];

const getAvatarGradient = (char) => {
  const code = (char || 'P').charCodeAt(0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
};

export default function FeedScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const { language } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [likedAds, setLikedAds] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);

  // Quotation Request Modal State
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedAdForQuote, setSelectedAdForQuote] = useState(null);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteLocation, setQuoteLocation] = useState('');

  // ======================================================
  // FORMAT TIME
  // ======================================================
  const formatTimeAgo = timestamp => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ======================================================
  // GET LOGGED-IN USER ID
  // ======================================================
  const getCurrentUserId = async () => {
    try {
      let uid = await AsyncStorage.getItem('userId');
      if (uid) return uid;

      const storedUser = await AsyncStorage.getItem('user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return parsed.id || parsed._id || parsed.userId || null;
      }
      return null;
    } catch (e) {
      console.log('Error getting current user ID:', e);
      return null;
    }
  };

  // ======================================================
  // BUILD REAL AVATAR URL (no fake fallback)
  // ======================================================
  const buildAvatarUrl = (raw) => {
    if (!raw) return null;
    const normalized = String(raw).replace(/\\/g, '/');
    if (normalized.startsWith('http')) return normalized;
    return `${AUTH_SERVICE_URL}/${normalized.replace(/^\/+/, '')}`;
  };

  // ======================================================
  // FETCH PROVIDER ADS (PUBLIC)
  // ======================================================
  const fetchAds = async () => {
    try {
      setLoading(true);

      const userId = await getCurrentUserId();
      setCurrentUserId(userId);

      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('userToken'));

      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/api/provider/ads/public/all`,
        { method: 'GET', headers }
      );

      const data = await response.json();

      if (!data.success) {
        Alert.alert('Error', data.message || data.error || 'Failed to load ads');
        setAds([]);
        return;
      }

      const adsArray = data.data || [];
      const initialLikesMap = {};

      const formattedAds = adsArray.map(ad => {
        let title = ad.serviceLabel || 'Service';
        if (ad.specificLabel) {
          title += ` - ${ad.specificLabel}`;
        }

        const description =
          (ad.posts && ad.posts.length > 0 && ad.posts[0].caption) ||
          ad.extraInfo ||
          '';

        const imageUrl = ad.image?.url || '';

        // Real provider avatar if the backend supplies it
        const providerAvatar = buildAvatarUrl(
          ad.providerImage ||
          ad.providerAvatar ||
          ad.profileImage ||
          ad.provider?.profileImage
        );

        const likesArray = Array.isArray(ad.likes) ? ad.likes : [];
        if (userId && likesArray.includes(userId)) {
          initialLikesMap[ad._id] = true;
        }

        return {
          id: ad._id,
          postId: ad._id,
          providerId: ad.providerId,
          providerName: ad.providerName || 'Provider',
          userName: ad.providerName || 'Provider',
          userAvatar: providerAvatar, // may be null → render gradient+initial
          location: ad.location || '',
          contact: ad.contact || '',
          timeAgo: formatTimeAgo(ad.createdAt),
          title: title,
          description: description,
          image: imageUrl,
          category: ad.category || 'General',
          tags: Array.isArray(ad.tags) ? ad.tags : [],
          urgency: ad.priority > 5 ? 'high' : ad.priority > 2 ? 'medium' : 'low',
          likeCount: likesArray.length,
          likes: likesArray,
        };
      });

      setLikedAds(initialLikesMap);
      setAds(formattedAds);
    } catch (error) {
      console.log('FETCH ADS ERROR:', error);
      Alert.alert('Error', 'Could not fetch ads. Please check your connection.');
      setAds([]);
    } finally {
      setLoading(false);
    }
  };

  // ======================================================
  // REFRESH
  // ======================================================
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAds();
    setRefreshing(false);
  };

  // ======================================================
  // LOAD ADS ON SCREEN FOCUS
  // ======================================================
  useEffect(() => {
    fetchAds();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchAds();
    });
    return unsubscribe;
  }, [navigation]);

  // ======================================================
  // HANDLE LIKE TOGGLE
  // ======================================================
  const handleLike = async (adId) => {
    const isLiked = !!likedAds[adId];
    const userId = currentUserId || (await getCurrentUserId());

    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to like this ad.');
      return;
    }

    setLikedAds(prev => ({ ...prev, [adId]: !isLiked }));
    setAds(prevAds =>
      prevAds.map(ad =>
        ad.id === adId
          ? {
              ...ad,
              likeCount: Math.max(0, ad.likeCount + (isLiked ? -1 : 1)),
            }
          : ad
      )
    );

    try {
      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('userToken'));

      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`${API_BASE_URL}/api/provider/ads/${adId}/like`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'Failed to update like');
      }

      setAds(prevAds =>
        prevAds.map(ad =>
          ad.id === adId
            ? { ...ad, likeCount: result.likeCount }
            : ad
        )
      );
    } catch (err) {
      console.log('LIKE TOGGLE ERROR:', err);
      setLikedAds(prev => ({ ...prev, [adId]: isLiked }));
      setAds(prevAds =>
        prevAds.map(ad =>
          ad.id === adId
            ? {
                ...ad,
                likeCount: Math.max(0, ad.likeCount + (isLiked ? 1 : -1)),
              }
            : ad
        )
      );
      Alert.alert('Error', 'Could not like this post. Please try again.');
    }
  };

  // ======================================================
  // OPEN REQUEST QUOTE MODAL
  // ======================================================
  const handleOpenQuoteModal = ad => {
    setSelectedAdForQuote(ad);
    setQuoteNotes(`I would like to request a quote for ${ad.title}.`);
    setQuoteLocation(ad.location || '');
    setQuoteModalVisible(true);
  };

  // ======================================================
  // URGENCY STYLE
  // ======================================================
  const getUrgencyStyle = urgency => {
    switch (urgency) {
      case 'high':
        return {
          bg: isDarkMode ? P.roseSoftDark : P.roseSoft,
          color: isDarkMode ? P.roseLight : P.rose,
          icon: 'flame',
          text: isSi ? 'ඉහළ' : 'High Priority',
        };
      case 'medium':
        return {
          bg: isDarkMode ? P.amberSoftDark : P.amberSoft,
          color: isDarkMode ? P.amberLight : P.amberDark,
          icon: 'flash',
          text: isSi ? 'මධ්‍යම' : 'Medium',
        };
      case 'low':
        return {
          bg: isDarkMode ? P.emeraldSoftDark : P.emeraldSoft,
          color: isDarkMode ? P.emeraldLight : P.emerald,
          icon: 'checkmark-circle',
          text: isSi ? 'අඩු' : 'Low',
        };
      default:
        return {
          bg: isDarkMode ? P.slate800 : P.slate100,
          color: isDarkMode ? P.slate400 : P.slate500,
          icon: 'ellipse-outline',
          text: isSi ? 'සාමාන්‍ය' : 'Normal',
        };
    }
  };

  // ======================================================
  // RENDER AD CARD — full content visible, no truncation
  // ======================================================
  const renderAd = ad => {
    const urgency = getUrgencyStyle(ad.urgency);
    const isLiked = !!likedAds[ad.id];
    const initial = (ad.userName || 'P').trim().charAt(0).toUpperCase();
    const avatarGradient = getAvatarGradient(initial);

    return (
      <View key={ad.id} style={[styles.postCard, isDarkMode && styles.postCardDark]}>
        {/* Header: real avatar OR gradient-initial fallback */}
        <View style={styles.postHeader}>
          <View
            style={[
              styles.avatarRing,
              isDarkMode && { borderColor: P.indigoSoftDark },
            ]}
          >
            {ad.userAvatar ? (
              <Image source={{ uri: ad.userAvatar }} style={styles.avatar} />
            ) : (
              <LinearGradient
                colors={avatarGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarFallback}
              >
                <Text style={styles.avatarInitial}>{initial}</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.postHeaderInfo}>
            <Text
              style={[styles.userName, isDarkMode && styles.textDark]}
              numberOfLines={1}
            >
              {ad.userName}
            </Text>

            <View style={styles.metaRow}>
              <Ionicons
                name="time-outline"
                size={11}
                color={isDarkMode ? P.slate400 : P.slate500}
              />
              <Text style={[styles.timeAgo, isDarkMode && styles.textMutedDark]}>
                {ad.timeAgo}
              </Text>
              {ad.location ? (
                <>
                  <Text style={[styles.metaDot, isDarkMode && styles.textMutedDark]}>·</Text>
                  <Ionicons
                    name="location-outline"
                    size={11}
                    color={isDarkMode ? P.slate400 : P.slate500}
                  />
                  <Text
                    style={[styles.timeAgo, isDarkMode && styles.textMutedDark]}
                    numberOfLines={1}
                  >
                    {ad.location}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: urgency.bg }]}>
            <Ionicons name={urgency.icon} size={11} color={urgency.color} />
            <Text style={[styles.badgeText, { color: urgency.color }]}>
              {urgency.text}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              isDarkMode ? { backgroundColor: P.slate800 } : { backgroundColor: P.slate100 },
            ]}
          >
            <Ionicons
              name="pricetag-outline"
              size={11}
              color={isDarkMode ? P.slate300 : P.slate600}
            />
            <Text
              style={[
                styles.badgeText,
                isDarkMode ? { color: P.slate300 } : { color: P.slate600 },
              ]}
            >
              {ad.category}
            </Text>
          </View>
        </View>

        {/* Title & full description (no numberOfLines) */}
        <Text style={[styles.postTitle, isDarkMode && styles.textDark]}>
          {ad.title}
        </Text>
        {ad.description ? (
          <Text style={[styles.postDescription, isDarkMode && styles.textMutedDark]}>
            {ad.description}
          </Text>
        ) : null}

        {/* Full image */}
        {ad.image ? (
          <Image
            source={{
              uri: ad.image.startsWith('http')
                ? ad.image
                : `${API_BASE_URL}/${ad.image.replace(/\\/g, '/')}`,
            }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ) : null}

        {/* Tags */}
        {ad.tags?.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
            contentContainerStyle={styles.tagsContent}
          >
            {ad.tags.map((tag, index) => (
              <View
                key={index}
                style={[styles.tagChip, isDarkMode && styles.tagChipDark]}
              >
                <Text style={[styles.tagText, isDarkMode && styles.tagTextDark]}>
                  #{tag}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Action bar */}
        <View style={[styles.cardActions, isDarkMode && styles.cardActionsDark]}>
          <TouchableOpacity
            style={[
              styles.likeButton,
              isDarkMode && styles.likeButtonDark,
              isLiked && styles.likedButtonActive,
              isLiked && isDarkMode && styles.likedButtonActiveDark,
            ]}
            onPress={() => handleLike(ad.id)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={18}
              color={
                isLiked
                  ? P.like
                  : isDarkMode
                  ? P.slate400
                  : P.slate600
              }
            />
            <Text
              style={[
                styles.likeText,
                isDarkMode && styles.textMutedDark,
                isLiked && styles.likedText,
              ]}
            >
              {ad.likeCount > 0
                ? `${ad.likeCount} ${isSi ? 'කැමැත්ත' : (ad.likeCount === 1 ? 'Like' : 'Likes')}`
                : (isSi ? 'කැමතියි' : 'Like')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.requestQuoteButton}
            onPress={() => handleOpenQuoteModal(ad)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={isDarkMode ? [P.indigoLight, P.indigo] : [P.indigo, '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.requestQuoteGradient}
            >
              <Ionicons name="document-text" size={16} color={P.white} />
              <Text style={styles.requestQuoteText}>
                {isSi ? 'මිල ගණන් ඉල්ලන්න' : 'Request Quote'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
        />
        <PageHeader
          title={<>{isSi ? 'සේවා දැන්වීම්' : 'Provider Ads'}</>}
          onBack={() => navigation.goBack()}
        />
        <View style={styles.loadingContainer}>
          <View
            style={[styles.loadingRing, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
          >
            <ActivityIndicator size="large" color={isDarkMode ? P.indigoLight : P.indigo} />
          </View>
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            {isSi ? 'දැන්වීම් පූරණය වෙමින් පවතී…' : 'Loading ads…'}
          </Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ======================================================
  // MAIN UI
  // ======================================================
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
      />

      <PageHeader
        title={<>{isSi ? 'සේවා දැන්වීම්' : 'Provider Ads'}</>}
        onBack={() => navigation.goBack()}
        renderActions={({ textColor }) => (
          <TouchableOpacity
            style={styles.headerRefreshBtn}
            onPress={onRefresh}
            activeOpacity={0.75}
          >
            <Ionicons name="refresh-outline" size={22} color={textColor} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        style={styles.feedContainer}
        contentContainerStyle={styles.feedContent}
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
        {ads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View
              style={[styles.emptyIconRing, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
            >
              <Ionicons
                name="newspaper-outline"
                size={44}
                color={isDarkMode ? P.indigoLight : P.indigo}
              />
            </View>
            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              {isSi ? 'දැනට දැන්වීම් කිසිවක් නැත' : 'No ads available'}
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              {isSi
                ? 'සේවා සපයන්නන් නව දැන්වීම් පළ කළ විට ඒවා මෙහි දිස්වේ.'
                : 'New provider ads will appear here when they are posted.'}
            </Text>
            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color={P.white} />
              <Text style={styles.refreshButtonText}>
                {isSi ? 'නැවත උත්සාහ කරන්න' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          ads.map(renderAd)
        )}
      </ScrollView>

      <RequestQuotationModal
        visible={quoteModalVisible}
        provider={selectedAdForQuote}
        seekerId={currentUserId}
        sessionData={{
          sessionId: selectedAdForQuote?.sessionId || `AD-${selectedAdForQuote?.postId || selectedAdForQuote?.id}`,
          detectedCategory: selectedAdForQuote?.category || "General",
          detectedObject: selectedAdForQuote?.title || "Service",
          modelConfidence: null,
          stepBreakdown: [],
          briefDescription: selectedAdForQuote?.description || quoteNotes || "Service request",
        }}
        initialDescription={quoteNotes}
        defaultLocation={quoteLocation || selectedAdForQuote?.location || ""}
        defaultUrgency={selectedAdForQuote?.urgency || "Normal"}
        onClose={() => setQuoteModalVisible(false)}
        onSuccess={() => {
          setQuoteModalVisible(false);
          setSelectedAdForQuote(null);
          Alert.alert("Request sent", "Quotation request sent successfully. You can track provider responses in My Jobs.");
        }}
      />

      <BottomNav />
    </SafeAreaView>
  );
}

// ======================================================
// STYLES
// ======================================================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.slate50 },
  containerDark: { backgroundColor: P.slate900 },

  headerRefreshBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  feedContainer: { flex: 1 },
  feedContent: { padding: 16, paddingBottom: 100 },

  // ── Card ──
  postCard: {
    backgroundColor: P.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.slate200,
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
  postCardDark: { backgroundColor: P.slate800, borderColor: P.slate700 },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  avatarRing: {
    padding: 2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: P.indigoSoft,
  },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: P.white,
    letterSpacing: -0.4,
  },
  postHeaderInfo: { flex: 1 },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexWrap: 'wrap',
  },
  timeAgo: { fontSize: 11.5, color: P.slate500, fontWeight: '600' },
  metaDot: { fontSize: 11.5, color: P.slate400, marginHorizontal: 2 },

  // ── Badges ──
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.1 },

  // ── Title / description ──
  postTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
    marginBottom: 6,
    lineHeight: 22,
  },
  postDescription: {
    fontSize: 13.5,
    color: P.slate600,
    lineHeight: 20,
    marginBottom: 12,
    fontWeight: '500',
  },

  // ── Image ──
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: P.slate100,
  },

  // ── Tags ──
  tagsContainer: { marginBottom: 12 },
  tagsContent: { gap: 6, paddingRight: 8 },
  tagChip: {
    backgroundColor: P.indigoSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  tagChipDark: { backgroundColor: P.indigoSoftDark },
  tagText: { color: P.indigo, fontSize: 11, fontWeight: '700' },
  tagTextDark: { color: P.indigoLight },

  // ── Actions ──
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: P.slate100,
    gap: 10,
  },
  cardActionsDark: { borderTopColor: P.slate700 },

  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: P.slate100,
    gap: 6,
  },
  likeButtonDark: { backgroundColor: P.slate900 },
  likedButtonActive: { backgroundColor: P.likeSoft },
  likedButtonActiveDark: { backgroundColor: P.likeSoftDark },
  likeText: { fontSize: 12.5, fontWeight: '700', color: P.slate600 },
  likedText: { color: P.like, fontWeight: '800' },

  requestQuoteButton: {
    borderRadius: 20,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: P.indigo,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  requestQuoteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
    gap: 6,
  },
  requestQuoteText: { color: P.white, fontSize: 12.5, fontWeight: '800' },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: { fontSize: 14, color: P.slate500, fontWeight: '600' },

  // ── Empty ──
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIconRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 13.5,
    color: P.slate500,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 20,
    marginBottom: 20,
    fontWeight: '500',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.indigo,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  refreshButtonText: { color: P.white, fontSize: 13.5, fontWeight: '800' },

  // ── Utility ──
  textDark: { color: P.slate50 },
  textMutedDark: { color: P.slate400 },
});