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
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_SERVICE_URL, PROVIDER_API_BASE, API_BASE_URL, SEEKER_SERVICE_URL } from '../config';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import axios from 'axios';

const QUOTATION_API_URL = `${SEEKER_SERVICE_URL}/request-quotations`;

export default function PostResponsesScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { postId, post } = route.params;

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
  const [isSubmittingQuote, setIsSubmittingQuote] = useState(false);

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
              const found = providers.find(p => p.provider?.id === providerId);
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
            profilePicture: userData.profilePicture || userData.profileImage || item.profilePicture || null,
          };
        } else {
          providerInfo = {
            name: item.name || 'Provider',
            profilePicture: item.profilePicture || null,
          };
        }

        setProviderCache(prev => ({ ...prev, [providerId]: providerInfo }));
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

  // ─── HANDLE CHAT – Instagram-style post sharing ──────────
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

      // ─── Prepare post data for Instagram-style sharing ──
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

      // ─── Instagram-style conversational message ──────────
      const initialMessage = `Hi! I would like to discuss this service request with you.`;

      navigation.navigate('ChatScreen', {
        chatId,
        userId: receiverId,
        userName: response.name || 'Provider',
        userAvatar: response.profilePicture || `https://i.pravatar.cc/150?u=${receiverId}`,
        userRole: 'ServiceProvider',
        // ─── Pass post details for shared post card ──────
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
    setQuoteNotes(`I would like to request a quote for my service post.`);
    setQuoteLocation('');
    setQuoteModalVisible(true);
  };

  const handleSubmitQuote = async () => {
    if (!selectedProvider) return;
    const seekerId = currentUserId;
    const token = await AsyncStorage.getItem('userToken') || await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert('Error', 'You must be logged in to request a quotation.');
      return;
    }

    const payload = {
      seekerId: seekerId || 'seeker_user',
      providerId: selectedProvider.applicantId,
      sessionId: `POST-${postId}-${Date.now()}`,
      detectedCategory: 'Service',
      detectedObject: selectedProvider.name || 'Provider',
      modelConfidence: null,
      stepBreakdown: [],
      briefDescription: quoteNotes.trim() || `Requesting quote for post ${postId}`,
      urgencyLevel: 'Normal',
      serviceLocation: quoteLocation.trim() || '',
    };

    setIsSubmittingQuote(true);
    try {
      const response = await fetch(QUOTATION_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.status === 201 || response.status === 200 || data.success) {
        Alert.alert('Quotation Request Sent', `Your quotation request has been sent to ${selectedProvider.name}.`, [
          { text: 'OK', onPress: () => { setQuoteModalVisible(false); setSelectedProvider(null); } }
        ]);
      } else {
        Alert.alert('Failed to Send', data.message || 'Unable to send quotation request.');
      }
    } catch (error) {
      console.error('QUOTATION REQUEST ERROR:', error);
      Alert.alert('Network Error', 'Could not connect to the quotation server.');
    } finally {
      setIsSubmittingQuote(false);
    }
  };

  // ─── RENDER SINGLE RESPONSE ──────────────────────────────
  const renderResponse = (item) => {
    const avatar = item.profilePicture
      ? item.profilePicture.startsWith('http')
        ? item.profilePicture
        : `${API_BASE_URL}/${item.profilePicture.replace(/\\/g, '/')}`
      : `https://i.pravatar.cc/150?u=${item.applicantId}`;

    return (
      <View key={item._id || item.applicantId} style={[styles.responseCard, isDarkMode && styles.responseCardDark]}>
        <View style={styles.responseHeader}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View style={styles.responseInfo}>
            <Text style={[styles.providerName, isDarkMode && styles.textDark]}>{item.name || 'Unknown Provider'}</Text>
            <Text style={[styles.providerRole, isDarkMode && styles.textMutedDark]}>{item.role || 'ServiceProvider'}</Text>
            <Text style={[styles.responseTime, isDarkMode && styles.textMutedDark]}>{formatTimeAgo(item.createdAt)}</Text>
          </View>
        </View>
        {item.bidAmount && (
          <View style={styles.bidContainer}>
            <Ionicons name="cash-outline" size={16} color="#10B981" />
            <Text style={styles.bidAmount}>LKR {item.bidAmount.toLocaleString()}</Text>
          </View>
        )}
        {item.note && (
          <Text style={[styles.responseMessage, isDarkMode && styles.textMutedDark]}>{item.note}</Text>
        )}
        <View style={styles.actionButtonsRow}>
          {/* ─── MESSAGE BUTTON – Instagram-style ─────────── */}
          <TouchableOpacity style={[styles.actionButton, styles.chatButton]} onPress={() => handleChat(item)}>
            <Ionicons name="send-outline" size={18} color="#fff" />
            <Text style={styles.actionButtonText}>Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.quoteButton]} onPress={() => handleOpenQuoteModal(item)}>
            <Ionicons name="document-text-outline" size={18} color="#fff" />
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
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <LinearGradient colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
          <Text style={styles.headerTitle}>Responses</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#667eea'} />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>Loading responses...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─── MAIN UI ──────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <LinearGradient colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color="#fff" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Responses</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />}
        showsVerticalScrollIndicator={false}
      >
        {responses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={60} color={isDarkMode ? '#2d3561' : '#D1D5DB'} />
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>No responses yet</Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>Providers haven't responded to this post yet.</Text>
          </View>
        ) : (
          responses.map(renderResponse)
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* ─── QUOTATION REQUEST MODAL ──────────────────────── */}
      <Modal animationType="slide" transparent visible={quoteModalVisible} onRequestClose={() => setQuoteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
            <View style={[styles.modalHeader, isDarkMode && styles.modalHeaderDark]}>
              <View>
                <Text style={[styles.modalTitle, isDarkMode && styles.textDark]}>Request Quotation</Text>
                <Text style={[styles.modalSubtitle, isDarkMode && styles.textMutedDark]}>To: {selectedProvider?.name || 'Provider'}</Text>
              </View>
              <TouchableOpacity onPress={() => setQuoteModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={isDarkMode ? '#94A3B8' : '#6B7280'} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.selectedAdSummary, isDarkMode && styles.selectedAdSummaryDark]}>
                <Text style={[styles.summaryAdTitle, isDarkMode && styles.summaryAdTitleDark]}>{selectedProvider?.name || 'Provider'}</Text>
                <Text style={[styles.summaryAdCategory, isDarkMode && styles.summaryAdCategoryDark]}>{selectedProvider?.role || 'ServiceProvider'}</Text>
              </View>
              <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Requirements & Details</Text>
              <TextInput style={[styles.textAreaInput, isDarkMode && styles.inputDark]} multiline numberOfLines={4} value={quoteNotes} onChangeText={setQuoteNotes} placeholder="Describe what work needs to be done..." placeholderTextColor={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
              <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Service Location</Text>
              <TextInput style={[styles.textInput, isDarkMode && styles.inputDark]} value={quoteLocation} onChangeText={setQuoteLocation} placeholder="Enter your address or city..." placeholderTextColor={isDarkMode ? '#94A3B8' : '#9CA3AF'} />
              <View style={styles.modalButtonsRow}>
                <TouchableOpacity style={[styles.modalCancelButton, isDarkMode && styles.modalCancelButtonDark]} onPress={() => setQuoteModalVisible(false)} disabled={isSubmittingQuote}>
                  <Text style={[styles.modalCancelText, isDarkMode && styles.textMutedDark]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalSubmitButton, isSubmittingQuote && styles.disabledButton]} onPress={handleSubmitQuote} disabled={isSubmittingQuote} activeOpacity={0.8}>
                  {isSubmittingQuote ? <ActivityIndicator color="#fff" size="small" /> : <><Ionicons name="send" size={16} color="#fff" /><Text style={styles.modalSubmitText}>Send Request</Text></>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#1a1a2e' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, paddingTop: Platform.OS === 'ios' ? 12 : 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#6B7280' },
  responseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  responseCardDark: { backgroundColor: '#16213e', borderColor: '#2d3561', borderWidth: 1 },
  responseHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, borderWidth: 2, borderColor: '#667eea' },
  responseInfo: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  providerRole: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  responseTime: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  bidContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, marginBottom: 4, gap: 6 },
  bidAmount: { fontSize: 16, fontWeight: '700', color: '#10B981' },
  responseMessage: { fontSize: 14, color: '#6B7280', lineHeight: 20, marginTop: 4, marginBottom: 12 },
  actionButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12 },
  actionButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chatButton: { backgroundColor: '#667eea' },
  quoteButton: { backgroundColor: '#10B981' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContainer: { backgroundColor: '#fff', borderRadius: 20, width: '100%', maxHeight: '85%', padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8 },
  modalContainerDark: { backgroundColor: '#16213e', borderColor: '#2d3561', borderWidth: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', paddingBottom: 14, marginBottom: 14 },
  modalHeaderDark: { borderBottomColor: '#2d3561' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  modalCloseBtn: { padding: 4 },
  modalBody: { maxHeight: 400 },
  selectedAdSummary: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginBottom: 16 },
  selectedAdSummaryDark: { backgroundColor: '#242f4d' },
  summaryAdTitle: { fontSize: 15, fontWeight: '700', color: '#3730A3', marginBottom: 2 },
  summaryAdTitleDark: { color: '#F8FAFC' },
  summaryAdCategory: { fontSize: 12, color: '#6366F1' },
  summaryAdCategoryDark: { color: '#818cf8' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  textAreaInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, color: '#111827', textAlignVertical: 'top', minHeight: 90, marginBottom: 14 },
  textInput: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#111827', marginBottom: 18 },
  inputDark: { backgroundColor: '#242f4d', borderColor: '#2d3561', color: '#F8FAFC' },
  modalButtonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8, marginBottom: 8 },
  modalCancelButton: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  modalCancelButtonDark: { backgroundColor: '#242f4d' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  modalSubmitButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, backgroundColor: '#4F46E5', justifyContent: 'center' },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  disabledButton: { opacity: 0.6 },
  textDark: { color: '#F8FAFC' },
  textMutedDark: { color: '#94A3B8' },
});