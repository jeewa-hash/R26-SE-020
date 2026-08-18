// screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();
  const { userName, userAvatar, userRole, providerId, bookingId } = route.params || {
    userName: "John Miller",
    userAvatar: "https://randomuser.me/api/portraits/men/1.jpg",
    userRole: "Service Provider",
  };
  
  const flatListRef = useRef();
  const [messageText, setMessageText] = useState('');
  const [showSuggested, setShowSuggested] = useState(true);
  const [isTyping, setIsTyping] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 1,
      senderId: 'other',
      message: "Hi there! How can I help you today?",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      status: 'seen',
    },
    {
      id: 2,
      senderId: 'current_user',
      message: "I need help with my service request",
      timestamp: new Date(Date.now() - 3500000).toISOString(),
      status: 'read',
    },
    {
      id: 3,
      senderId: 'other',
      message: "Sure, I'd be happy to assist you. Could you please provide more details?",
      timestamp: new Date(Date.now() - 3400000).toISOString(),
      status: 'read',
    },
    {
      id: 4,
      senderId: 'current_user',
      message: "I have a plumbing issue in my kitchen",
      timestamp: new Date(Date.now() - 3300000).toISOString(),
      status: 'read',
    },
  ]);

  const suggestedMessages = [
    "What are your hours?",
    "How much does it cost?",
    "Can I book online?",
    "When can you start?",
    "Do you provide warranty?",
  ];

  useEffect(() => {
    // Simulate typing indicator
    const typingTimeout = setTimeout(() => {
      if (messages[messages.length - 1]?.senderId === 'current_user') {
        setIsTyping(true);
        setTimeout(() => setIsTyping(false), 3000);
      }
    }, 1000);
    return () => clearTimeout(typingTimeout);
  }, [messages]);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      const newMessage = {
        id: messages.length + 1,
        senderId: 'current_user',
        message: messageText.trim(),
        timestamp: new Date().toISOString(),
        status: 'sent',
      };
      setMessages([...messages, newMessage]);
      setMessageText('');
      setShowSuggested(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const handleSuggestedPress = (suggestion) => {
    setMessageText(suggestion);
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    }
  };

  const groupMessagesByDate = () => {
    const groups = {};
    messages.forEach(message => {
      const dateKey = new Date(message.timestamp).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });
    return groups;
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === 'current_user';
    
    return (
      <View style={[
        styles.messageWrapper,
        isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
      ]}>
        {!isMyMessage && (
          <Image source={{ uri: userAvatar }} style={styles.messageAvatar} />
        )}
        <View style={styles.messageBubbleContainer}>
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myBubble : styles.otherBubble,
            isDarkMode && !isMyMessage && styles.otherBubbleDark
          ]}>
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText,
              isDarkMode && !isMyMessage && styles.otherMessageTextDark
            ]}>
              {item.message}
            </Text>
          </View>
          <View style={styles.messageFooter}>
            <Text style={[styles.messageTime, isDarkMode && styles.textMutedDark]}>
              {formatTime(item.timestamp)}
            </Text>
            {isMyMessage && item.status === 'seen' && (
              <Ionicons name="checkmark-done" size={14} color="#667eea" />
            )}
            {isMyMessage && item.status === 'read' && (
              <Ionicons name="checkmark-done" size={14} color="#9CA3AF" />
            )}
            {isMyMessage && item.status === 'sent' && (
              <Ionicons name="checkmark" size={14} color="#9CA3AF" />
            )}
          </View>
        </View>
      </View>
    );
  };

  const groupedMessages = groupMessagesByDate();

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
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
            <View style={styles.headerAvatarContainer}>
              <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
              <View style={styles.onlineBadge} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{userName}</Text>
              <View style={styles.headerStatus}>
                <Text style={styles.headerRole}>{userRole}</Text>
                <View style={styles.statusDot} />
                <Text style={styles.headerStatusText}>Online</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={() => (
          <View style={styles.dateHeader}>
            <View style={[styles.dateLine, isDarkMode && styles.dateLineDark]} />
            <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>
              {formatDate(messages[0]?.timestamp)}
            </Text>
            <View style={[styles.dateLine, isDarkMode && styles.dateLineDark]} />
          </View>
        )}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingContainer}>
          <View style={[styles.typingBubble, isDarkMode && styles.typingBubbleDark]}>
            <View style={styles.typingDot} />
            <View style={[styles.typingDot, styles.typingDotDelay]} />
            <View style={[styles.typingDot, styles.typingDotDelay2]} />
            <Text style={[styles.typingText, isDarkMode && styles.textMutedDark]}>Typing...</Text>
          </View>
        </View>
      )}

      {/* Suggested Messages */}
      {showSuggested && messages.length < 5 && (
        <View style={styles.suggestedContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedScroll}
          >
            {suggestedMessages.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.suggestedChip, isDarkMode && styles.suggestedChipDark]}
                onPress={() => handleSuggestedPress(suggestion)}
              >
                <Text style={[styles.suggestedText, isDarkMode && styles.textDark]}>
                  {suggestion}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
          <TouchableOpacity style={styles.attachButton}>
            <Ionicons name="attach" size={24} color="#667eea" />
          </TouchableOpacity>
          
          <View style={[styles.inputWrapper, isDarkMode && styles.inputWrapperDark]}>
            <TextInput
              style={[styles.messageInput, isDarkMode && styles.textDark]}
              placeholder="Type a message..."
              placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
          </View>
          
          {messageText.trim() ? (
            <TouchableOpacity 
              style={styles.sendButton}
              onPress={handleSendMessage}
              activeOpacity={0.8}
            >
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  headerGradient: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingTop: Platform.OS === 'ios' ? 45 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 4,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginLeft: 8,
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#fff',
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#fff',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  headerStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  headerRole: {
    fontSize: 12,
    color: '#ffffffCC',
    fontWeight: '500',
  },
  statusDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ffffffCC',
    marginHorizontal: 6,
  },
  headerStatusText: {
    fontSize: 12,
    color: '#4CD964',
    fontWeight: '500',
  },
  menuButton: {
    padding: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dateLineDark: {
    backgroundColor: '#2d3561',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 20,
    flexDirection: 'row',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
  },
  otherMessageWrapper: {
    justifyContent: 'flex-start',
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 20,
  },
  messageBubbleContainer: {
    maxWidth: '75%',
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#667eea',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  otherBubbleDark: {
    backgroundColor: '#16213e',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  otherMessageTextDark: {
    color: '#fff',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    marginHorizontal: 8,
    gap: 4,
  },
  messageTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  typingContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
    gap: 4,
  },
  typingBubbleDark: {
    backgroundColor: '#16213e',
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#667eea',
    opacity: 0.6,
  },
  typingDotDelay: {
    opacity: 0.4,
  },
  typingDotDelay2: {
    opacity: 0.2,
  },
  typingText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  suggestedContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  suggestedScroll: {
    gap: 10,
  },
  suggestedChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  suggestedChipDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
  },
  suggestedText: {
    fontSize: 14,
    color: '#374151',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    gap: 12,
  },
  inputContainerDark: {
    backgroundColor: '#16213e',
    borderTopColor: '#2d3561',
  },
  attachButton: {
    padding: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
  },
  inputWrapperDark: {
    backgroundColor: '#1a1a2e',
  },
  messageInput: {
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
    maxHeight: 80,
  },
  sendButton: {
    borderRadius: 28,
    overflow: 'hidden',
  },
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
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});