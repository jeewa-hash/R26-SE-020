import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

import { LightTheme, DarkTheme } from './theme';
import './locales';

import LanguageSelectScreen from './onbordingPages/LanguageSelectScreen';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { AppliedJobsProvider } from './context/AppliedJobsContext';
import PortfolioGalleryScreen from './pages/PortfolioGalleryScreen';

const Stack = createStackNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;
  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkLanguage();
  }, []);

  const checkLanguage = async () => {
    const languageSelected = await AsyncStorage.getItem('selectedLanguage');
    setInitialRoute(languageSelected ? 'MainApp' : 'LanguageSelect');
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
      <AppliedJobsProvider> 
      <PaperProvider theme={theme}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName={initialRoute}
            screenOptions={{ headerShown: false }}
          >
            <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
            <Stack.Screen name="MainApp" component={BottomTabNavigator} />
            <Stack.Screen name="PortfolioGallery" component={PortfolioGalleryScreen} options={{headerShown: false}} />
          </Stack.Navigator>
        </NavigationContainer>
      </PaperProvider>
      </AppliedJobsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});