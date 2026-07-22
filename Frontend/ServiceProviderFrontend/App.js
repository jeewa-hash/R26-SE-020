import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

// Themes & Locales
import { LightTheme, DarkTheme } from './theme';
import './locales';

// Context Providers
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { PortfolioProvider } from './context/PortfolioContext';
import { AppliedJobsProvider } from './context/AppliedJobsContext';
import { NotificationsProvider } from './context/NotificationsContext';

// Screens
import LanguageSelectScreen from './onbordingPages/LanguageSelectScreen';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import PortfolioGalleryScreen from './pages/PortfolioGalleryScreen';
import PostFeedScreen from './pages/PostFeedScreen';
import CreatePostScreen from './pages/CreatePostScreen';

const Stack = createStackNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkLanguage();
  }, []);

  const checkLanguage = async () => {
    try {
      const languageSelected = await AsyncStorage.getItem('selectedLanguage');
      // If language exists, go to MainApp (Tabs), otherwise show Language Selection
      setInitialRoute(languageSelected ? 'MainApp' : 'LanguageSelect');
    } catch (e) {
      setInitialRoute('LanguageSelect');
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
                  <NavigationContainer>
                    <Stack.Navigator
                      initialRouteName={initialRoute}
                      screenOptions={{ headerShown: false }}
                    >
                      {/* 1. ONBOARDING: No Bottom Bar here */}
                      <Stack.Screen 
                        name="LanguageSelect" 
                        component={LanguageSelectScreen} 
                      />

                      {/* 2. MAIN APP: This component contains the Bottom Bar 
                          and all screens that should show the bar (Chat, Quotes, etc.) */}
                      <Stack.Screen 
                        name="MainApp" 
                        component={BottomTabNavigator} 
                      />

                      {/* 3. FULL SCREEN MODALS: Put screens here ONLY if you 
                          want them to HIDE the bottom bar (e.g., a full gallery) */}
                      <Stack.Screen 
                        name="PortfolioGallery" 
                        component={PortfolioGalleryScreen} 
                      />
                      <Stack.Screen 
        name="PostGeneration" 
        component={CreatePostScreen} 
        options={{ title: 'Generate AI Post' }} 
      />

      <Stack.Screen 
        name="PostFeed" 
        component={PostFeedScreen} 
        options={{ title: 'My Generated Posts' }} 
      />
                    </Stack.Navigator>
                  </NavigationContainer>
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});