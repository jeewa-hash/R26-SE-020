// screens/PostResponsesScreen.js

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
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS, AUTH_SERVICE_URL, PROVIDER_API_BASE, API_BASE_URL } from '../config';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import RequestQuotationModal from './IT22129376/components/RequestQuotationModal';

const QUOTATION_API_URL = `http://${IP_ADDRESS}:6000/request-quotations`;

export default function PostResponsesScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { postId, post } = route.params || {};

  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [providerCache, setProviderCache] = useState({});

  const { createOrGetChat } = useChat();

  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quoteNotes, setQuoteNotes] = useState('');
  const [quoteLocation, setQuoteLocation] = useState('');

  // ─── Load user data ────────────────────────────────────────
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        setToken(storedToken);
        setCurrentUserId(storedUserId);
      } catch (error) {
        console.log('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  // ─── Fetch responses when token and postId are available ──
  useEffect(() => {
    if (token && postId) {
      fetchResponses();
    }
  }, [token, postId]);

  // ─── FETCH RESPONSES ──────────────────────────────────────
  const fetchResponses = async () => {
    if (!token || !postId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/posts/responses/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 404) {
        console.warn(`Post ${postId} not found on posts endpoint.`);
        setResponses([]);
        return;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        setResponses([]);
        return;
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        setResponses([]);
        return;
      }

      if (data.success) {
        const rawResponses = data.responses || [];
        const enrichedResponses = await enrichResponses(rawResponses);
        setResponses(enrichedResponses);
      } else {
        console.warn(data.error || 'Failed to load responses');
        setResponses([]);
      }
    } catch (error) {
      console.log('Fetch Responses Error:', error.message);
      setResponses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── ENRICH RESPONSES WITH PROVIDER DETAILS ──────────────
  const enrichResponses = async (responsesArray) => {
    const enriched = [];
    for (const item of responsesArray) {
      const providerId = item.applicantId;
      let providerInfo = providerCache[providerId];

      if (!providerInfo) {
        let userData = null;
        const endpoints = [
          `${AUTH_SERVICE_URL}/provider/${providerId}`,
          `${AUTH_SERVICE_URL}/seeker/user/${providerId}`,
        ];

        for (const url of endpoints) {
          try {
            const res = await axios.get(url, {
              headers: { Authorization: `Bearer ${token}` },
            });
            userData = res.data;
            if (userData) break;
          } catch (e) {}
        }

        if (!userData) {
          try {
            const portfolioRes = await axios.get(`${PROVIDER_API_BASE}/portfolio/all-providers`);
            if (portfolioRes.data.success) {
              const providers = portfolioRes.data.providers || [];
              const found = providers.find((p) => p.provider?.id === providerId);
              if (found && found.provider) {
                userData = {
                  name: found.provider.name || found.provider.email?.split('@')[0] || 'Provider',
                  profilePicture: found.provider.profileImage || null,
                };
              }
            }
          } catch (e) {
            console.warn('Portfolio fetch failed:', e.message);
          }
        }

        if (userData) {
          providerInfo = {
            name: userData.name || userData.fullName || item.name || 'Provider',
            profilePicture:
              userData.profilePicture || userData.profileImage || item.profilePicture || null,
          };
        } else {
          providerInfo = {
            name: item.name || 'Provider',
            profilePicture: item.profilePicture || null,
          };
        }

        setProviderCache((prev) => ({ ...prev, [providerId]: providerInfo }));
      }

      enriched.push({
        ...item,
        name: providerInfo.name,
        profilePicture: providerInfo.profilePicture || item.profilePicture,
      });
    }
    return enriched;
  };

  // ─── REFRESH ──────────────────────────────────────────────
  const onRefresh = () => {
    setRefreshing(true);
    fetchResponses();
  };

  // ─── FORMAT TIME ──────────────────────────────────────────
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ─── URGENCY HELPER ───────────────────────────────────────
  const getUrgencyStyle = (urgency) => {
    switch (String(urgency).toLowerCase()) {
      case 'high':
      case 'urgent':
        return { bg: '#FEE2E2', color: '#EF4444', text: 'Urgent' };
      case 'medium':
        return { bg: '#FEF3C7', color: '#F59E0B', text: 'Medium' };
      case 'low':
        return { bg: '#D1FAE5', color: '#10B981', text: 'Low' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: 'Normal' };
    }
  };

  // ─── HANDLE CHAT ──────────────────────────────────────────
  const handleChat = async (response) => {
    try {
      const receiverId = response.applicantId;
      if (!receiverId) {
        Alert.alert('Error', 'Provider ID not found.');
        return;
      }

      const chatId = await createOrGetChat(currentUserId, receiverId);
      if (!chatId) {
        Alert.alert('Error', 'Could not start chat. Please try again.');
        return;
      }

      const postTitle = post?.title || '';
      const postDescription = post?.description || '';
      const postCategory = post?.category || '';
      const postUrgency = post?.urgency || '';
      let postImageUrl = null;
      if (post?.image) {
        postImageUrl = post.image.startsWith('http')
          ? post.image
          : `${API_BASE_URL}/${post.image.replace(/\\/g, '/')}`;
      }

      const initialMessage = `Hi! I would like to discuss this service request with you.`;

      navigation.navigate('ChatScreen', {
        chatId,
        userId: receiverId,
        userName: response.name || 'Provider',
        userAvatar: response.profilePicture || `https://i.pravatar.cc/150?u=${receiverId}`,
        userRole: 'ServiceProvider',
        source: 'post',
        postId: postId,
        postTitle: postTitle,
        postDescription: postDescription,
        postImage: postImageUrl,
        postCategory: postCategory,
        postUrgency: postUrgency,
        initialMessage: initialMessage,
      });
    } catch (error) {
      console.error('Chat navigation error:', error);
      Alert.alert('Error', 'Could not open chat.');
    }
  };

  // ─── REQUEST QUOTATION MODAL ─────────────────────────────
  const handleOpenQuoteModal = (provider) => {
    setSelectedProvider(provider);
    setQuoteNotes(post?.description ? `Regarding: ${post.title}\n${post.description}` : 'I would like to request a quote for my service post.');
    setQuoteLocation(
      post?.location?.address ||
      (typeof post?.location === 'string' ? post.location : '') ||
      ''
    );
    setQuoteModalVisible(true);
  };

  // ─── RENDER SINGLE RESPONSE CARD ─────────────────────────
  const renderResponse = (item) => {
    const avatar = item.profilePicture
      ? item.profilePicture.startsWith('http')
        ? item.profilePicture
        : `${API_BASE_URL}/${item.profilePicture.replace(/\\/g, '/')}`
      : `https://i.pravatar.cc/150?u=${item.applicantId}`;

    return (
      <View
        key={item._id || item.applicantId}
        style={[styles.responseCard, isDarkMode && styles.responseCardDark]}
      >
        <View style={styles.responseHeader}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View style={styles.responseInfo}>
            <Text style={[styles.providerName, isDarkMode && styles.textDark]}>
              {item.name || 'Unknown Provider'}
            </Text>
            <Text style={[styles.providerRole, isDarkMode && styles.textMutedDark]}>
              {item.role || 'ServiceProvider'}
            </Text>
            <Text style={[styles.responseTime, isDarkMode && styles.textMutedDark]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </View>

        {item.bidAmount ? (
          <View style={styles.bidContainer}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
            <Text style={styles.bidAmount}>LKR {item.bidAmount.toLocaleString()}</Text>
          </View>
        ) : null}

        {item.note ? (
          <Text style={[styles.responseMessage, isDarkMode && styles.textMutedDark]}>
            {item.note}
          </Text>
        ) : null}

        <View style={styles.actionButtonsRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.chatButton]}
            onPress={() => handleChat(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="send-outline" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.quoteButton]}
            onPress={() => handleOpenQuoteModal(item)}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Request Quote</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Responses</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>

        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#667eea'} />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading responses...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── POST IMAGE URL ───────────────────────────────────────
  const postImageUrl = post?.image
    ? post.image.startsWith('http')
      ? post.image
      : `${API_BASE_URL}/${post.image.replace(/\\/g, '/')}`
    : null;

  const urgency = getUrgencyStyle(post?.urgency);
  const locationString =
    post?.location?.address ||
    (typeof post?.location === 'string' ? post.location : null) ||
    post?.location?.city ||
    null;

  // ─── MAIN UI ──────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      {/* HEADER */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post & Responses</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor={isDarkMode ? '#667eea' : '#667eea'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════
            1. POST DETAILS CARD AT THE TOP
           ══════════════════════════════════════════════════════════ */}
        {post && (
          <View style={[styles.postDetailCard, isDarkMode && styles.postDetailCardDark]}>
            <LinearGradient
              colors={isDarkMode ? ['#16213e', '#1a1a2e'] : ['#ffffff', '#f9fafb']}
              style={styles.postDetailGradient}
            >
              {/* Category & Urgency Badges */}
              <View style={styles.postDetailHeader}>
                <View style={styles.categoryBadge}>
                  <View
                    style={[
                      styles.categoryIconWrap,
                      { backgroundColor: isDarkMode ? '#2d3561' : '#667eea15' },
                    ]}
                  >
                    <Ionicons name="briefcase-outline" size={14} color="#667eea" />
                  </View>
                  <Text style={[styles.categoryText, isDarkMode && styles.textDark]}>
                    {post.category || 'General'}
                  </Text>
                </View>

                {post.urgency ? (
                  <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
                    <Ionicons name="alert-circle" size={12} color={urgency.color} />
                    <Text style={[styles.urgencyText, { color: urgency.color }]}>
                      {urgency.text}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Title */}
              <Text style={[styles.postDetailTitle, isDarkMode && styles.textDark]}>
                {post.title || 'Untitled Service Request'}
              </Text>

              {/* Description */}
              {post.description ? (
                <Text style={[styles.postDetailDescription, isDarkMode && styles.textMutedDark]}>
                  {post.description}
                </Text>
              ) : null}

              {/* Image Preview */}
              {postImageUrl ? (
                <Image source={{ uri: postImageUrl }} style={styles.postDetailImage} />
              ) : null}

              {/* Meta Info Row */}
              <View style={styles.postMetaRow}>
                {locationString ? (
                  <View style={styles.postMetaItem}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text
                      style={[styles.postMetaText, isDarkMode && styles.textMutedDark]}
                      numberOfLines={1}
                    >
                      {locationString}
                    </Text>
                  </View>
                ) : null}

                {post.date ? (
                  <View style={styles.postMetaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={[styles.postMetaText, isDarkMode && styles.textMutedDark]}>
                      {post.date}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.responseCountBadge}>
                  <Ionicons name="people" size={13} color="#10B981" />
                  <Text style={styles.responseCountText}>
                    {responses.length} {responses.length === 1 ? 'Response' : 'Responses'}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════
            2. RESPONSES SECTION TITLE
           ══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Provider Responses ({responses.length})
          </Text>
        </View>

        {/* ══════════════════════════════════════════════════════════
            3. RESPONSES LIST
           ══════════════════════════════════════════════════════════ */}
        {responses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconWrap, isDarkMode && styles.emptyIconWrapDark]}>
              <Ionicons
                name="people-outline"
                size={48}
                color={isDarkMode ? '#667eea' : '#9CA3AF'}
              />
            </View>
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
              No Responses Yet
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              Providers will review your post soon. You will receive bids and messages here.
            </Text>
          </View>
        ) : (
          responses.map(renderResponse)
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {/* REQUEST QUOTATION MODAL */}
      <RequestQuotationModal
        visible={quoteModalVisible}
        provider={selectedProvider}
        seekerId={currentUserId}
        sessionData={{
          sessionId: post?.sessionId || `POST-${postId}`,
          detectedCategory: post?.detectedCategory || post?.category || 'General',
          detectedObject: post?.detectedObject || post?.title || 'Service',
          modelConfidence: post?.modelConfidence || null,
          stepBreakdown: post?.stepBreakdown || [],
          briefDescription: post?.description || quoteNotes || 'Service request',
        }}
        defaultLocation={
          locationString ||
          post?.serviceLocation ||
          quoteLocation
        }
        defaultUrgency={post?.urgencyLevel || post?.urgency || 'Normal'}
        onClose={() => setQuoteModalVisible(false)}
        onSuccess={() => {
          setQuoteModalVisible(false);
          setSelectedProvider(null);
          Alert.alert(
            'Request Sent',
            'Quotation request sent successfully. You can track provider responses in My Jobs.'
          );
        }}
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },

  // ─── Post Detail Card Styles ──────────────────────────────
  postDetailCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  postDetailCardDark: {
    backgroundColor: '#16213e',
  },
  postDetailGradient: {
    padding: 16,
    borderRadius: 20,
  },
  postDetailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
  },
  postDetailTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  postDetailDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  postDetailImage: {
    width: '100%',
    height: 160,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },
  postMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  postMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '50%',
  },
  postMetaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  responseCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 'auto',
  },
  responseCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#065F46',
  },

  // ─── Section Header ───────────────────────────────────────
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },

  // ─── Response Card Styles ─────────────────────────────────
  responseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  responseCardDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  responseInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
  },
  providerRole: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  responseTime: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  bidContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    gap: 6,
    backgroundColor: '#ECFDF5',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bidAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  responseMessage: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 12,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  chatButton: {
    backgroundColor: '#667eea',
  },
  quoteButton: {
    backgroundColor: '#10B981',
  },

  // ─── Empty State Styles ───────────────────────────────────
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconWrapDark: {
    backgroundColor: '#242f4d',
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 18,
  },

  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
