import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator 
} from 'react-native';
import { Text, Avatar, IconButton, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { io } from "socket.io-client";
import { CONFIG } from '../config';

export default function ChatScreen({ route, navigation }) {
  const theme = useTheme();
  const isDark = theme.dark;
  const insets = useSafeAreaInsets(); // 1. Access dynamic screen padding

  const { chatId: initialChatId, receiverId, customer } = route?.params || {};

  const [currentUserId, setCurrentUserId] = useState(null);
  const [activeChatId, setActiveChatId] = useState(initialChatId || null);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef(null);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const initializeChat = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (!storedUserId) {
          setLoading(false);
          return;
        }
        setCurrentUserId(storedUserId);

        socketRef.current = io(CONFIG.SEEKER_SERVICE_URL);
        socketRef.current.emit('addUser', storedUserId);

        socketRef.current.on('getMessage', (data) => {
          setMessages((prev) => {
            if (prev.some((msg) => msg._id === data._id || msg.tempId === data.tempId)) {
              return prev;
            }
            return [
              ...prev,
              {
                _id: data._id || Date.now().toString(),
                chatId: data.chatId,
                senderId: data.senderId,
                text: data.text,
                createdAt: data.createdAt || new Date().toISOString(),
              },
            ];
          });
        });

        let currentChatId = activeChatId;

        if (!currentChatId && receiverId) {
          const chatRes = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              senderId: storedUserId,
              receiverId: receiverId,
            }),
          });

          if (chatRes.ok) {
            const chatData = await chatRes.json();
            currentChatId = chatData._id;
            setActiveChatId(currentChatId);
          }
        }

        if (currentChatId) {
          const msgRes = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat/message/${currentChatId}`);
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            if (Array.isArray(msgData)) {
              setMessages(msgData);
            }
          }
        }
      } catch (error) {
        console.error('Error initializing chat:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeChat();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [receiverId]);

  const sendMessage = async () => {
    const messageText = inputText.trim();
    if (!messageText || !currentUserId) return;

    let targetChatId = activeChatId;

    try {
      if (!targetChatId && receiverId) {
        const createChatRes = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            receiverId: receiverId,
          }),
        });

        if (createChatRes.ok) {
          const newChat = await createChatRes.json();
          targetChatId = newChat._id;
          setActiveChatId(targetChatId);
        } else {
          return;
        }
      }

      setInputText('');

      const tempId = Date.now().toString();
      const tempMessage = {
        _id: tempId,
        tempId: tempId,
        chatId: targetChatId,
        senderId: currentUserId,
        text: messageText,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempMessage]);

      if (socketRef.current) {
        socketRef.current.emit('sendMessage', {
          chatId: targetChatId,
          senderId: currentUserId,
          receiverId: receiverId,
          text: messageText,
          tempId: tempId,
        });
      }

      const res = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          senderId: currentUserId,
          text: messageText,
        }),
      });

      if (res.ok) {
        const savedMessage = await res.json();
        setMessages((prev) =>
          prev.map((msg) => (msg.tempId === tempId ? savedMessage : msg))
        );
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#F9FAFB' }]}>
      {/* Header with Top Safe Area */}
      <View 
        style={[
          styles.chatHeader, 
          { 
            backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
            borderBottomColor: isDark ? '#374151' : '#E5E7EB',
            paddingTop: Math.max(insets.top, 20) + 10 // Dynamic top bar clearance
          }
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons 
            name="arrow-left" 
            size={24} 
            color={isDark ? '#F9FAFB' : '#1F2937'} 
          />
        </TouchableOpacity>

        <Avatar.Text 
          size={40} 
          label={customer ? customer.charAt(0).toUpperCase() : 'C'} 
          style={{ backgroundColor: theme.colors.primary }} 
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={[styles.userName, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
            {customer || 'Customer'}
          </Text>
          <Text style={styles.userStatus}>Online</Text>
        </View>
      </View>

      {/* Keyboard Avoiding View wraps Messages + Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages Body */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : (
          <ScrollView 
            ref={scrollViewRef}
            contentContainerStyle={{ padding: 20 }}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {messages.map((item) => {
              const isMe = item.senderId === currentUserId;
              return (
                <View 
                  key={item._id || item.tempId || Math.random().toString()} 
                  style={[
                    styles.bubble, 
                    isMe 
                      ? [styles.myBubble, { backgroundColor: theme.colors.primary }] 
                      : [styles.theirBubble, { backgroundColor: isDark ? '#374151' : '#E5E7EB' }]
                  ]}
                >
                  <Text style={isMe ? styles.myText : [styles.theirText, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
                    {item.text}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Input Bar with Bottom Safe Area Padding */}
        <View 
          style={[
            styles.inputArea, 
            { 
              backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
              borderTopColor: isDark ? '#374151' : '#EEEEEE',
              paddingBottom: Math.max(insets.bottom, 10) // 2. Lifts box above bottom navbar
            }
          ]}
        >
          <TouchableOpacity style={styles.plusIcon}>
            <MaterialCommunityIcons name="plus" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
          
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
                color: isDark ? '#F9FAFB' : '#111827'
              }
            ]}
            placeholder="Type a message..."
            placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          
          <IconButton 
            icon="send" 
            iconColor={theme.colors.primary} 
            size={26} 
            onPress={sendMessage} 
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  chatHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 15, 
    paddingBottom: 12, 
    borderBottomWidth: 1,
    elevation: 2 
  },
  backButton: { marginRight: 10 },
  userName: { fontWeight: '700', fontSize: 16 },
  userStatus: { fontSize: 12, color: '#10B981' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 18, marginBottom: 10 },
  myBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 2 },
  theirBubble: { alignSelf: 'flex-start', borderBottomLeftRadius: 2 },
  myText: { color: '#FFFFFF', fontSize: 15 },
  theirText: { fontSize: 15 },
  inputArea: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 10, 
    paddingTop: 8, 
    borderTopWidth: 1 
  },
  plusIcon: { paddingHorizontal: 8 },
  input: { 
    flex: 1, 
    borderRadius: 22, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    maxHeight: 100, 
    fontSize: 15 
  },
});