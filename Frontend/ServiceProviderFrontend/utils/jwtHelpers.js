import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64UrlToBase64 = (value) => {
  let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding === 2) base64 += '==';
  if (padding === 3) base64 += '=';
  return base64;
};

const utf8Decode = (bytes) =>
  decodeURIComponent(
    bytes
      .split('')
      .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
      .join('')
  );

const base64Decode = (input) => {
  let str = input.replace(/\s+/g, '');
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < str.length; i++) {
    const value = BASE64_CHARS.indexOf(str.charAt(i));
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }

  return utf8Decode(output);
};

export const decodeJwt = (token) => {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1];
    const base64 = base64UrlToBase64(payload);
    return JSON.parse(base64Decode(base64));
  } catch (error) {
    console.error('JWT decode failed:', error);
    return null;
  }
};

export const getUserIdFromJwt = (token) => {
  const decoded = decodeJwt(token);
  return decoded?.user?.id || decoded?.id || null;
};

export const getStoredUserId = async () => {
  const storedId = await AsyncStorage.getItem('userId');
  if (storedId) return storedId;

  const token = await AsyncStorage.getItem('userToken');
  const idFromToken = getUserIdFromJwt(token);
  if (idFromToken) {
    await AsyncStorage.setItem('userId', String(idFromToken));
  }
  return idFromToken;
};
