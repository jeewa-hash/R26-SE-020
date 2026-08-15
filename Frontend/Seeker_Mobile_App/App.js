import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';


//import AsyncStorage from '@react-native-async-storage/async-storage';

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
import OnboardingScreen from './screens/OnboardingScreen'; 

import FeedbackScreen from './screens/FeedbackScreen';
import BiddingScreen from './screens/BiddingScreen';
import BidResponsesScreen from './screens/BidResponsesScreen';
import UserQuotesScreen from './screens/UserQuotesScreen';

// Profile Sub Screens
import BookingsScreen from './screens/BookingsScreen';
import MyBidsScreen from './screens/MyBidsScreen';
import MyPostsScreen from './screens/MyPostsScreen';
import HistoryScreen from './screens/HistoryScreen';
import StarPointsScreen from './screens/StarPointsScreen';
import PaymentScreen from './screens/PaymentScreen';
import SettingsScreen from './screens/SettingsScreen';
import HelpScreen from './screens/HelpScreen';
import SpendAnalyticsScreen from './screens/SpendAnalyticsScreen';

// Chat Screens
import { ChatProvider } from './context/ChatContext';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';

// Other Screens
import SeasonalDemandsScreen from './screens/SeasonalDemandsScreen';
import RescheduleScreen from './screens/RescheduleScreen';

import './i18n';
import { LanguageProvider } from './context/LanguageContext';
import { loadLanguage } from './i18n';
import { ThemeProvider } from './context/ThemeContext';
const Stack = createStackNavigator();
function AppNavigator({ initialRouteName }) {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      {/* 1. Authentication Screens First */}
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ title: 'Seeker Login', headerShown: false }}
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

      {/* 2. Language Selection */}
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ headerShown: false }}
      />

      {/* 3. Main App Screens */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ title: t('nav_dashboard'), headerLeft: null }}
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
        name="Onboarding"
        component={OnboardingScreen}
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
        name="UserQuotesScreen"
        component={UserQuotesScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProvidersScreen"
        component={ProvidersScreen}
        options={{ title: t('nav_providers') }}
      />
      
     
    <Stack.Screen 
        name="FeedbackScreen" 
        component={FeedbackScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
    name="NotificationScreen" 
    component={NotificationScreen} 
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
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="SeasonalDemandsScreen" 
        component={SeasonalDemandsScreen} 
        options={{ headerShown: false }} 
      />

      <Stack.Screen 
        name="ChatScreen" 
        component={ChatScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="BidResponsesScreen" 
        component={BidResponsesScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="BookingsScreen" 
        component={BookingsScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="MyBidsScreen" 
        component={MyBidsScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="MyPostsScreen" 
        component={MyPostsScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="HistoryScreen" 
        component={HistoryScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="StarPointsScreen" 
        component={StarPointsScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="PaymentScreen" 
        component={PaymentScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="SettingsScreen" 
        component={SettingsScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="HelpScreen" 
        component={HelpScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="SpendAnalyticsScreen" 
        component={SpendAnalyticsScreen} 
        options={{ headerShown: false }} 
      />
      
      <Stack.Screen 
        name="RescheduleScreen" 
        component={RescheduleScreen} 
        options={{ headerShown: false }} 
      />
    </Stack.Navigator>
  );
}

/* ✅ Root App */
export default function App() {
  // Default screen is set to Login
  const [bootstrapped, setBootstrapped] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Login');

  useEffect(() => {
    const bootstrapLanguage = async () => {
      await loadLanguage();
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');

        // Check auth status: if token exists & role matches, go to Home. Otherwise, Login.
        if (token && role === 'Seeker') {
          setInitialRouteName('Home');
        } else {
          setInitialRouteName('Login');
        }
      } catch (err) {
        console.log('Error bootstrapping auth:', err);
        setInitialRouteName('Login');
      }
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
        <ThemeProvider>
          <NavigationContainer>
            <AppNavigator initialRouteName={initialRouteName} />
          </NavigationContainer>
        </ThemeProvider>
      </ChatProvider>
    </LanguageProvider>
  );
}