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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userName, userAvatar, userRole } = route.params;
  const flatListRef = useRef();
  const [messageText, setMessageText] = useState('');
  const [showSuggested, setShowSuggested] = useState(true);

  const [messages, setMessages] = useState([
    {
      id: 1,
      senderId: 'other',
      message: "We haven't seen you for 2 weeks. Would you like to set up an appointment with your nutritionist?",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      status: 'seen',
    },
    {
      id: 2,
      senderId: 'current_user',
      message: "OK, let make an appointment",
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      status: 'read',
    },
    {
      id: 3,
      senderId: 'current_user',
      message: "I'm looking for an nutritionist...",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      status: 'read',
    },
    {
      id: 4,
      senderId: 'other',
      message: "Cancel",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      status: 'read',
    },
  ]);

  const suggestedMessages = [
    "What are your hours?",
    "Do you accept insurance?",
    "How much does it cost?",
    "Can I book online?",
  ];

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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === 'current_user';
    
    return (
      <View style={[
        styles.messageWrapper,
        isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper
      ]}>
        <View style={styles.messageBubbleContainer}>
          <View style={[
            styles.messageBubble,
            isMyMessage ? styles.myBubble : styles.otherBubble
          ]}>
            <Text style={[
              styles.messageText,
              isMyMessage ? styles.myMessageText : styles.otherMessageText
            ]}>
              {item.message}
            </Text>
          </View>
          <Text style={styles.messageTime}>
            {formatTime(item.timestamp)}
            {isMyMessage && item.status === 'seen' && (
              <Text style={styles.messageStatus}> · Seen</Text>
            )}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header - Using same gradient as HomeScreen */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
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
                <Text style={styles.headerStatusText}>Active</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Date Header */}
      <View style={styles.dateHeader}>
        <View style={styles.dateLine} />
        <Text style={styles.dateText}>Today</Text>
        <View style={styles.dateLine} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      {/* Suggested Messages */}
      {showSuggested && (
        <View style={styles.suggestedContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedScroll}
          >
            {suggestedMessages.map((suggestion, index) => (
              <TouchableOpacity
                key={index}
                style={styles.suggestedChip}
                onPress={() => handleSuggestedPress(suggestion)}
              >
                <Text style={styles.suggestedText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Cancel Button */}
      <TouchableOpacity style={styles.cancelButton}>
        <Text style={styles.cancelButtonText}>Cancel</Text>
      </TouchableOpacity>

      {/* Input Bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Enter your message"
              placeholderTextColor="#9CA3AF"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
          </View>
          
          <TouchableOpacity 
            style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!messageText.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={messageText.trim() ? ['#667eea', '#764ba2'] : ['#D1D5DB', '#D1D5DB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendGradient}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
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
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 12,
    fontWeight: '500',
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageWrapper: {
    marginBottom: 16,
  },
  myMessageWrapper: {
    alignItems: 'flex-end',
  },
  otherMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubbleContainer: {
    maxWidth: '85%',
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
  messageTime: {
    fontSize: 11,
    marginTop: 4,
    marginHorizontal: 8,
    color: '#9CA3AF',
  },
  messageStatus: {
    fontSize: 11,
    color: '#9CA3AF',
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
  suggestedText: {
    fontSize: 14,
    color: '#374151',
  },
  cancelButton: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 12,
  },
  cancelButtonText: {
    fontSize: 15,
    color: '#EF4444',
    fontWeight: '500',
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
  inputWrapper: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
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
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});