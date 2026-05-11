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
  
  // Handle different possible ID structures
  if (decoded) {
    // Check for user._id (MongoDB ObjectId format)
    if (decoded.user?._id) {
      // If it's an object with $oid, extract the string value
      return decoded.user._id.$oid || decoded.user._id;
    }
    // Check for user.id
    if (decoded.user?.id) return decoded.user.id;
    // Check for direct _id
    if (decoded._id) {
      return decoded._id.$oid || decoded._id;
    }
    // Check for direct id
    if (decoded.id) return decoded.id;
    // Check for userId
    if (decoded.userId) return decoded.userId;
  }
  
  return null;
};

export const getStoredUserId = async () => {
  try {
    // First try to get stored userId
    const storedId = await AsyncStorage.getItem('userId');
    if (storedId) return storedId;

    // If not stored, get from token
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;
    
    const idFromToken = getUserIdFromJwt(token);
    if (idFromToken) {
      // Store the ID for future use
      await AsyncStorage.setItem('userId', String(idFromToken));
    }
    
    return idFromToken;
  } catch (error) {
    console.error('Error getting stored user ID:', error);
    return null;
  }
};

// Get full user data from token
export const getUserFromToken = async () => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    if (!token) return null;
    
    const decoded = decodeJwt(token);
    return decoded?.user || decoded || null;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
};

// Get specific user fields
export const getUserRole = async () => {
  try {
    const user = await getUserFromToken();
    return user?.role || null;
  } catch (error) {
    console.error('Error getting user role:', error);
    return null;
  }
};

// Clear user data on logout
export const clearUserData = async () => {
  try {
    await AsyncStorage.multiRemove(['userId', 'userToken']);
  } catch (error) {
    console.error('Error clearing user data:', error);
  }
};