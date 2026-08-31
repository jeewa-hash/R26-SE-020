// pages/IT22129376/utils/jwtHelpers.js

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

const base64UrlToBase64 = (value) => {
  let base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding === 2) base64 += '==';
  if (padding === 3) base64 += '=';
  return base64;
};

const utf8Decode = (bytes) => {
  try {
    return decodeURIComponent(
      bytes
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
  } catch (e) {
    return bytes;
  }
};

const base64Decode = (input) => {
  if (typeof atob === 'function') {
    try {
      return atob(input);
    } catch (e) {
      // fallback to manual decode
    }
  }

  let str = String(input || '').replace(/\s+/g, '');
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
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const parts = cleanToken.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const base64 = base64UrlToBase64(parts[1]);
    const decodedStr = base64Decode(base64);

    if (!decodedStr) {
      return null;
    }

    return JSON.parse(decodedStr);
  } catch (error) {
    console.warn('Safe JWT decode warning:', error?.message);
    return null;
  }
};

export const getUserIdFromJwt = (token) => {
  const decoded = decodeJwt(token);
  if (!decoded) return null;

  if (decoded.user?._id) {
    return decoded.user._id.$oid || decoded.user._id;
  }
  if (decoded.user?.id) return decoded.user.id;
  if (decoded.user?.userId) return decoded.user.userId;
  if (decoded.user?.providerId) return decoded.user.providerId;

  if (decoded._id) {
    return decoded._id.$oid || decoded._id;
  }
  if (decoded.id) return decoded.id;
  if (decoded.userId) return decoded.userId;
  if (decoded.providerId) return decoded.providerId;
  if (decoded.sub) return decoded.sub;

  return null;
};

export const getRoleFromJwt = (token) => {
  const decoded = decodeJwt(token);
  if (!decoded) return null;

  return (
    decoded.user?.role ||
    decoded.role ||
    decoded.userRole ||
    null
  );
};

export default {
  decodeJwt,
  getUserIdFromJwt,
  getRoleFromJwt,
};