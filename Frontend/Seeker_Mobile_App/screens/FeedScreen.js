import React, { useState, useEffect } from 'react';
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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import BottomNav from '../components/BottomNav';
import { IP_ADDRESS } from '../config';
import { useTheme } from '../hooks/useTheme';
import RequestQuotationModal from './IT22129376/components/RequestQuotationModal';

// ======================================================
// API BASE URLS
// ======================================================
const hostIp = IP_ADDRESS || '10.0.2.2';
const API_BASE_URL = `http://${hostIp}:3002`;
const QUOTATION_API_URL = `http://${hostIp}:6000/request-quotations`;

// ======================================================
// FEED SCREEN – SHOWS PROVIDER ADS WITH LIKE & REQUEST QUOTE
// ======================================================
export default function FeedScreen({ navigation }) {
  const { isDarkMode } = useTheme();
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
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

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
        const avatar = 'https://randomuser.me/api/portraits/lego/1.jpg';

        const likesArray = Array.isArray(ad.likes) ? ad.likes : [];
        if (userId && likesArray.includes(userId)) {
          initialLikesMap[ad._id] = true;
        }

        return {
          id: ad._id,
          providerId: ad.providerId || ad._id,
          providerName: ad.providerName || 'Provider',
          userName: ad.providerName || 'Provider',
          userAvatar: avatar,
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
  // HANDLE LIKE TOGGLE (PERSISTED TO BACKEND)
  // ======================================================
  const handleLike = async (adId) => {
    const isLiked = !!likedAds[adId];
    const userId = currentUserId || (await getCurrentUserId());

    if (!userId) {
      Alert.alert('Sign in required', 'Please sign in to like this ad.');
      return;
    }

    // 1. Optimistic UI update
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

    // 2. Persist to Backend API
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

      // Sync exact server count
      setAds(prevAds =>
        prevAds.map(ad =>
          ad.id === adId
            ? { ...ad, likeCount: result.likeCount }
            : ad
        )
      );
    } catch (err) {
      console.log('LIKE TOGGLE ERROR:', err);
      // Revert optimistic update on failure
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
        return { bg: '#FEE2E2', color: '#EF4444', text: 'High Priority' };
      case 'medium':
        return { bg: '#FEF3C7', color: '#F59E0B', text: 'Medium' };
      case 'low':
        return { bg: '#D1FAE5', color: '#10B981', text: 'Low' };
      default:
        return {
          bg: isDarkMode ? '#242f4d' : '#F3F4F6',
          color: isDarkMode ? '#94A3B8' : '#6B7280',
          text: 'Normal',
        };
    }
  };

  // ======================================================
  // RENDER AD CARD
  // ======================================================
  const renderAd = ad => {
    const urgency = getUrgencyStyle(ad.urgency);
    const isLiked = !!likedAds[ad.id];

    return (
      <View key={ad.id} style={[styles.postCard, isDarkMode && styles.postCardDark]}>
        {/* Header */}
        <View style={styles.postHeader}>
          <Image source={{ uri: ad.userAvatar }} style={styles.avatar} />
          <View style={styles.postHeaderInfo}>
            <Text style={[styles.userName, isDarkMode && styles.textDark]}>
              {ad.userName}
            </Text>
            <Text style={[styles.timeAgo, isDarkMode && styles.textMutedDark]}>
              {ad.timeAgo}
            </Text>
          </View>
          <TouchableOpacity>
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
            />
          </TouchableOpacity>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.text}
            </Text>
          </View>
          <View
            style={[styles.categoryBadge, isDarkMode && styles.categoryBadgeDark]}
          >
            <Text style={[styles.categoryText, isDarkMode && styles.textMutedDark]}>
              {ad.category}
            </Text>
          </View>
        </View>

        {/* Title & Description */}
        <Text style={[styles.postTitle, isDarkMode && styles.textDark]}>
          {ad.title}
        </Text>
        <Text
          style={[styles.postDescription, isDarkMode && styles.textMutedDark]}
        >
          {ad.description}
        </Text>

        {/* Image */}
        {ad.image ? (
          <Image
            source={{
              uri: ad.image.startsWith('http')
                ? ad.image
                : `${API_BASE_URL}/${ad.image.replace(/\\/g, '/')}`,
            }}
            style={styles.postImage}
          />
        ) : null}

        {/* Tags */}
        {ad.tags?.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsContainer}
          >
            {ad.tags.map((tag, index) => (
              <View
                key={index}
                style={[styles.tagChip, isDarkMode && styles.tagChipDark]}
              >
                <Text
                  style={[styles.tagText, isDarkMode && styles.tagTextDark]}
                >
                  #{tag}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* ========== CARD ACTION BAR (LIKE & REQUEST QUOTE) ========== */}
        <View
          style={[styles.cardActions, isDarkMode && styles.cardActionsDark]}
        >
          {/* Like / Facebook-style Thumbs Up */}
          <TouchableOpacity
            style={[
              styles.likeButton,
              isDarkMode && styles.likeButtonDark,
              isLiked && styles.likedButtonActive,
            ]}
            onPress={() => handleLike(ad.id)}
            activeOpacity={0.6}
          >
            <Ionicons
              name={isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
              size={18}
              color={isLiked ? '#1877F2' : isDarkMode ? '#94A3B8' : '#6B7280'}
            />
            <Text
              style={[
                styles.likeText,
                isDarkMode && styles.textMutedDark,
                isLiked && styles.likedText,
              ]}
            >
              {ad.likeCount > 0
                ? `${ad.likeCount} ${ad.likeCount === 1 ? 'Like' : 'Likes'}`
                : 'Like'}
            </Text>
          </TouchableOpacity>

          {/* REQUEST QUOTE BUTTON */}
          <TouchableOpacity
            style={styles.requestQuoteButton}
            onPress={() => handleOpenQuoteModal(ad)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={
                isDarkMode ? ['#818cf8', '#6366f1'] : ['#6366F1', '#4F46E5']
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.requestQuoteGradient}
            >
              <Ionicons name="document-text-outline" size={16} color="#fff" />
              <Text style={styles.requestQuoteText}>Request Quote</Text>
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#667eea'} />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading ads...
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
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Provider Ads</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.feedContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? '#818cf8' : '#667eea']}
          />
        }
      >
        <View style={styles.feedContent}>
          {ads.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons
                name="newspaper-outline"
                size={60}
                color={isDarkMode ? '#475569' : '#D1D5DB'}
              />
              <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
                No ads found
              </Text>
            </View>
          ) : (
            ads.map(renderAd)
          )}
        </View>
      </ScrollView>

      <RequestQuotationModal
        visible={quoteModalVisible}
        provider={selectedAdForQuote}
        seekerId={currentUserId}
        sessionData={{
          sessionId: selectedAdForQuote?.sessionId || selectedAdForQuote?._id || selectedAdForQuote?.id,
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
  container: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  headerGradient: {
    paddingTop: 14,
    paddingBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    paddingBottom: 100,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  postCardDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    marginRight: 12,
  },
  postHeaderInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryBadgeDark: {
    backgroundColor: '#242f4d',
  },
  categoryText: {
    fontSize: 11,
    color: '#6B7280',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
  },
  tagsContainer: {
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
  },
  tagChipDark: {
    backgroundColor: '#242f4d',
  },
  tagText: {
    color: '#4F46E5',
    fontSize: 11,
  },
  tagTextDark: {
    color: '#818cf8',
  },
  // Card Actions (Like + Request Quote)
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  cardActionsDark: {
    borderTopColor: '#2d3561',
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    gap: 6,
  },
  likeButtonDark: {
    backgroundColor: '#242f4d',
  },
  likedButtonActive: {
    backgroundColor: '#EBF5FF',
  },
  likeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  likedText: {
    color: '#1877F2',
    fontWeight: '700',
  },
  requestQuoteButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  requestQuoteGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  requestQuoteText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalContainerDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalHeaderDark: {
    borderBottomColor: '#2d3561',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBody: {
    maxHeight: 400,
  },
  selectedAdSummary: {
    backgroundColor: '#EEF2FF',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  selectedAdSummaryDark: {
    backgroundColor: '#242f4d',
  },
  summaryAdTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3730A3',
    marginBottom: 2,
  },
  summaryAdTitleDark: {
    color: '#F8FAFC',
  },
  summaryAdCategory: {
    fontSize: 12,
    color: '#6366F1',
  },
  summaryAdCategoryDark: {
    color: '#818cf8',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  textAreaInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    textAlignVertical: 'top',
    minHeight: 90,
    marginBottom: 14,
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    marginBottom: 18,
  },
  inputDark: {
    backgroundColor: '#242f4d',
    borderColor: '#2d3561',
    color: '#F8FAFC',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  modalCancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelButtonDark: {
    backgroundColor: '#242f4d',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  modalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#4F46E5',
    justifyContent: 'center',
  },
  modalSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  disabledButton: {
    opacity: 0.6,
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
