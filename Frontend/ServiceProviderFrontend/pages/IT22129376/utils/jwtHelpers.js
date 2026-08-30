// pages/IT22129376/utils/jwtHelpers.js

const base64UrlDecode = (input) => {
    let base64 = String(input || '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
  
    while (base64.length % 4) {
      base64 += '=';
    }
  
    try {
      if (typeof atob === 'function') {
        return decodeURIComponent(
          atob(base64)
            .split('')
            .map((char) => {
              return `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`;
            })
            .join('')
        );
      }
  
      return Buffer.from(base64, 'base64').toString('utf8');
    } catch (error) {
      return null;
    }
  };
  
  export const decodeJwt = (token) => {
    try {
      if (!token || typeof token !== 'string') {
        console.log('JWT decode skipped: token is not a string');
        return null;
      }
  
      const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
  
      const parts = cleanToken.split('.');
  
      if (parts.length !== 3) {
        console.log('JWT decode skipped: invalid JWT format');
        return null;
      }
  
      const payload = base64UrlDecode(parts[1]);
  
      if (!payload) {
        console.log('JWT decode skipped: payload decode failed');
        return null;
      }
  
      return JSON.parse(payload);
    } catch (error) {
      console.log('JWT decode failed safely:', error?.message);
      return null;
    }
  };
  
  export const getUserIdFromJwt = (token) => {
    const decoded = decodeJwt(token);
  
    return (
      decoded?.user?._id ||
      decoded?.user?.id ||
      decoded?.user?.userId ||
      decoded?._id ||
      decoded?.id ||
      decoded?.userId ||
      decoded?.sub ||
      null
    );
  };
  
  export default {
    decodeJwt,
    getUserIdFromJwt,
  };