import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerifyOTPScreen from './screens/VerifyOTPScreen';
import HomeScreen from './screens/HomeScreen';
import NotificationScreen from './screens/NotificationScreen';

import './i18n';
import { LanguageProvider } from './context/LanguageContext';
import { loadLanguage } from './i18n';
const Stack = createStackNavigator();


function AppNavigator({ initialRouteName }) {
  const { t } = useTranslation();

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Seeker Login' }} 
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Seeker Registration' }} 
        />
        <Stack.Screen 
          name="VerifyOTP" 
          component={VerifyOTPScreen} 
          options={{ title: 'Verify Email' }} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Seeker Dashboard', headerLeft: null }} 
        />
        <Stack.Screen 
          name="Notifications" 
          component={NotificationScreen} 
          options={{ title: 'Notifications' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/* ✅ Root App */
export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Language');

  useEffect(() => {
    const bootstrapLanguage = async () => {
      await loadLanguage();
      setInitialRouteName('Language');
      setBootstrapped(true);
    };

    bootstrapLanguage();
  }, []);

  if (!bootstrapped) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <ChatProvider>
      <NavigationContainer>
        <AppNavigator initialRouteName={initialRouteName} />
      </NavigationContainer>
       </ChatProvider>
    </LanguageProvider>
  );
}