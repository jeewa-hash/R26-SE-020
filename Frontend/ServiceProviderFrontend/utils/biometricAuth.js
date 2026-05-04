import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'workwave_userToken';
const ROLE_KEY = 'workwave_userRole';

/**
 * Check if the device has biometric hardware and enrolled biometrics
 */
export async function isBiometricAvailable() {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return compatible && enrolled;
  } catch (error) {
    console.error('Biometric availability check error:', error);
    return false;
  }
}

/**
 * Prompt user for biometric authentication
 */
export async function promptBiometric() {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Authenticate to access Work Wave',
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use app password',
      disableDeviceFallback: true,
    });
    return result;
  } catch (error) {
    console.error('Biometric prompt error:', error);
    return { success: false, error: 'prompt_failed' };
  }
}

/**
 * Save JWT token and role to secure storage
 */
export async function saveCredentials(token, role) {
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
    await SecureStore.setItemAsync(ROLE_KEY, role);
    return true;
  } catch (error) {
    console.error('Save credentials error:', error);
    return false;
  }
}

/**
 * Get JWT token from secure storage
 */
export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch (error) {
    console.error('Get token error:', error);
    return null;
  }
}

/**
 * Get user role from secure storage
 */
export async function getRole() {
  try {
    return await SecureStore.getItemAsync(ROLE_KEY);
  } catch (error) {
    console.error('Get role error:', error);
    return null;
  }
}

/**
 * Check if credentials exist in secure storage
 */
export async function hasStoredCredentials() {
  try {
    const token = await getToken();
    return !!token;
  } catch (error) {
    console.error('Has credentials check error:', error);
    return false;
  }
}

/**
 * Clear all stored credentials
 */
export async function clearCredentials() {
  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(ROLE_KEY);
    return true;
  } catch (error) {
    console.error('Clear credentials error:', error);
    return false;
  }
}
