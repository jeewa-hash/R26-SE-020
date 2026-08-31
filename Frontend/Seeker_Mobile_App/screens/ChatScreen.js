// screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { API_BASE_URL, PROVIDER_API_BASE, AUTH_SERVICE_URL } from '../config';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();

  const {
    chatId,
    userId,
    userName,
    userAvatar,
    userRole,
    // Some existing entry points use providerName/providerId instead.
    providerName,
    providerId,
    source,
    isBooking,
    postId,
    requestId,
    postTitle,
    postDescription,
    postImage,
    postCategory,
    postUrgency,
    quotedPrice,
    initialMessage,
  } = route.params || {};

  const { messages, sendMessage, currentUserId, markAsRead, setActiveChat } = useChat();
  const flatListRef = useRef();
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [providerDetails, setProviderDetails] = useState({ name: '', avatar: '' });
  const chatPartnerId = userId || providerId;
  const incomingMessage = chatMessages.find(
    (message) => String(message.senderId) !== String(currentUserId)
  );
  const displayProviderName =
    userName ||
    providerName ||
    providerDetails.name ||
    incomingMessage?.senderName ||
    incomingMessage?.sender?.name ||
    'Service Provider';
  const displayProviderAvatar =
    userAvatar ||
    providerDetails.avatar ||
    incomingMessage?.senderAvatar ||
    incomingMessage?.sender?.profileImage ||
    'https://i.pravatar.cc/150';

  // A chat opened from a notification only has IDs. Resolve the matching
  // provider so its real name is still shown in the chat header.
  useEffect(() => {
    const loadProviderDetails = async () => {
      if (!chatPartnerId || userName || providerName) return;

      try {
        const response = await axios.get(`${PROVIDER_API_BASE}/portfolio/all-providers`);
        const providerItem = (response.data?.providers || []).find(
          (item) => String(item?.provider?.id) === String(chatPartnerId)
        );
        const provider = providerItem?.provider;
        if (!provider) return;

        const imagePath = provider.profileImage;
        const avatar = imagePath
          ? (imagePath.startsWith('http')
            ? imagePath
            : `${AUTH_SERVICE_URL}/${imagePath.replace(/^\/+/, '')}`)
          : '';
        setProviderDetails({ name: provider.name || '', avatar });
      } catch (error) {
        console.warn('Unable to load provider details for chat:', error.message);
      }
    };

    loadProviderDetails();
  }, [chatPartnerId, userName, providerName]);

  // ─── Attached Post State (like FB/Instagram Ad inquiry) ───────────
  const [attachedPost, setAttachedPost] = useState(
    postTitle
      ? {
          source: source || (postCategory === 'Service Request' || isBooking ? 'booking' : 'post'),
          isBooking: Boolean(isBooking || source === 'booking' || postCategory === 'Service Request'),
          postId,
          requestId: requestId || postId,
          postTitle,
          postDescription,
          postImage,
          postCategory,
          postUrgency,
          quotedPrice,
        }
      : null
  );

  // ─── Set active chat for popup notifications ──────────────
  useEffect(() => {
    if (chatId) {
      setActiveChat(chatId);
    }
    return () => setActiveChat(null);
  }, [chatId, setActiveChat]);

  // ─── Set initial message if provided ──────────────────
  useEffect(() => {
    if (initialMessage) {
      setMessageText(initialMessage);
    }
  }, [initialMessage]);

  // ─── Load history ──────────────────────────────────────
  useEffect(() => {
    const loadHistory = async () => {
      if (!chatId) return;
      try {
        const res = await axios.get(`${API_BASE_URL}/chat/message/${chatId}`);
        setChatMessages(res.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    loadHistory();
  }, [chatId]);

  // ─── Listen for new messages ──────────────────────────
  useEffect(() => {
    const newMessages = messages[chatId] || [];
    if (newMessages.length > 0) {
      setChatMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m._id));
        const newOnes = newMessages.filter((m) => !existingIds.has(m._id));
        return [...prev, ...newOnes];
      });
    }
  }, [messages[chatId]]);

  // ─── Mark as read ──────────────────────────────────────
  useEffect(() => {
    if (chatId) markAsRead(chatId);
  }, [chatId, markAsRead, messages[chatId]?.length]);

  // ─── Navigate to Post / Booking Details on Post Card Click ──────
  const handlePostPress = (postData) => {
    if (!postData) return;

    const isBookingItem =
      postData.source === 'booking' ||
      postData.isBooking === true ||
      postData.postCategory === 'Service Request' ||
      postData.quotedPrice ||
      Boolean(postData.requestId) ||
      (typeof postData.postId === 'string' &&
        (postData.postId.startsWith('REQ-') ||
          postData.postId.startsWith('SESSION-') ||
          postData.postId.startsWith('POST-REQ-')));

    // 1. If it's a booking / service request
    if (isBookingItem) {
      const targetReqId = postData.requestId || postData.postId;
      if (targetReqId) {
        navigation.navigate('RequestQuotationDetails', {
          requestId: targetReqId,
          providerId: userId,
        });
        return;
      }
      navigation.navigate('BookingsScreen');
      return;
    }

    // 2. If it's a Seeker Post (from PostResponsesScreen / MyPosts)
    const targetPostId = postData.postId;
    if (targetPostId) {
      navigation.navigate('PostResponsesScreen', {
        postId: targetPostId,
        post: {
          id: targetPostId,
          _id: targetPostId,
          title: postData.postTitle || 'Post',
          description: postData.postDescription || '',
          image: postData.postImage || null,
          category: postData.postCategory || 'General',
          urgency: postData.postUrgency || 'Normal',
        },
      });
      return;
    }

    navigation.navigate('BookingsScreen');
  };

  // ─── Send Message Handler with Post Attachment ──────────
  const handleSendMessage = () => {
    const trimmed = messageText.trim();
    if (!trimmed && !attachedPost) return;
    if (!chatId) return;

    let payload = trimmed;
    if (attachedPost) {
      payload = `[ATTACHED_POST:${JSON.stringify(attachedPost)}] ${trimmed}`;
      setAttachedPost(null); // clear attachment after sending inquiry
    }

    sendMessage(chatPartnerId, payload, chatId);
    setMessageText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 120);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ─── Parse message text for embedded post attachments ───
  const parseMessageContent = (rawText) => {
    if (!rawText) return { postData: null, cleanText: '' };
    if (rawText.startsWith('[ATTACHED_POST:')) {
      const endIdx = rawText.indexOf(']');
      if (endIdx !== -1) {
        try {
          const jsonStr = rawText.substring('[ATTACHED_POST:'.length, endIdx);
          const postData = JSON.parse(jsonStr);
          const cleanText = rawText.substring(endIdx + 1).trim();
          return { postData, cleanText };
        } catch (e) {
          console.warn('Failed to parse attached post data:', e);
        }
      }
    }
    return { postData: null, cleanText: rawText };
  };

  // ─── Render Message Bubble ─────────────────────────────
  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === currentUserId;
    const { postData, cleanText } = parseMessageContent(item.text);

    return (
      <View
        style={[
          styles.messageWrapper,
          isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper,
        ]}
      >
        {!isMyMessage && (
          <Image
            source={{ uri: displayProviderAvatar }}
            style={styles.messageAvatar}
          />
        )}
        <View
          style={[
            styles.messageBubble,
            isMyMessage ? styles.myBubble : styles.otherBubble,
            isDarkMode && !isMyMessage && styles.otherBubbleDark,
            postData && styles.postAttachmentBubble,
          ]}
        >
          {/* ── Instagram / Facebook style Shared Post Card inside bubble ── */}
          {postData ? (
            <TouchableOpacity
              style={[styles.sharedPostCard, isDarkMode && styles.sharedPostCardDark]}
              onPress={() => handlePostPress(postData)}
              activeOpacity={0.82}
            >
              <View style={styles.sharedPostHeader}>
                <View style={styles.sharedPostBadge}>
                  <Ionicons name="pricetag" size={11} color="#667eea" />
                  <Text style={styles.sharedPostBadgeText}>
                    {postData.postCategory || 'Post Inquiry'}
                  </Text>
                </View>
                {postData.quotedPrice ? (
                  <Text style={styles.sharedPostPrice}>LKR {postData.quotedPrice}</Text>
                ) : null}
              </View>

              {postData.postImage ? (
                <Image
                  source={{ uri: postData.postImage }}
                  style={styles.sharedPostImage}
                  resizeMode="cover"
                />
              ) : null}

              <Text
                style={[styles.sharedPostTitle, isDarkMode && styles.textDark]}
                numberOfLines={2}
              >
                {postData.postTitle}
              </Text>

              {postData.postDescription ? (
                <Text
                  style={[styles.sharedPostDesc, isDarkMode && styles.textMutedDark]}
                  numberOfLines={2}
                >
                  {postData.postDescription}
                </Text>
              ) : null}

              <View style={styles.sharedPostFooter}>
                <Text style={styles.sharedPostFooterLink}>View Post Details →</Text>
              </View>

              {cleanText ? (
                <View style={[styles.sharedPostDivider, isDarkMode && styles.sharedPostDividerDark]} />
              ) : null}
            </TouchableOpacity>
          ) : null}

          {/* User's typed message */}
          {cleanText ? (
            <Text
              style={[
                styles.messageText,
                isMyMessage ? styles.myMessageText : styles.otherMessageText,
                isDarkMode && !isMyMessage && styles.otherMessageTextDark,
              ]}
            >
              {cleanText}
            </Text>
          ) : null}

          <Text
            style={[
              styles.messageTime,
              isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
              isDarkMode && styles.textMutedDark,
            ]}
          >
            {formatTime(item.createdAt || item.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Image
              source={{ uri: displayProviderAvatar }}
              style={styles.headerAvatar}
            />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{displayProviderName}</Text>
              <Text style={styles.headerRole}>{userRole || 'Service Provider'}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* ─── Facebook/Instagram style Attached Post Bar (above input) ─── */}
      {attachedPost ? (
        <View style={[styles.attachedPostBar, isDarkMode && styles.attachedPostBarDark]}>
          <TouchableOpacity
            style={styles.attachedPostLeft}
            onPress={() => handlePostPress(attachedPost)}
            activeOpacity={0.75}
          >
            {attachedPost.postImage ? (
              <Image
                source={{ uri: attachedPost.postImage }}
                style={styles.attachedPostThumb}
                resizeMode="cover"
              />
            ) : (
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.attachedPostThumbGradient}
              >
                <Ionicons name="pricetag" size={18} color="#fff" />
              </LinearGradient>
            )}
            <View style={styles.attachedPostTextWrapper}>
              <View style={styles.attachedPostLabelRow}>
                <Text style={styles.attachedPostLabel}>Replying to Post</Text>
                {attachedPost.postCategory ? (
                  <Text style={styles.attachedPostCategory}>{attachedPost.postCategory}</Text>
                ) : null}
              </View>
              <Text
                style={[styles.attachedPostTitle, isDarkMode && styles.textDark]}
                numberOfLines={1}
              >
                {attachedPost.postTitle}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Remove attachment button */}
          <TouchableOpacity
            style={styles.attachedPostCloseBtn}
            onPress={() => setAttachedPost(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
          <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
            <TextInput
              style={[styles.messageInput, isDarkMode && styles.textDark]}
              placeholder={attachedPost ? "Write a message about this post..." : "Type a message..."}
              placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
          </View>
          {messageText.trim() || attachedPost ? (
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} activeOpacity={0.8}>
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendGradient}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.voiceButton}>
              <Ionicons name="mic" size={24} color="#667eea" />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#0f1121' },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 45 : 12,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: { padding: 4 },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
    marginRight: 12,
  },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  headerRole: { fontSize: 12, color: '#ffffffCC', fontWeight: '500' },
  menuButton: { padding: 8 },
  messagesContainer: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20 },
  messageWrapper: { marginBottom: 16, flexDirection: 'row' },
  myMessageWrapper: { justifyContent: 'flex-end' },
  otherMessageWrapper: { justifyContent: 'flex-start' },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  messageBubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    maxWidth: '82%',
  },
  postAttachmentBubble: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    width: '84%',
  },
  myBubble: { backgroundColor: '#667eea', borderBottomRightRadius: 4 },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  otherBubbleDark: { backgroundColor: '#1e293b' },
  messageText: { fontSize: 14, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#1F2937' },
  otherMessageTextDark: { color: '#F8FAFC' },
  messageTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  myMessageTime: { color: '#ffffffAA' },
  otherMessageTime: { color: '#9CA3AF' },

  // ─── Instagram / FB Shared Post Card inside message bubble ───
  sharedPostCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sharedPostCardDark: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
  },
  sharedPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sharedPostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  sharedPostBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  sharedPostPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  sharedPostImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#F1F5F9',
  },
  sharedPostTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 3,
  },
  sharedPostDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
    marginBottom: 4,
  },
  sharedPostFooter: {
    marginTop: 4,
  },
  sharedPostFooterLink: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667eea',
  },
  sharedPostDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginTop: 8,
  },
  sharedPostDividerDark: {
    backgroundColor: '#334155',
  },

  // ─── Attached Post Preview Bar above Input ─────────────────
  attachedPostBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderTopWidth: 1,
    borderTopColor: '#E0E7FF',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  attachedPostBarDark: {
    backgroundColor: '#1e293b',
    borderTopColor: '#334155',
  },
  attachedPostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  attachedPostThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    marginRight: 10,
  },
  attachedPostThumbGradient: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  attachedPostTextWrapper: {
    flex: 1,
  },
  attachedPostLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  attachedPostLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#667eea',
    textTransform: 'uppercase',
  },
  attachedPostCategory: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  attachedPostTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1F2937',
  },
  attachedPostCloseBtn: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
  },

  // ─── Input Container ───────────────────────────────────────
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 10,
  },
  inputContainerDark: { backgroundColor: '#16213e', borderTopColor: '#2d3561' },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  inputWrapperDark: { backgroundColor: '#1a1a2e' },
  messageInput: { fontSize: 15, color: '#1F2937', padding: 0, maxHeight: 80 },
  sendButton: { borderRadius: 24, overflow: 'hidden' },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textDark: { color: '#F8FAFC' },
  textMutedDark: { color: '#94A3B8' },
});