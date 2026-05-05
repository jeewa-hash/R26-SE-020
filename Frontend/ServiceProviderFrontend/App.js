import React, { useState, useEffect, useRef } from 'react';
import {View, ActivityIndicator, AppState, Text, TouchableOpacity, StyleSheet,} from 'react-native';

import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { LightTheme, DarkTheme } from './theme';
import './locales';

// Screens
import LanguageSelectScreen from './onbordingPages/LanguageSelectScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import NewsFeedScreen from './pages/NewsFeedScreen';

// Biometric utils
import {
  isBiometricAvailable,
  promptBiometric,
  getAppLockEnabled,
  clearCredentials,
  hasStoredCredentials,
} from './utils/biometricAuth';

const Stack = createStackNavigator();

/* ================= LOCK SCREEN ================= */
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
        <MaterialIcons name="lock" size={50} color="#fff" />
        <Text style={styles.lockTitle}>App Locked</Text>

        {!showFallback ? (
          <TouchableOpacity style={styles.unlockButton} onPress={attemptUnlock}>
            {unlocking ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <MaterialIcons name="fingerprint" size={22} color="#fff" />
                <Text style={styles.unlockText}>Unlock</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onPasswordFallback}>
            <Text style={{ color: '#fff' }}>Login with Password</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

/* ================= APP ================= */
export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  const navigationRef = useNavigationContainerRef();
  const appState = useRef(AppState.currentState);

  const [isFirstLaunch, setIsFirstLaunch] = useState(null);
  const [hasToken, setHasToken] = useState(false);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  /* ---------- INIT ---------- */
  useEffect(() => {
    initApp();
  }, []);

  const initApp = async () => {
    const launched = await AsyncStorage.getItem('alreadyLaunched');
    const token = await hasStoredCredentials();
    const lockEnabled = await getAppLockEnabled();

    setIsFirstLaunch(launched === null);
    if (launched === null) {
      await AsyncStorage.setItem('alreadyLaunched', 'true');
    }

    setHasToken(token);
    setAppLockEnabled(lockEnabled);

    if (token && lockEnabled) {
      setIsLocked(true);
    }

    setIsLoading(false);
  };

  /* ---------- APP STATE (LOCK ON RESUME) ---------- */
  useEffect(() => {
    const sub = AppState.addEventListener('change', async nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        const token = await hasStoredCredentials();
        const lockEnabled = await getAppLockEnabled();

        if (token && lockEnabled) {
          setIsLocked(true);
        }
      }
      appState.current = nextState;
    });

    return () => sub.remove();
  }, []);

  /* ---------- HANDLERS ---------- */
  const handleUnlock = () => setIsLocked(false);

  const handlePasswordFallback = async () => {
    await clearCredentials();
    setHasToken(false);
    setIsLocked(false);
    navigationRef.navigate('Login');
  };

  /* ---------- LOADING ---------- */
  if (isLoading || isFirstLaunch === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  /* ---------- ROUTE DECISION ---------- */
  let initialRoute = 'Login';

  if (isFirstLaunch) initialRoute = 'LanguageSelect';
  else if (hasToken) initialRoute = 'Home';

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator initialRouteName={initialRoute}>
            
            <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="NewsFeed" component={NewsFeedScreen} options={{ headerShown: false }} />

          </Stack.Navigator>
        </NavigationContainer>

        {appLockEnabled && isLocked && (
          <LockScreen
            onUnlock={handleUnlock}
            onPasswordFallback={handlePasswordFallback}
          />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lockContent: {
    alignItems: 'center',
  },
  lockTitle: {
    color: '#fff',
    fontSize: 20,
    marginTop: 10,
  },
  unlockButton: {
    marginTop: 20,
    flexDirection: 'row',
    gap: 10,
  },
  unlockText: {
    color: '#fff',
  },
});