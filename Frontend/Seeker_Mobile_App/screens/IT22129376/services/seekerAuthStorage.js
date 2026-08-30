import AsyncStorage from '@react-native-async-storage/async-storage';

const decodeBase64Url = (base64Url) => {
  try {
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');

    while (base64.length % 4) {
      base64 += '=';
    }

    if (typeof atob === 'function') {
      return atob(base64);
    }

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
    payload.userId ||
    payload.id ||
    payload._id ||
    payload.sub ||
    payload.seekerId ||
    null
  );
};

export const getStoredSeekerAuth = async () => {
  const token = await AsyncStorage.getItem('userToken');
  const storedUserId = await AsyncStorage.getItem('userId');
  const userText = await AsyncStorage.getItem('user');

  let user = null;

  try {
    user = userText ? JSON.parse(userText) : null;
  } catch (error) {
    user = null;
  }

  const jwtUserId = getUserIdFromJwt(token);

  const seekerId =
    storedUserId ||
    user?._id ||
    user?.id ||
    user?.userId ||
    user?.seekerId ||
    jwtUserId ||
    null;

  if (seekerId && !storedUserId) {
    await AsyncStorage.setItem('userId', String(seekerId));
  }

  return {
    token,
    seekerId,
    user,
    isLoggedIn: Boolean(token && seekerId),
  };
};

export const buildAuthHeaders = async () => {
  const { token } = await getStoredSeekerAuth();

  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};