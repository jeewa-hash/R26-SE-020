import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { LightTheme, DarkTheme } from './theme';
import './locales';

import LanguageSelectScreen from './onbordingPages/LanguageSelectScreen';
import BottomTabNavigator from './navigation/BottomTabNavigator';
import { AppliedJobsProvider } from './context/AppliedJobsContext';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import NotificationScreen from './screens/NotificationScreen';
import SubmitInquiryScreen from './screens/SubmitInquiryScreen';

import ProviderCalendarScreen from './pages/coordination/ProviderCalendarScreen';
import ProviderBookingDetailScreen from './pages/coordination/ProviderBookingDetailScreen';
import ProviderDelayReportScreen from './pages/coordination/ProviderDelayReportScreen';
import ScheduleImpactResultScreen from './pages/coordination/ScheduleImpactResultScreen';

const Stack = createStackNavigator();

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? DarkTheme : LightTheme;

  const [initialRoute, setInitialRoute] = useState(null);

  useEffect(() => {
    checkInitialRoute();
  }, []);

  const checkInitialRoute = async () => {
    try {
      const selectedLanguage = await AsyncStorage.getItem('selectedLanguage');

      const token =
        (await AsyncStorage.getItem('token')) ||
        (await AsyncStorage.getItem('providerToken')) ||
        (await AsyncStorage.getItem('authToken'));

      if (!selectedLanguage) {
        setInitialRoute('LanguageSelect');
        return;
      }

      if (token) {
        setInitialRoute('MainApp');
        return;
      }

      setInitialRoute('Login');
    } catch (error) {
      console.log('Initial route check failed:', error);
      setInitialRoute('Login');
    }
  };

  if (!initialRoute) {
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
            <Stack.Screen
              name="LanguageSelect"
              component={LanguageSelectScreen}
            />

            <Stack.Screen
              name="Login"
              component={LoginScreen}
            />

            <Stack.Screen
              name="Register"
              component={RegisterScreen}
            />

            {/* New main route */}
            <Stack.Screen
              name="MainApp"
              component={BottomTabNavigator}
            />

            {/* Compatibility route for old code using navigation.replace("Main") */}
            <Stack.Screen
              name="Main"
              component={BottomTabNavigator}
            />

            <Stack.Screen
              name="Notifications"
              component={NotificationScreen}
            />

            <Stack.Screen
              name="SubmitInquiry"
              component={SubmitInquiryScreen}
            />

            <Stack.Screen
              name="ProviderCalendar"
              component={ProviderCalendarScreen}
            />

            <Stack.Screen
              name="ProviderBookingDetail"
              component={ProviderBookingDetailScreen}
            />

            <Stack.Screen
              name="ProviderDelayReport"
              component={ProviderDelayReportScreen}
            />

            <Stack.Screen
              name="ScheduleImpactResult"
              component={ScheduleImpactResultScreen}
            />
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
    backgroundColor: '#F9FAFB',
  },
});