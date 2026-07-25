import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, AppState, useColorScheme } from 'react-native';
import { NavigationContainer, useNavigationContainerRef, CommonActions } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

// Themes & Locales
import { LightTheme, DarkTheme } from './theme';
import './locales';

// Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { AppliedJobsProvider } from './context/AppliedJobsContext';
import { NotificationsProvider } from './context/NotificationsContext';

// Auth / biometric utils
import {
  isBiometricAvailable,
  promptBiometric,
  getAppLockEnabled,
  clearCredentials,
  hasStoredCredentials,
} from './utils/biometricAuth';

// Screens
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import BottomTabNavigator from './navigation/BottomTabNavigator'; // NewsFeed already lives here
import PortfolioGalleryScreen from './pages/PortfolioGalleryScreen';
import CreatePostScreen from './pages/CreatePostScreen';
import SubmitInquiryScreen from './screens/SubmitInquiryScreen';
import NotificationScreen from './screens/NotificationScreen';

const Stack = createStackNavigator();

// ─── Lock Screen ─────────────────────────────────────────────────────
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
        <Text style={styles.lockSubtitle}>Unlock to continue</Text>

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
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  const [initialRoute, setInitialRoute] = useState(null);
  const [appLockEnabled, setAppLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const appState = useRef(AppState.currentState);
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    initApp();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
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
    try {
      const tokenExists = await hasStoredCredentials();
      const lockEnabled = await getAppLockEnabled();

      setHasToken(tokenExists);
      setAppLockEnabled(lockEnabled);

      if (tokenExists && lockEnabled) {
        setIsLocked(true);
      }

      setInitialRoute(tokenExists ? 'Main' : 'Login');
    } catch (e) {
      setInitialRoute('Login');
    }
  };

  const handleUnlock = () => setIsLocked(false);

  const handlePasswordFallback = async () => {
    await clearCredentials();
    setHasToken(false);
    setIsLocked(false);
    if (navigationRef.isReady()) {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        })
      );
    }
  };

  if (initialRoute === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <PortfolioProvider>
            <AppliedJobsProvider>
              <NotificationsProvider>
                <PaperProvider theme={theme}>
                  <View style={{ flex: 1 }}>
                    <NavigationContainer ref={navigationRef}>
                      <Stack.Navigator
                        initialRouteName={initialRoute}
                        screenOptions={{ headerShown: false }}
                      >
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />

                        {/* Bottom tab bar — NewsFeedScreen already replaces Home inside it */}
                        <Stack.Screen name="Main" component={BottomTabNavigator} />

                        {/* Full-screen modals (no bottom bar) */}
                        <Stack.Screen name="PortfolioGallery" component={PortfolioGalleryScreen} />
                        <Stack.Screen
                          name="PostGeneration"
                          component={CreatePostScreen}
                          options={{ headerShown: true, title: 'Generate AI Post' }}
                        />
                        <Stack.Screen
                          name="SubmitInquiry"
                          component={SubmitInquiryScreen}
                          options={{ headerShown: true, title: 'Submit Inquiry' }}
                        />
                        <Stack.Screen
                          name="Notifications"
                          component={NotificationScreen}
                          options={{ headerShown: true, title: 'Notifications' }}
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
                </PaperProvider>
              </NotificationsProvider>
            </AppliedJobsProvider>
          </PortfolioProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  lockOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.97)',
    justifyContent: 'center', alignItems: 'center', zIndex: 999,
  },
  lockContent: { alignItems: 'center', padding: 32 },
  lockIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 20,
  },
  lockTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  lockSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginBottom: 32 },
  unlockButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', paddingVertical: 14,
    paddingHorizontal: 28, borderRadius: 8, gap: 8, minWidth: 240,
  },
  unlockButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  fallbackContainer: { alignItems: 'center' },
  fallbackText: { color: 'rgba(255,255,255,0.85)', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  passwordButton: {
    backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 28,
    borderRadius: 8, minWidth: 240, alignItems: 'center',
  },
  passwordButtonText: { color: '#6366f1', fontSize: 15, fontWeight: '700' },
});