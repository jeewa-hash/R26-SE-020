// pages/IT22129376/services/providerAuthStorage.js

import AsyncStorage from '@react-native-async-storage/async-storage';
import { decodeJwt, getUserIdFromJwt, getRoleFromJwt } from '../utils/jwtHelpers';
import { clearCredentials } from '../../../utils/biometricAuth';

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
  } catch (error) {
    console.log('AsyncStorage clear warning:', error?.message);
  }
  try {
    await clearCredentials();
  } catch (error) {
    console.log('SecureStore clear warning:', error?.message);
  }
  console.log('AUTH CLEAR: all AsyncStorage and SecureStore auth cleared');
};

export const saveProviderLogin = async ({ token, user, role, response }) => {
  if (!token || typeof token !== 'string') {
    throw new Error('Valid token is required to save provider login.');
  }

  const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  const loginResponse = response || {};
  const safeUser = user || loginResponse?.provider || loginResponse?.user || loginResponse?.data?.provider || loginResponse?.data?.user || {};

  const jwtUserId = getUserIdFromJwt(cleanToken);
  const jwtRole = getRoleFromJwt(cleanToken);

  const responseProviderId =
    loginResponse?.provider?._id ||
    loginResponse?.provider?.id ||
    loginResponse?.user?._id ||
    loginResponse?.user?.id ||
    loginResponse?.data?.provider?._id ||
    loginResponse?.data?.provider?.id ||
    loginResponse?.data?.user?._id ||
    loginResponse?.data?.user?.id ||
    loginResponse?.userId ||
    loginResponse?.providerId ||
    loginResponse?.data?.userId ||
    loginResponse?.data?.providerId ||
    loginResponse?._id ||
    loginResponse?.id ||
    safeUser?._id ||
    safeUser?.id;

  const providerId =
    jwtUserId ||
    responseProviderId ||
    null;

  if (jwtUserId && responseProviderId && String(jwtUserId) !== String(responseProviderId)) {
    console.warn('AUTH ID MISMATCH:', { idFromToken: jwtUserId, idFromResponse: responseProviderId });
  }

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

  const normalizedUser = { ...safeUser, _id: String(providerId), id: String(providerId), role: finalRole };
  const entries = [
    ['userToken', cleanToken],
    ['token', cleanToken],
    ['accessToken', cleanToken],

    ['userId', String(providerId)],
    ['providerId', String(providerId)],

    ['userRole', String(finalRole)],
    ['role', String(finalRole)],

    ['user', JSON.stringify(normalizedUser)],
    ['currentUser', JSON.stringify(normalizedUser)],
    ['provider', JSON.stringify(normalizedUser)],
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
    user: normalizedUser,
  };
};

const readStoredObject = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value ? JSON.parse(value) : {};
  } catch (error) {
    return {};
  }
};

export const debugAuthStorage = async () => {
  const values = await AsyncStorage.multiGet(AUTH_KEYS);
  console.log('===== AUTH STORAGE DEBUG =====');
  values.forEach(([key, value]) => console.log(key, value));
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

  const [storedProvider, storedUser, storedCurrentUser] = await Promise.all([
    readStoredObject('provider'),
    readStoredObject('user'),
    readStoredObject('currentUser'),
  ]);

  const decodedToken = decodeJwt(token);
  const tokenIsCurrent = decodedToken && (!decodedToken.exp || decodedToken.exp * 1000 > Date.now());
  const jwtUserId = tokenIsCurrent ? getUserIdFromJwt(token) : null;
  const jwtRole = getRoleFromJwt(token);

  const providerId =
    jwtUserId ||
    storedProviderId ||
    storedUserId ||
    storedProvider?._id ||
    storedProvider?.id ||
    storedUser?._id ||
    storedUser?.id ||
    storedCurrentUser?._id ||
    storedCurrentUser?.id ||
    null;

  if (jwtUserId && (String(storedProviderId || '') !== String(jwtUserId) || String(storedUserId || '') !== String(jwtUserId))) {
    console.warn('PROVIDER AUTH STORAGE MISMATCH. Normalizing from token.', {
      idFromToken: jwtUserId,
      storedProviderId,
      storedUserId,
    });
    await AsyncStorage.multiSet([
      ['providerId', String(jwtUserId)],
      ['userId', String(jwtUserId)],
    ]);
    console.log('Provider auth normalized from token');
  }

  const role =
    (tokenIsCurrent ? jwtRole : null) ||
    storedRole ||
    storedProvider?.role ||
    storedUser?.role ||
    storedCurrentUser?.role ||
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
    user: Object.keys(storedProvider).length ? storedProvider : storedUser,
    isLoggedIn: Boolean(tokenIsCurrent && providerId),
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
  debugAuthStorage,
};
