// context/ChatContext.js
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [messages, setMessages] = useState({});
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCount, setUnreadCount] = useState({});

  useEffect(() => {
    const initSocket = async () => {
      const userId = await AsyncStorage.getItem('userId');
      const newSocket = io('http://10.0.2.2:5003', {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        newSocket.emit('user-online', userId);
      });

      newSocket.on('receive-message', (data) => {
        setMessages(prev => ({
          ...prev,
          [data.senderId]: [...(prev[data.senderId] || []), data]
        }));
        
        setUnreadCount(prev => ({
          ...prev,
          [data.senderId]: (prev[data.senderId] || 0) + 1
        }));
      });

      newSocket.on('user-typing', (data) => {
        setTypingUsers(prev => ({ ...prev, [data.userId]: data.isTyping }));
        setTimeout(() => {
          setTypingUsers(prev => ({ ...prev, [data.userId]: false }));
        }, 1500);
      });

      newSocket.on('online-users', (users) => {
        setOnlineUsers(users);
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    };

    initSocket();
  }, []);

  const sendMessage = (receiverId, message, receiverName) => {
    if (socket && message.trim()) {
      const messageData = {
        senderId: currentUserId,
        receiverId,
        message,
        timestamp: new Date().toISOString(),
        receiverName,
      };
      socket.emit('send-message', messageData);
      setMessages(prev => ({
        ...prev,
        [receiverId]: [...(prev[receiverId] || []), messageData]
      }));
    }
  };

  const sendTyping = (receiverId, isTyping) => {
    if (socket) {
      socket.emit('typing', { receiverId, isTyping });
    }
  };

  const markAsRead = (senderId) => {
    setUnreadCount(prev => ({ ...prev, [senderId]: 0 }));
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
    }}>
      {children}
    </ChatContext.Provider>
  );
};