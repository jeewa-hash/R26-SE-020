import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, AppState } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialIcons } from '@expo/vector-icons';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import {
  isBiometricAvailable,
  promptBiometric,
  getAppLockEnabled,
  clearCredentials,
  hasStoredCredentials,
} from './utils/biometricAuth';

const Stack = createStackNavigator();

function LockScreen({ onUnlock, onPasswordFallback }) {
  const [unlocking, setUnlocking] = useState(false);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    attemptUnlock();
  }, []);

  const attemptUnlock = async () => {
    setUnlocking(true);
    const bioAvailable = await isBiometricAvailable();
    if (!bioAvailable) {
      setUnlocking(false);
      setShowFallback(true);
      return;
    }
    const result = await promptBiometric();
    setUnlocking(false);
    if (result.success) {
      onUnlock();
    } else {
      setShowFallback(true);
    }
  };

  return (
    <View style={styles.lockOverlay}>
      <View style={styles.lockContent}>
        <View style={styles.lockIconCircle}>
          <MaterialIcons name="lock" size={48} color="#fff" />
        </View>
        <Text style={styles.lockTitle}>App Locked</Text>
        <Text style={styles.lockSubtitle}>Unlock to access Work Wave</Text>

        {!showFallback ? (
          <TouchableOpacity
            style={styles.unlockButton}
            onPress={attemptUnlock}
            disabled={unlocking}
            activeOpacity={0.8}
          >
            {unlocking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="fingerprint" size={24} color="#fff" />
                <Text style={styles.unlockButtonText}>Unlock with Fingerprint</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.fallbackContainer}>
            <Text style={styles.fallbackText}>Biometric authentication failed or unavailable</Text>
            <TouchableOpacity style={styles.passwordButton} onPress={onPasswordFallback}>
              <Text style={styles.passwordButtonText}>Login with Password</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

export default function App() {
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const appState = useRef(AppState.currentState);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async nextAppState => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        const tokenExists = await hasStoredCredentials();
        const lockEnabled = await getAppLockEnabled();
        setHasToken(tokenExists);
        setAppLockEnabled(lockEnabled);
        if (tokenExists && lockEnabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
  }, []);

  const initApp = async () => {
    const tokenExists = await hasStoredCredentials();
    const lockEnabled = await getAppLockEnabled();
    setHasToken(tokenExists);
    setAppLockEnabled(lockEnabled);

    if (tokenExists && lockEnabled) {
      setIsLocked(true);
    }
    setIsLoading(false);
  };

  const handleUnlock = () => {
    setIsLocked(false);
  };

  const handlePasswordFallback = async () => {
    await clearCredentials();
    setHasToken(false);
    setIsLocked(false);
    if (navigationRef.isReady()) {
      navigationRef.navigate('Login');
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName={hasToken ? 'Home' : 'Login'}>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ title: 'Provider Login' }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ title: 'Provider Registration' }}
          />
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Provider Dashboard', headerLeft: null }}
          />
        </Stack.Navigator>
      </NavigationContainer>

      {appLockEnabled && isLocked && (
        <LockScreen
          onUnlock={handleUnlock}
          onPasswordFallback={handlePasswordFallback}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.97)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  lockContent: {
    alignItems: 'center',
    padding: 32,
  },
  lockIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  lockTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  lockSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 32,
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    gap: 8,
    minWidth: 240,
  },
  unlockButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  fallbackContainer: {
    alignItems: 'center',
  },
  fallbackText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  passwordButton: {
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 8,
    minWidth: 240,
    alignItems: 'center',
  },
  passwordButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '700',
  },
});
