import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightTheme, DarkTheme } from './theme';
import { useColorScheme } from 'react-native';
import './locales'; // Initialize i18n
import LanguageSelectScreen from './onbordingPages/LanguageSelectScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createStackNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  const [isFirstLaunch, setIsFirstLaunch] = useState(null); // null = still checking

  // Check if user has launched app before
  useEffect(() => {
    AsyncStorage.getItem('alreadyLaunched').then((value) => {
      if (value === null) {
        // First time — show language screen
        AsyncStorage.setItem('alreadyLaunched', 'true');
        setIsFirstLaunch(true);
      } else {
        // Already launched before — skip language screen
        setIsFirstLaunch(false);
      }
    });
  }, []);

  // Show loading spinner while checking
  if (isFirstLaunch === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={isFirstLaunch ? 'LanguageSelect' : 'Home'}
          >
            <Stack.Screen
              name="LanguageSelect"
              component={LanguageSelectScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'Provider Dashboard', headerLeft: null }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
    </SafeAreaProvider>
  );
}