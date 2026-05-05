import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

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
import NotificationsScreen from './screens/NotificationsScreen';
import BiddingScreen from './screens/BiddingScreen';
import BidResponsesScreen from './screens/BidResponsesScreen';
import { ChatProvider } from './context/ChatContext';
import ChatListScreen from './screens/ChatListScreen';
import ChatScreen from './screens/ChatScreen';



import './i18n';
import { LanguageProvider } from './context/LanguageContext';
import { loadLanguage } from './i18n';
const Stack = createStackNavigator();


function AppNavigator() {
  return (
    <Stack.Navigator initialRouteName="Language">

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
        options={{ title: 'Seeker Dashboard', headerLeft: null }}
      />

      <Stack.Screen
        name="FollowUpScreen"
        component={FollowUpScreen}
        options={{ title: 'Follow Up Questions' }}
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
        options={{ title: 'Available Providers' }}
      />
      <Stack.Screen 
        name="FeedbackScreen" 
        component={FeedbackScreen} 
        options={{ headerShown: false }} 
    />
     <Stack.Screen 
      name="NotificationsScreen" 
      component={NotificationsScreen} 
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
    
  return (
    <LanguageProvider>
      <ChatProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
       </ChatProvider>
    </LanguageProvider>
  );
}