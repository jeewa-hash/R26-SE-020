// context/NotificationContext.js
import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import Toast from 'react-native-toast-message';
import { IP_ADDRESS } from '../config';
import { navigate } from '../utils/navigationService';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

const NOTIFICATION_SOCKET_URL = `http://${IP_ADDRESS}:3002`;
const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:3002`;
const QUOTATIONS_URL = `${PROVIDER_SERVICE_URL}/api/provider/quotations/seeker/me`;
const AUTH_NOTIFICATIONS_URL = `http://${IP_ADDRESS}:4003/seeker/notifications`;
const SEEN_NOTIFS_STORAGE_KEY = 'seeker_seen_notification_ids';
const READ_QUOTES_KEY = 'readQuotes';

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const seenNotifsRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  // ─────────────────────────────────────────────────────────────
  // Load seen notification IDs from AsyncStorage
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const loadSeenIds = async () => {
      try {
        const stored = await AsyncStorage.getItem(SEEN_NOTIFS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            seenNotifsRef.current = new Set(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to load seen notification IDs:', err);
      }
    };
    loadSeenIds();
  }, []);

  const saveSeenIds = async () => {
    try {
      const arr = Array.from(seenNotifsRef.current).slice(-200); // keep last 200 IDs
      await AsyncStorage.setItem(SEEN_NOTIFS_STORAGE_KEY, JSON.stringify(arr));
    } catch (err) {
      console.warn('Failed to save seen notification IDs:', err);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Show in-app Pop-up Notification (Toast Banner)
  // ─────────────────────────────────────────────────────────────
  const showPopupNotification = useCallback(({
    type = 'info',
    title,
    message,
    data = {},
    actionText,
    onPress,
  }) => {
    // Map to valid toast type
    const toastType = ['quote', 'bid', 'booking', 'message', 'high_demand_alert', 'popupSuccess', 'popupError', 'popupInfo'].includes(type)
      ? type
      : 'popupInfo';

    const defaultPressHandler = () => {
      if (onPress) {
        onPress();
        return;
      }

      // Default navigation mappings
      if (type === 'quote' || data?.type === 'quote' || data?.type === 'NEW_QUOTATION') {
        const reqId = data?.providerRequestId || data?.metadata?.providerRequestId || data?.requestId;
        if (reqId) {
          navigate('RequestQuotationDetails', {
            requestId: reqId,
            providerId: data?.providerId || data?.metadata?.providerId,
          });
        } else {
          navigate('NotificationScreen');
        }
      } else if (type === 'bid' || data?.type === 'bid') {
        navigate('BiddingScreen', { postId: data?.postId });
      } else if (type === 'booking' || data?.type === 'booking') {
        navigate('BookingsScreen');
      } else if (type === 'message' || data?.type === 'message') {
        if (data?.chatId) {
          navigate('ChatScreen', { chatId: data.chatId });
        } else {
          navigate('ChatListScreen');
        }
      } else if (type === 'high_demand_alert') {
        navigate('SeasonalDemandsScreen');
      } else {
        navigate('NotificationScreen');
      }
    };

    Toast.show({
      type: toastType,
      text1: title || 'Notification',
      text2: message || '',
      position: 'top',
      visibilityTime: 5000,
      autoHide: true,
      topOffset: 45,
      props: {
        actionText: actionText || 'View details',
        data,
      },
      onPress: defaultPressHandler,
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Fetch & synchronize quotations & notifications
  // ─────────────────────────────────────────────────────────────
  const syncNotifications = useCallback(async (notifyNew = false) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      let quoteNotifs = [];
      let authNotifs = [];
      const savedReadQuoteIds = await AsyncStorage.getItem(READ_QUOTES_KEY);
      const readQuoteIds = new Set(savedReadQuoteIds ? JSON.parse(savedReadQuoteIds) : []);

      // 1. Fetch quotations
      try {
        const quoteRes = await fetch(QUOTATIONS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const quoteData = await quoteRes.json();
        if (quoteData.success && Array.isArray(quoteData.data)) {
          quoteNotifs = quoteData.data.map((quote) => {
            const id = `quote_${quote._id}`;
            return {
              _id: id,
              type: 'quote',
              title: `New Quotation: LKR ${quote.price}`,
              message: quote.notes || `Duration: ${quote.durationText || '1 day'}`,
              createdAt: quote.createdAt,
              isRead: readQuoteIds.has(id),
              quoteId: quote._id,
              providerRequestId: quote.providerRequestId,
              providerId: quote.providerId?._id || quote.providerId,
              providerName: quote.providerId?.name || 'Service Provider',
              price: quote.price,
              duration: quote.durationText,
              status: quote.status,
            };
          });
        }
      } catch (err) {
        // quiet fail for offline/microservice down
      }

      // 2. Fetch auth notifications
      try {
        const authRes = await fetch(AUTH_NOTIFICATIONS_URL, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (authRes.ok) {
          const authData = await authRes.json();
          authNotifs = Array.isArray(authData) ? authData : (authData.data || []);
        }
      } catch (err) {
        // quiet fail
      }

      const all = [...quoteNotifs, ...authNotifs].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      // Check for new items to trigger popup notification
      if (notifyNew && !initialLoadRef.current) {
        for (const item of all) {
          if (!seenNotifsRef.current.has(item._id)) {
            seenNotifsRef.current.add(item._id);
            // Trigger pop up notification
            showPopupNotification({
              type: item.type,
              title: item.title,
              message: item.message,
              data: item,
            });
          }
        }
        saveSeenIds();
      } else if (initialLoadRef.current) {
        // Mark all existing as seen so we don't spam popups on cold app startup
        all.forEach((item) => seenNotifsRef.current.add(item._id));
        saveSeenIds();
        initialLoadRef.current = false;
      }

      setNotifications(all);
      setUnreadCount(all.filter((n) => !n.isRead).length);
    } catch (err) {
      console.warn('Error syncing notifications:', err);
    }
  }, [showPopupNotification]);

  // ─────────────────────────────────────────────────────────────
  // Connect to Real-time Notification Socket
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let activeSocket = null;

    const setupSocket = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        activeSocket = io(NOTIFICATION_SOCKET_URL, {
          transports: ['websocket'],
          auth: { token },
        });

        activeSocket.on('connect', () => {
          console.log('✅ Notification socket connected');
        });

        // Real-time notification event handler
        activeSocket.on('notification', (notif) => {
          console.log('🔔 Real-time notification received:', notif);

          const notifId = notif._id || `socket_${Date.now()}`;
          seenNotifsRef.current.add(notifId);
          saveSeenIds();

          // Standardize payload
          let type = 'info';
          if (notif.type === 'NEW_QUOTATION' || notif.type === 'quote') type = 'quote';
          else if (notif.type === 'bid') type = 'bid';
          else if (notif.type === 'booking') type = 'booking';
          else if (notif.type === 'message') type = 'message';

          showPopupNotification({
            type,
            title: notif.title || 'New Notification',
            message: notif.message || '',
            data: notif,
          });

          // Sync full list
          syncNotifications(false);
        });

        setSocket(activeSocket);
      } catch (e) {
        console.warn('Socket setup error:', e);
      }
    };

    setupSocket();
    syncNotifications(false);

    // Periodic polling backup (every 15s)
    const interval = setInterval(() => {
      syncNotifications(true);
    }, 15000);

    return () => {
      clearInterval(interval);
      if (activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [syncNotifications, showPopupNotification]);

  // ─────────────────────────────────────────────────────────────
  // Manual helpers
  // ─────────────────────────────────────────────────────────────
  const markAsRead = async (id) => {
    if (String(id).startsWith('quote_')) {
      try {
        const savedReadQuoteIds = await AsyncStorage.getItem(READ_QUOTES_KEY);
        const readQuoteIds = savedReadQuoteIds ? JSON.parse(savedReadQuoteIds) : [];
        if (!readQuoteIds.includes(id)) {
          await AsyncStorage.setItem(READ_QUOTES_KEY, JSON.stringify([...readQuoteIds, id]));
        }
      } catch (err) {
        console.warn('Failed to save read quote ID:', err);
      }
    }

    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => {
      const notification = notifications.find((item) => item._id === id);
      return notification?.isRead ? prev : Math.max(0, prev - 1);
    });
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        showPopupNotification,
        syncNotifications,
        markAsRead,
        markAllAsRead,
        socket,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
