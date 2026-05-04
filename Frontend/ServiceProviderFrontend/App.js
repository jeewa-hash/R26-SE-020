import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';

const Stack = createStackNavigator();

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>W</Text>
      </View>
      <Text style={styles.splashTitle}>Work Wave</Text>
      <Text style={styles.splashSubtitle}>Service Provider</Text>
      <ActivityIndicator size="small" color="#6366f1" style={{ marginTop: 24 }} />
    </View>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <SplashScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ title: 'Provider Login' }} 
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen} 
          options={{ title: 'Provider Registration' }} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'Provider Dashboard', headerLeft: null }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  splashSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    letterSpacing: 1,
  },
});
