// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL, SOCKET_URL } from '../config';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState({}); // { chatId: [messages] }
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState({});
  const [currentUserId, setCurrentUserId] = useState(null);
  const [chats, setChats] = useState([]);

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

      newSocket.on('receiveMessage', (savedMessage) => {
        const { chatId, senderId } = savedMessage;
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
      });

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
      return res.data._id; // chatId
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

    // Optimistic update
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
    }}>
      {children}
    </ChatContext.Provider>
  );
};