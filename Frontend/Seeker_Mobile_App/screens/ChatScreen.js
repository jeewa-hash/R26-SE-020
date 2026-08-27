// screens/ChatScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, StatusBar, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function ChatScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();
  const { 
    chatId, 
    userId, 
    userName, 
    userAvatar, 
    userRole 
  } = route.params;

  const { messages, sendMessage, currentUserId, markAsRead } = useChat();
  const flatListRef = useRef();
  const [messageText, setMessageText] = useState('');
  const [chatMessages, setChatMessages] = useState([]);

  // Load message history
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

  // Listen for new messages from context for this chat
  useEffect(() => {
    const newMessages = messages[chatId] || [];
    if (newMessages.length > 0) {
      setChatMessages(prev => {
        const existingIds = new Set(prev.map(m => m._id));
        const newOnes = newMessages.filter(m => !existingIds.has(m._id));
        return [...prev, ...newOnes];
      });
    }
  }, [messages[chatId]]);

  // Mark chat as read when screen opens
  useEffect(() => {
    if (chatId) {
      markAsRead(chatId);
    }
  }, [chatId]);

  const handleSendMessage = () => {
    if (messageText.trim() && chatId) {
      sendMessage(userId, messageText.trim(), chatId);
      setMessageText('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }) => {
    const isMyMessage = item.senderId === currentUserId;
    return (
      <View style={[styles.messageWrapper, isMyMessage ? styles.myMessageWrapper : styles.otherMessageWrapper]}>
        {!isMyMessage && <Image source={{ uri: userAvatar }} style={styles.messageAvatar} />}
        <View style={[styles.messageBubble, isMyMessage ? styles.myBubble : styles.otherBubble, isDarkMode && !isMyMessage && styles.otherBubbleDark]}>
          <Text style={[styles.messageText, isMyMessage ? styles.myMessageText : styles.otherMessageText, isDarkMode && !isMyMessage && styles.otherMessageTextDark]}>
            {item.text}
          </Text>
        </View>
        <Text style={[styles.messageTime, isDarkMode && styles.textMutedDark]}>
          {formatTime(item.createdAt || item.timestamp)}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} />
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
            <Image source={{ uri: userAvatar }} style={styles.headerAvatar} />
            <View style={styles.headerInfo}>
              <Text style={styles.headerName}>{userName}</Text>
              <Text style={styles.headerRole}>{userRole}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.messagesContainer}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        showsVerticalScrollIndicator={false}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={[styles.inputContainer, isDarkMode && styles.inputContainerDark]}>
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
            <TouchableOpacity style={styles.sendButton} onPress={handleSendMessage} activeOpacity={0.8}>
              <LinearGradient colors={['#667eea', '#764ba2']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sendGradient}>
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

// (Keep your existing styles unchanged – omitted for brevity)
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#1a1a2e' },
  headerGradient: { borderBottomLeftRadius: 25, borderBottomRightRadius: 25, paddingTop: Platform.OS === 'ios' ? 45 : 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  backButton: { padding: 4 },
  headerContent: { flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: 8 },
  headerAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: '#fff', marginRight: 12 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerRole: { fontSize: 12, color: '#ffffffCC', fontWeight: '500' },
  menuButton: { padding: 8 },
  messagesContainer: { paddingHorizontal: 16, paddingVertical: 8, paddingBottom: 20 },
  messageWrapper: { marginBottom: 20, flexDirection: 'row' },
  myMessageWrapper: { justifyContent: 'flex-end' },
  otherMessageWrapper: { justifyContent: 'flex-start' },
  messageAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8, alignSelf: 'flex-end', marginBottom: 20 },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, maxWidth: '75%' },
  myBubble: { backgroundColor: '#667eea', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  otherBubbleDark: { backgroundColor: '#16213e' },
  messageText: { fontSize: 15, lineHeight: 20 },
  myMessageText: { color: '#fff' },
  otherMessageText: { color: '#1F2937' },
  otherMessageTextDark: { color: '#fff' },
  messageTime: { fontSize: 11, color: '#9CA3AF', marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', gap: 12 },
  inputContainerDark: { backgroundColor: '#16213e', borderTopColor: '#2d3561' },
  inputWrapper: { flex: 1, backgroundColor: '#F3F4F6', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100 },
  inputWrapperDark: { backgroundColor: '#1a1a2e' },
  messageInput: { fontSize: 15, color: '#1F2937', padding: 0, maxHeight: 80 },
  sendButton: { borderRadius: 28, overflow: 'hidden' },
  sendGradient: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  voiceButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#667eea15', alignItems: 'center', justifyContent: 'center' },
  textDark: { color: '#fff' },
  textMutedDark: { color: '#9CA3AF' },
});