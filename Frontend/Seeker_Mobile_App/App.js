import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import AsyncStorage from '@react-native-async-storage/async-storage';

import NotificationScreen from './screens/NotificationScreen';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import VerifyOTPScreen from './screens/VerifyOTPScreen';
import HomeScreen from './screens/HomeScreen';
import FollowUpScreen from './screens/FollowUpScreen';
import ProvidersScreen from './screens/ProvidersScreen';
import FeedScreen from './screens/FeedScreen';
import ProfileScreen from './screens/ProfileScreen';
import CreatePostScreen from './screens/CreatePostScreen';
import LanguageScreen from './screens/LanguageScreen';
import FeedbackScreen from './screens/FeedbackScreen';
import BiddingScreen from './screens/BiddingScreen';
import BidResponsesScreen from './screens/BidResponsesScreen';
import { ChatProvider } from './context/ChatContext';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';
import SeasonalDemandsScreen from './screens/SeasonalDemandsScreen';



import './i18n';
import { LanguageProvider } from './context/LanguageContext';
import { loadLanguage } from './i18n';
const Stack = createStackNavigator();

function AppNavigator({ initialRouteName }) {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>

      {/* Language selection first */}
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ headerShown: false }}
      />

      
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

      {/* Main App */}
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          headerShown: true,
          title: 'Seeker Dashboard',
          headerTitleStyle: { fontWeight: 'bold' },
          headerShadowVisible: false,
        }} 
      />

      <Stack.Screen
        name="FollowUpScreen"
        component={FollowUpScreen}
        options={{ title: t('nav_follow_up') }}
      />

      <Stack.Screen
        name="FeedScreen"
        component={FeedScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="CreatePostScreen"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProvidersScreen"
        component={ProvidersScreen}
        options={{ title: t('nav_providers') }}
      />
      <Stack.Screen 
        name="NotificationsScreen" 
        component={NotificationScreen} 
        options={{ headerShown: false }} 
    />
    <Stack.Screen 
        name="FeedbackScreen" 
        component={FeedbackScreen} 
        options={{ headerShown: false }} 
    />
     <Stack.Screen
        name="BiddingScreen"
        component={BiddingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
      name="ChatListScreen" 
      component={ChatListScreen} 
      options={{ headerShown: false }} />
      <Stack.Screen 
      name="SeasonalDemandsScreen" 
      component={SeasonalDemandsScreen} 
      options={{ headerShown: false }} 
      />

      <Stack.Screen 
      name="ChatScreen" 
      component={ChatScreen} 
      options={{ headerShown: false }} />
      <Stack.Screen 
       name="BidResponsesScreen" 
       component={BidResponsesScreen} 
       options={{ headerShown: false }} 
       />

    </Stack.Navigator>
  );
}

/* ✅ Root App */
export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Login');

  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        await loadLanguage();
        
        // Persistent Login Logic
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');

        if (token && role === 'Seeker') {
          setInitialRouteName('Home');
        } else {
          setInitialRouteName('Login');
        }
      } catch (err) {
        console.log('Bootstrap error:', err);
        setInitialRouteName('Login');
      } finally {
        setBootstrapped(true);
      }
    };

    bootstrapApp();
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