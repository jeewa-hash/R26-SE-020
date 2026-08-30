// pages/IT22129376/services/providerAuthStorage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  token: 'userToken',
  userId: 'userId',
  userRole: 'userRole',
  user: 'user',
};

const decodeBase64Url = (base64Url) => {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    if (typeof atob === 'function') return atob(base64);
    return '';
  } catch (error) {
    return '';
  }
};

export const decodeJwtPayload = (token) => {
  try {
    if (!token || typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = decodeBase64Url(parts[1]);
    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
};

export const getUserIdFromJwt = (token) => {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return (
    payload?.user?._id?.$oid ||
    payload?.user?._id ||
    payload?.user?.id ||
    payload?.userId ||
    payload?.providerId ||
    payload?.id ||
    payload?._id?.$oid ||
    payload?._id ||
    payload?.sub ||
    null
  );
};

export const getStoredProviderAuth = async () => {
  try {
    const [token, storedUserId, userRole, userText] = await Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.token),
      AsyncStorage.getItem(STORAGE_KEYS.userId),
      AsyncStorage.getItem(STORAGE_KEYS.userRole),
      AsyncStorage.getItem(STORAGE_KEYS.user),
    ]);

    let user = null;
    try {
      user = userText ? JSON.parse(userText) : null;
    } catch (error) {
      user = null;
    }

    const jwtUserId = getUserIdFromJwt(token);
    const providerId =
      storedUserId ||
      user?._id ||
      user?.id ||
      user?.userId ||
      user?.providerId ||
      jwtUserId ||
      null;

    if (providerId && !storedUserId) {
      await AsyncStorage.setItem(STORAGE_KEYS.userId, String(providerId));
    }

    return {
      token,
      providerId,
      userRole,
      user,
      isLoggedIn: Boolean(token && providerId),
    };
  } catch (error) {
    console.log('Provider auth read error:', error);
    return { token: null, providerId: null, userRole: null, user: null, isLoggedIn: false };
  }
};

export const requireProviderAuth = async () => {
  const auth = await getStoredProviderAuth();
  if (!auth.isLoggedIn) throw new Error('Provider login details were not found. Please login again.');
  return auth;
};

export const buildAuthHeaders = async () => {
  const { token } = await getStoredProviderAuth();
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

export default {
  decodeJwtPayload,
  getUserIdFromJwt,
  getStoredProviderAuth,
  requireProviderAuth,
  buildAuthHeaders,
};
