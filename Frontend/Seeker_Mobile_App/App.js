import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import BottomNav from './components/BottomNav';

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
import ProviderProfileScreen from './screens/ProviderProfileScreen';

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
import RequestQuotationDetailsScreen from './screens/RequestQuotationDetailsScreen';
import PostResponsesScreen from './screens/PostResponsesScreen';
import EditProfileScreen from './screens/EditProfileScreen';

// IT22129376 - My Jobs Flow
import MyJobsScreen from './screens/IT22129376/MyJobsScreen';
import JobDetailsScreen from './screens/IT22129376/JobDetailsScreen';
import QuoteDetailsScreen from './screens/IT22129376/QuoteDetailsScreen';
import CoordinationReviewScreen from './screens/IT22129376/CoordinationReviewScreen';
import SuggestedSlotsScreen from './screens/IT22129376/SuggestedSlotsScreen';
import ConfirmJobScreen from './screens/IT22129376/ConfirmJobScreen';
import ScheduledJobDetailsScreen from './screens/IT22129376/ScheduledJobDetailsScreen';
import JobHistoryDetailsScreen from './screens/IT22129376/JobHistoryDetailsScreen';

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
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import customToastConfig from './components/CustomToast';

import { navigationRef } from './utils/navigationService';

const Stack = createStackNavigator();

function AppNavigator({ initialRouteName }) {
  const { t } = useTranslation();

  return (
    <Stack.Navigator initialRouteName={initialRouteName}>
      {/* Authentication Screens */}
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

      {/* Language / Onboarding */}
      <Stack.Screen
        name="Language"
        component={LanguageScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />

      {/* Main App Screens */}
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
/>

      <Stack.Screen
        name="FeedScreen"
        component={FeedScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="CreatePostScreen"
        component={CreatePostScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="FollowUpScreen"
        component={FollowUpScreen}
        options={{ title: t('nav_follow_up') }}
      />

      <Stack.Screen
        name="ProvidersScreen"
        component={ProvidersScreen}
        options={{ title: t('nav_providers') }}
      />

      <Stack.Screen
        name="ProviderProfile"
        component={ProviderProfileScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="EditProfileScreen"
        component={EditProfileScreen}
        options={{ headerShown: false }}
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
        name="UserQuotesScreen"
        component={UserQuotesScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="BidResponsesScreen"
        component={BidResponsesScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="RequestQuotationDetails"
        component={RequestQuotationDetailsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="PostResponsesScreen"
        component={PostResponsesScreen}
        options={{ headerShown: false }}
      />

      {/* Chat Screens */}
      <Stack.Screen
        name="ChatListScreen"
        component={ChatListScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ headerShown: false }}
      />

      {/* Existing Bookings screen - keep unchanged */}
      <Stack.Screen
        name="BookingsScreen"
        component={BookingsScreen}
        options={{ headerShown: false }}
      />

      {/* IT22129376 - New My Jobs Flow */}
      <Stack.Screen
        name="MyJobsScreen"
        component={MyJobsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376JobDetails"
        component={JobDetailsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376QuoteDetails"
        component={QuoteDetailsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376CoordinationReview"
        component={CoordinationReviewScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376SuggestedSlots"
        component={SuggestedSlotsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376ConfirmJob"
        component={ConfirmJobScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376ScheduledJobDetails"
        component={ScheduledJobDetailsScreen}
        options={{ headerShown: false }}
      />

      <Stack.Screen
        name="IT22129376JobHistoryDetails"
        component={JobHistoryDetailsScreen}
        options={{ headerShown: false }}
      />

      {/* Profile Sub Screens */}
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

      {/* Other Screens */}
      <Stack.Screen
        name="SeasonalDemandsScreen"
        component={SeasonalDemandsScreen}
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

/* Root App */
export default function App() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState('Login');
  const [currentRouteName, setCurrentRouteName] = useState('Login');

  const syncCurrentRouteName = () => {
    const route = navigationRef.getCurrentRoute();

    if (route?.name) {
      setCurrentRouteName(route.name);
    }
  };

  useEffect(() => {
    const bootstrapLanguage = async () => {
      await loadLanguage();

      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');

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
          <AuthProvider>
            <NotificationProvider>
              <View style={{ flex: 1 }}>
                <NavigationContainer
                  ref={navigationRef}
                  onReady={syncCurrentRouteName}
                  onStateChange={syncCurrentRouteName}
                >
                  <View style={{ flex: 1 }}>
                    <AppNavigator initialRouteName={initialRouteName} />
                    <BottomNav
                      navigationRef={navigationRef}
                      currentRouteName={currentRouteName}
                      isRootNav
                    />
                  </View>
                </NavigationContainer>

                <Toast config={customToastConfig} />
              </View>
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
      </ChatProvider>
    </LanguageProvider>
  );
}
