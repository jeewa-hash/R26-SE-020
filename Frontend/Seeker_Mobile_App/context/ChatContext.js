// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, SOCKET_URL } from '../config';
import Toast from 'react-native-toast-message';
import { navigate } from '../utils/navigationService';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);

  useEffect(() => {
    const initSocket = async () => {
      const userId = await AsyncStorage.getItem('userId');
      setCurrentUserId(userId);

      const newSocket = io(SOCKET_URL, { transports: ['websocket'] });

      newSocket.on('connect', () => {
        console.log('✅ Socket connected');
        if (userId) {
          newSocket.emit('addUser', userId);
        }
      });

      // Receive message
      newSocket.on('receiveMessage', (savedMessage) => {
        const { chatId, senderId, text, senderName } = savedMessage;

        setMessages(prev => ({
          ...prev,
          [chatId]: [...(prev[chatId] || []), savedMessage]
        }));

        if (senderId !== currentUserId) {
          setUnreadCount(prev => ({
            ...prev,
            [chatId]: (prev[chatId] || 0) + 1
          }));
        }

        // ─── SHOW TOAST if not in this chat ──────────────────
        if (chatId !== currentChatId) {
          Toast.show({
            type: 'message',
            text1: senderName || 'New Message',
            text2: text?.substring(0, 75) || 'You received a new message',
            visibilityTime: 4500,
            position: 'top',
            topOffset: 45,
            props: {
              badge: 'Chat Message',
              actionText: 'Reply now',
            },
            onPress: () => {
              navigate('ChatScreen', { chatId });
            },
          });
        }
      });

      // Typing and online users (keep as they are)
      newSocket.on('user-typing', (data) => {
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.isTyping }));
        setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [data.userId]: false }));
        }, 1500);
      });

      newSocket.on('getUsers', (users) => {
        setOnlineUsers(users);
      });

      setSocket(newSocket);

      if (userId) {
        fetchChats(userId);
      }

      return () => {
        newSocket.disconnect();
      };
    };

    initSocket();
  }, []);

  const fetchChats = async (userId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/chat/${userId}`);
      setChats(res.data);
    } catch (error) {
      console.error('Error fetching chats:', error);
    }
  };

  const createOrGetChat = async (senderId, receiverId) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/chat`, { senderId, receiverId });
      return res.data._id;
    } catch (error) {
      console.error('Error creating chat:', error);
      return null;
    }
  };

  const sendMessage = (receiverId, text, chatId) => {
    if (!socket || !currentUserId || !text.trim() || !chatId) return;

    const messageData = {
      senderId: currentUserId,
      receiverId,
      text,
      chatId,
    };

    socket.emit('sendMessage', messageData);

    setMessages(prev => ({
      ...prev,
      [chatId]: [...(prev[chatId] || []), { ...messageData, _id: Date.now().toString() }]
    }));
  };

  const sendTyping = (receiverId, isTyping) => {
    if (socket) {
      socket.emit('typing', { receiverId, isTyping });
    }
  };

  const markAsRead = (chatId) => {
    setUnreadCount(prev => ({ ...prev, [chatId]: 0 }));
  };

  // ─── Expose setActiveChat ──────────────────────────────────
  const setActiveChat = (chatId) => {
    setCurrentChatId(chatId);
  };

  return (
    <ChatContext.Provider value={{
      socket,
      messages,
      sendMessage,
      sendTyping,
      onlineUsers,
      typingUsers,
      unreadCount,
      markAsRead,
      chats,
      fetchChats,
      createOrGetChat,
      currentUserId,
      setActiveChat,  // ← new
    }}>
      {children}
    </ChatContext.Provider>
  );
};