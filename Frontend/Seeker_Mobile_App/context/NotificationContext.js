import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import Toast from 'react-native-toast-message';
import { AUTH_SERVICE_URL, PROVIDER_SERVICE_URL } from '../config';
import { navigate } from '../utils/navigationService';
import { useAuth } from './AuthContext';
import { getUserIdFromJwt } from '../screens/IT22129376/services/seekerAuthStorage';
import { fetchSeekerWithTimeout as fetch } from '../utils/seekerHttp';
import { mergeSeekerNotifications, notificationKey, seekerNotificationDestination } from '../utils/seekerNotifications';

const NotificationContext = createContext();
export const useNotification = () => useContext(NotificationContext);
const ORIGIN = AUTH_SERVICE_URL || 'https://r26-auth-service.onrender.com';
const INBOX = `${ORIGIN}/seeker/notifications`;
const QUOTES = `${PROVIDER_SERVICE_URL}/api/provider/quotations/seeker/me`;

export const NotificationProvider = ({ children }) => {
  const { user, isReady } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [socket, setSocket] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const sources = useRef({ auth: [], quotes: [] });
  const identity = useRef({ token: null, owner: null });
  const seen = useRef(new Set());
  const read = useRef(new Set());
  const hidden = useRef(new Set());
  // Each source gets its own silent first snapshot. Live delivery never depends on the phone clock.
  const hydratedSources = useRef(new Set());
  const revision = useRef(0);
  const pending = useRef(null);
  const readNotification = useRef(() => {});
  const storageKey = name => `seeker_notifications:${identity.current.owner}:${name}`;
  const publish = useCallback(() => {
    setNotifications(mergeSeekerNotifications(sources.current.auth, sources.current.quotes, read.current, hidden.current));
  }, []);

  const showPopupNotification = useCallback(({ type = 'info', title, message, data = {}, actionText, onPress }) => {
    const toastType = ['quote', 'bid', 'booking', 'message', 'high_demand_alert', 'popupSuccess', 'popupError', 'popupInfo'].includes(type) ? type : 'popupInfo';
    Toast.show({ type: toastType, text1: title || 'Notification', text2: message || '', position: 'top', visibilityTime: 5000, autoHide: true, topOffset: 45,
      props: { actionText: actionText || 'View details', data },
      onPress: () => { if (data._id) readNotification.current(data._id); if (onPress) return onPress(); const target = seekerNotificationDestination({ ...data, type: data.type || type }); navigate(target.name, target.params); },
    });
  }, []);

  const syncNotifications = useCallback(async (notifyNew = false) => {
    const token = identity.current.token;
    if (!token) return false;
    if (pending.current) return pending.current;
    const version = revision.current;
    const task = (async () => {
      const headers = { Authorization: `Bearer ${token}` };
      const results = await Promise.allSettled([fetch(INBOX, { headers }), fetch(QUOTES, { headers })].map(async promise => {
        const response = await promise;
        const data = await response.json();
        if (!response.ok) throw new Error('Unable to refresh notifications.');
        return data;
      }));
      if (version !== revision.current || token !== identity.current.token) return false;
      let failures = 0;
      const eligibleKeys = new Set();
      const auth = results[0], quotes = results[1];
      if (auth.status === 'fulfilled' && (Array.isArray(auth.value) || Array.isArray(auth.value?.data))) sources.current.auth = Array.isArray(auth.value) ? auth.value : auth.value.data;
      else failures++;
      if (quotes.status === 'fulfilled' && Array.isArray(quotes.value?.data)) sources.current.quotes = quotes.value.data.map(quote => ({
        _id: `quote_${quote._id}`, type: 'quote', title: `New Quotation: LKR ${quote.price}`, message: quote.notes || `Duration: ${quote.durationText || 'Not provided'}`,
        createdAt: quote.createdAt, isRead: false, quoteId: quote._id, providerRequestId: quote.providerRequestId, providerId: quote.providerId?._id || quote.providerId, status: quote.status,
      }));
      else failures++;
      for (const [name, result] of [['auth', auth], ['quotes', quotes]]) {
        const valid = name === 'auth'
          ? result.status === 'fulfilled' && (Array.isArray(result.value) || Array.isArray(result.value?.data))
          : result.status === 'fulfilled' && Array.isArray(result.value?.data);
        if (!valid) continue;
        if (hydratedSources.current.has(name)) {
          for (const item of sources.current[name]) eligibleKeys.add(notificationKey(item));
        }
        hydratedSources.current.add(name);
      }
      const all = mergeSeekerNotifications(sources.current.auth, sources.current.quotes, read.current, hidden.current);
      for (const item of all) {
        const key = notificationKey(item);
        if (!seen.current.has(key) && notifyNew && eligibleKeys.has(key) && !item.isRead) showPopupNotification({ type: item.type, title: item.title, message: item.message, data: item });
        seen.current.add(key);
      }
      setNotifications(all);
      setInitialLoading(false);
      setSyncError(failures ? 'Some notifications could not be refreshed. Showing the latest available information.' : null);
      await AsyncStorage.setItem(storageKey('seen'), JSON.stringify([...seen.current].slice(-300)));
      return failures === 0;
    })();
    pending.current = task;
    try { return await task; } catch { if (version === revision.current) { setInitialLoading(false); setSyncError('Unable to refresh notifications. Pull down to retry.'); } return false; }
    finally { if (pending.current === task) pending.current = null; }
  }, [showPopupNotification]);

  useEffect(() => {
    let disposed = false, connection = null, currentToken = null;
    const reset = () => {
      revision.current++; pending.current = null;
      identity.current = { token: null, owner: null };
      sources.current = { auth: [], quotes: [] }; seen.current = new Set(); read.current = new Set(); hidden.current = new Set(); hydratedSources.current = new Set();
      setNotifications([]); setSocket(null); setSyncError(null); setConnectionError(null); setInitialLoading(true);
    };
    reset();
    if (!isReady) return;
    const setup = async () => {
      const token = await AsyncStorage.getItem('userToken');
      if (disposed) return;
      if (token === currentToken) { if (!token) setInitialLoading(false); return; }
      currentToken = token; connection?.disconnect(); reset();
      if (!token) { setInitialLoading(false); return; }
      const owner = getUserIdFromJwt(token);
      if (!owner) { setInitialLoading(false); return; }
      const values = await AsyncStorage.multiGet(['seen', 'read', 'hidden'].map(name => `seeker_notifications:${owner}:${name}`));
      if (disposed || currentToken !== token) return;
      const parse = value => { try { return JSON.parse(value || '[]'); } catch { return []; } };
      const legacyRead = values[1][1] === null ? await AsyncStorage.getItem('readQuotes') : null;
      if (disposed || currentToken !== token) return;
      seen.current = new Set(parse(values[0][1])); read.current = new Set(parse(values[1][1] || legacyRead)); hidden.current = new Set(parse(values[2][1]));
      identity.current = { token, owner };
      connection = io(ORIGIN, { transports: ['polling', 'websocket'], tryAllTransports: true, auth: { token } });
      connection.on('connect', () => {
        if (disposed || token !== identity.current.token) return;
        setConnectionError(null);
        syncNotifications(true);
      });
      connection.on('connect_error', error => {
        if (disposed || token !== identity.current.token) return;
        setConnectionError(error.message === 'Authentication required'
          ? 'Live notifications could not authenticate. Please sign in again.'
          : 'Live notifications are disconnected. Check that the local auth service is reachable on port 4003.');
      });
      connection.on('disconnect', () => {
        if (!disposed && token === identity.current.token) setConnectionError('Live notifications are reconnecting.');
      });
      connection.on('notification', item => {
        if (disposed || token !== identity.current.token || !item?._id) return;
        const key = notificationKey(item), fresh = !seen.current.has(key);
        seen.current.add(key);
        sources.current.auth = [item, ...sources.current.auth.filter(row => String(row._id) !== String(item._id))];
        revision.current++; pending.current = null; publish();
        if (fresh && !item.isRead) showPopupNotification({ type: item.type, title: item.title, message: item.message, data: item });
        AsyncStorage.setItem(storageKey('seen'), JSON.stringify([...seen.current].slice(-300))).catch(() => {});
        syncNotifications(true);
      });
      setSocket(connection);
      await syncNotifications(false);
    };
    setup().catch(() => { if (!disposed) { setInitialLoading(false); setSyncError('Unable to connect to notifications.'); } });
    const timer = setInterval(async () => { try { await setup(); if (!disposed) await syncNotifications(true); } catch { /* Keep previously loaded inbox. */ } }, 15000);
    return () => { disposed = true; clearInterval(timer); connection?.disconnect(); reset(); };
  }, [user?.id, user?._id, isReady, syncNotifications, showPopupNotification, publish]);

  const mutate = async (suffix, method) => {
    const token = identity.current.token;
    if (!token) throw new Error('Please sign in again.');
    const response = await fetch(`${INBOX}${suffix}`, { method, headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) throw new Error('Unable to update notifications. Please retry.');
    if (token !== identity.current.token) throw new Error('Your account changed. Please refresh.');
    revision.current++; pending.current = null;
  };
  const markAsRead = async id => {
    if (!identity.current.token) return false;
    try {
      if (!String(id).startsWith('quote_')) await mutate(`/${id}/read`, 'PATCH');
      const next = new Set(read.current); next.add(String(id));
      const item = notifications.find(n => String(n._id) === String(id));
      const quoteId = item?.quoteId || item?.metadata?.quotationId;
      if (quoteId) next.add(`quote_${quoteId}`);
      await AsyncStorage.setItem(storageKey('read'), JSON.stringify([...next]));
      read.current = next; publish(); return true;
    } catch { return false; }
  };
  readNotification.current = markAsRead;
  const markAllAsRead = async () => {
    try {
      await mutate('/read-all', 'PATCH');
      const next = new Set([...read.current, ...notifications.map(n => String(n._id)), ...notifications.map(n => n.quoteId || n.metadata?.quotationId).filter(Boolean).map(id => `quote_${id}`)]);
      await AsyncStorage.setItem(storageKey('read'), JSON.stringify([...next]));
      read.current = next; publish(); return true;
    } catch { return false; }
  };
  const clearNotifications = async () => {
    try {
      await mutate('', 'DELETE');
      const next = new Set([...hidden.current, ...sources.current.quotes.map(n => String(n._id)), ...notifications.map(n => n.quoteId || n.metadata?.quotationId).filter(Boolean).map(id => `quote_${id}`)]);
      await AsyncStorage.setItem(storageKey('hidden'), JSON.stringify([...next]));
      hidden.current = next; sources.current = { auth: [], quotes: [] }; publish(); return true;
    } catch { return false; }
  };
  return <NotificationContext.Provider value={{ notifications, loading: initialLoading, unreadCount: notifications.filter(n => !n.isRead).length, syncError: connectionError || syncError, socket, showPopupNotification, syncNotifications, markAsRead, markAllAsRead, clearNotifications }}>{children}</NotificationContext.Provider>;
};
