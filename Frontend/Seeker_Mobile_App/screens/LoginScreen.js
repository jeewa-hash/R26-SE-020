import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IP_ADDRESS } from '../config';
import { useAuth } from '../context/AuthContext';

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;

// =======================================================
// DECODE JWT
// =======================================================

const decodeJWT = (token) => {
  try {
    const payload = token.split('.')[1];
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
    return JSON.parse(
      decodeURIComponent(
        decoded
          .split('')
          .map((char) => '%' + ('00' + char.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    );
  } catch (error) {
    console.error('JWT DECODE ERROR:', error);
    return null;
  }
};

// =======================================================
// LOGIN SCREEN
// =======================================================

export default function LoginScreen({ navigation }) {
  const { saveUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // =====================================================
  // LOGIN
  // =====================================================

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      // 1. Login
      const response = await axios.post(
        `${API_URL}/login`,
        {
          email: email.trim(),
          password,
        },
        {
          timeout: 10000,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('LOGIN RESPONSE:', JSON.stringify(response.data, null, 2));

      const token = response.data?.token;
      const role = response.data?.role || 'Seeker';

      if (!token) {
        Alert.alert('Login Error', 'Authentication token was not received.');
        return;
      }

      // 2. Decode token to get userId
      const decodedToken = decodeJWT(token);
      const userId = decodedToken?.user?.id;

      if (!userId) {
        Alert.alert('Login Error', 'Could not extract user ID from token.');
        return;
      }

      // 3. Fetch the full user profile from the Auth Service
      const profileResponse = await axios.get(
        `${API_URL}/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const userData = profileResponse.data;

      console.log('FULL USER PROFILE:', JSON.stringify(userData, null, 2));

      // 4. Build the complete user object
      const userProfile = {
        _id: userData?._id || String(userId),
        id: userData?._id || String(userId),
        name: userData?.name || email.split('@')[0],
        email: userData?.email || email.trim(),
        telephone: userData?.telephone || '',
        district: userData?.district || 'Colombo',
        location: userData?.location || null,
        profilePicture: userData?.profilePicture || 'https://i.pravatar.cc/150?img=7',
        avatar: userData?.profilePicture || 'https://i.pravatar.cc/150?img=7',
        role: role,
        isEmailVerified: userData?.isEmailVerified,
        isBlocked: userData?.isBlocked,
      };

      console.log('FINAL USER PROFILE:', JSON.stringify(userProfile, null, 2));

      // 5. Save all data to AsyncStorage
      await AsyncStorage.multiSet([
        ['userToken', token],
        ['userRole', role],
        ['userId', String(userId)],
        ['user', JSON.stringify(userProfile)],
      ]);

      // Save to AuthContext
      await saveUser(userProfile);

      // 6. Redirect to Seeker Dashboard (Home Screen)
      navigation.reset({
        index: 0,
        routes: [{ name: 'Home' }],
      });
    } catch (error) {
      console.error('LOGIN ERROR:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });

      const requiresOTP = error.response?.data?.requiresOTP;

      if (requiresOTP) {
        Alert.alert(
          'Email Not Verified',
          'Please verify your email with the OTP sent to you.',
          [
            {
              text: 'Verify Now',
              onPress: () => navigation.navigate('VerifyOTP', { email }),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }

      Alert.alert(
        'Login Failed',
        error.response?.data?.message || 'Network error or server is down.'
      );
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Welcome Back</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        <View style={styles.passwordContainer}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
            <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={24} color="#777" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.link}>Register Here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 15,
  },
  passwordInput: {
    flex: 1,
    padding: 15,
  },
  eyeIcon: {
    padding: 15,
  },
  button: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#666',
  },
  link: {
    color: '#007bff',
    fontWeight: 'bold',
  },
});