// pages/IT22129376/services/providerAuthStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdFromJwt, getRoleFromJwt } from '../utils/jwtHelpers';

export const AUTH_KEYS = [
  'userToken',
  'token',
  'authToken',
  'accessToken',

  'userId',
  'providerId',
  'seekerId',

  'userRole',
  'role',

  'user',
  'currentUser',
  'provider',
  'seeker',
];

export const clearAllAuthStorage = async () => {
  try {
    await AsyncStorage.multiRemove(AUTH_KEYS);
    console.log('LOGOUT: all auth keys cleared');
  } catch (error) {
    console.warn('Error clearing auth storage:', error?.message);
  }
};

export const saveProviderLogin = async ({ token, user, role }) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid token is required to save provider login.');
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const safeUser = user || {};

  const jwtUserId = getUserIdFromJwt(cleanToken);
  const jwtRole = getRoleFromJwt(cleanToken);

  const providerId =
    safeUser?._id ||
    safeUser?.id ||
    safeUser?.userId ||
    safeUser?.providerId ||
    jwtUserId ||
    null;

  const finalRole =
    safeUser?.role ||
    role ||
    jwtRole ||
    'ServiceProvider';

  if (!providerId) {
    console.log('SAVE PROVIDER LOGIN FAILED USER:', safeUser);
    throw new Error('Provider ID could not be resolved from login response.');
  }

  // Clear all old keys before saving new provider session
  await clearAllAuthStorage();

  const entries = [
    ['userToken', cleanToken],
    ['token', cleanToken],
    ['accessToken', cleanToken],

    ['userId', String(providerId)],
    ['providerId', String(providerId)],

    ['userRole', String(finalRole)],
    ['role', String(finalRole)],

    ['user', JSON.stringify(safeUser)],
    ['currentUser', JSON.stringify(safeUser)],
    ['provider', JSON.stringify(safeUser)],
  ];

  if (String(finalRole).toLowerCase().includes('seeker')) {
    entries.push(['seekerId', String(providerId)]);
  }

  await AsyncStorage.multiSet(entries);

  console.log('LOGIN SAVED USER ID:', providerId);
  console.log('LOGIN SAVED ROLE:', finalRole);

  return {
    token: cleanToken,
    providerId: String(providerId),
    userId: String(providerId),
    role: finalRole,
    user: safeUser,
  };
};

export const getStoredProviderAuth = async () => {
  const token =
    (await AsyncStorage.getItem('userToken')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('authToken'));

  const storedProviderId = await AsyncStorage.getItem('providerId');
  const storedUserId = await AsyncStorage.getItem('userId');

  const storedRole =
    (await AsyncStorage.getItem('userRole')) ||
    (await AsyncStorage.getItem('role'));

  const storedUserRaw =
    (await AsyncStorage.getItem('user')) ||
    (await AsyncStorage.getItem('provider')) ||
    (await AsyncStorage.getItem('currentUser'));

  let storedUser = {};

  try {
    storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : {};
  } catch (error) {
    storedUser = {};
  }

  const jwtUserId = getUserIdFromJwt(token);
  const jwtRole = getRoleFromJwt(token);

  // Exact resolution order:
  // 1. stored providerId
  // 2. stored userId
  // 3. storedUser._id
  // 4. storedUser.id
  // 5. storedUser.userId
  // 6. storedUser.providerId
  // 7. JWT user id fallback
  const providerId =
    storedProviderId ||
    storedUserId ||
    storedUser?._id ||
    storedUser?.id ||
    storedUser?.userId ||
    storedUser?.providerId ||
    jwtUserId ||
    null;

  const role =
    storedRole ||
    storedUser?.role ||
    jwtRole ||
    'ServiceProvider';

  console.log('STORED PROVIDER AUTH:', {
    providerId,
    role,
    hasToken: Boolean(token),
  });

  return {
    token,
    providerId: providerId ? String(providerId) : null,
    userId: providerId ? String(providerId) : null,
    role,
    user: storedUser,
    isLoggedIn: Boolean(token && providerId),
  };
};

export const buildAuthHeaders = async () => {
  const token =
    (await AsyncStorage.getItem('userToken')) ||
    (await AsyncStorage.getItem('token')) ||
    (await AsyncStorage.getItem('accessToken')) ||
    (await AsyncStorage.getItem('authToken'));

  const cleanToken = token ? token.replace(/^Bearer\s+/i, '').trim() : null;

  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}),
  };
};

export const clearProviderAuth = async () => {
  await clearAllAuthStorage();
};

export default {
  AUTH_KEYS,
  saveProviderLogin,
  getStoredProviderAuth,
  buildAuthHeaders,
  clearProviderAuth,
  clearAllAuthStorage,
};