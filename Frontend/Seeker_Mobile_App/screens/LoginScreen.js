import React, { useState, useContext } from 'react';
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
  StatusBar,
} from 'react-native';

import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { IP_ADDRESS, AUTH_SERVICE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { LanguageContext } from '../context/LanguageContext';
import { setLanguage } from '../i18n';

const API_URL = AUTH_SERVICE_URL
  ? `${AUTH_SERVICE_URL}/seeker`
  : `https://r26-auth-service.onrender.com/seeker`;

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
  const { language, changeLanguage } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleLanguage = async () => {
    const nextLang = isSi ? 'en' : 'si';
    await setLanguage(nextLang);
    if (changeLanguage) changeLanguage(nextLang);
  };

  // =====================================================
  // LOGIN
  // =====================================================
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        isSi ? 'දෝෂයකි' : 'Required Fields',
        isSi ? 'කරුණාකර ඊමේල් ලිපිනය සහ මුරපදය ඇතුළත් කරන්න' : 'Please enter your email and password'
      );
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

      const token = response.data?.token;
      const role = response.data?.role || 'Seeker';

      if (!token) {
        Alert.alert(
          isSi ? 'පිවිසුම් දෝෂයකි' : 'Login Error',
          isSi ? 'සත්‍යාපන ටෝකනයක් නොලැබුණි.' : 'Authentication token was not received.'
        );
        return;
      }

      // 2. Decode token to get userId
      const decodedToken = decodeJWT(token);
      const userId = decodedToken?.user?.id;

      if (!userId) {
        Alert.alert(
          isSi ? 'දෝෂයකි' : 'Token Error',
          isSi ? 'පරිශීලක හැඳුනුම් අංකය ලබාගත නොහැක.' : 'Could not retrieve user ID from token.'
        );
        return;
      }

      // 3. Save to AsyncStorage
      await AsyncStorage.setItem('userToken', token);
      await AsyncStorage.setItem('userRole', role);
      await AsyncStorage.setItem('userId', userId);

      // 4. Fetch full seeker profile
      try {
        const profileRes = await axios.get(`${API_URL}/user/${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
        });

        const userData = profileRes.data?.user || profileRes.data;
        if (userData) {
          await AsyncStorage.setItem('user', JSON.stringify(userData));
          saveUser(userData);
        } else {
          saveUser({ id: userId, email: email.trim(), role });
        }
      } catch (profileErr) {
        console.warn('Could not fetch seeker profile:', profileErr.message);
        saveUser({ id: userId, email: email.trim(), role });
      }

      Alert.alert(
        isSi ? 'සාර්ථකයි!' : 'Welcome Back!',
        isSi ? 'ඔබ සාර්ථකව පිවිසුණි' : 'You have logged in successfully',
        [{ text: isSi ? 'හරි' : 'OK', onPress: () => navigation.replace('Home') }]
      );
    } catch (error) {
      console.error('LOGIN ERROR:', error.response?.data || error.message);

      if (error.response?.data?.notVerified) {
        Alert.alert(
          isSi ? 'ඊමේල් තහවුරු කර නැත' : 'Email Not Verified',
          isSi
            ? 'ඔබේ ඊමේල් ලිපිනය තවම තහවුරු කර නැත. කරුණාකර OTP කේතය භාවිතයෙන් තහවුරු කරන්න.'
            : 'Your email is not verified yet. Please verify using the OTP sent to your email.',
          [
            { text: isSi ? 'පසුවට' : 'Cancel', style: 'cancel' },
            {
              text: isSi ? 'දැන් තහවුරු කරන්න' : 'Verify Now',
              onPress: () =>
                navigation.navigate('VerifyOTP', {
                  email: error.response?.data?.email || email.trim(),
                }),
            },
          ]
        );
        return;
      }

      Alert.alert(
        isSi ? 'පිවිසුම අසාර්ථකයි' : 'Login Failed',
        error.response?.data?.message || (isSi ? 'ජාල දෝෂයක් හෝ සේවාදායකයේ දෝෂයකි.' : 'Network error or server is down.')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4338CA" />

      {/* Top Hero Card */}
      <LinearGradient
        colors={['#3730A3', '#4338CA', '#4F46E5']}
        style={styles.heroSection}
      >
        <View style={styles.topBar}>
          <View style={styles.appBadge}>
            <MaterialIcons name="handyman" size={20} color="#fff" />
            <Text style={styles.appBadgeText}>WorkWave</Text>
          </View>

          {/* Language Toggle Button */}
          <TouchableOpacity
            style={styles.languageToggleBtn}
            onPress={toggleLanguage}
            activeOpacity={0.8}
            accessibilityLabel="Toggle Language"
          >
            <Text style={styles.languageToggleText}>
              {isSi ? 'සිංහල' : 'English'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.heroTitle}>
          {isSi ? 'නැවත සාදරයෙන් පිළිගනිමු!' : 'Welcome Back!'}
        </Text>
        <Text style={styles.heroSubtitle}>
          {isSi
            ? 'ඔබේ ගිණුමට ඇතුල් වී සේවාවන් ලබාගන්න'
            : 'Sign in to find trusted experts & track bookings'}
        </Text>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.formCard}>
          {/* Email Input */}
          <Text style={styles.inputLabel}>
            {isSi ? 'ඊමේල් ලිපිනය' : 'Email Address'}
          </Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="email" size={22} color="#6366F1" style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={isSi ? 'ඔබේ ඊමේල් ලිපිනය' : 'name@example.com'}
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>
            {isSi ? 'මුරපදය' : 'Password'}
          </Text>
          <View style={styles.inputContainer}>
            <MaterialIcons name="lock" size={22} color="#6366F1" style={styles.fieldIcon} />
            <TextInput
              style={styles.textInput}
              placeholder={isSi ? 'ඔබේ මුරපදය ඇතුළත් කරන්න' : 'Enter your password'}
              placeholderTextColor="#94A3B8"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowPassword(!showPassword)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialIcons
                name={showPassword ? 'visibility' : 'visibility-off'}
                size={22}
                color="#64748B"
              />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.loginBtnWrapper}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.loginBtnText}>
                    {isSi ? 'ඇතුල් වන්න' : 'Sign In'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                </View>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Register Prompt */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>
              {isSi ? 'ගිණුමක් නැද්ද? ' : "Don't have an account? "}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.linkText}>
                {isSi ? 'ලියාපදිංචි වන්න' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  heroSection: {
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 16 : 48,
    paddingBottom: 40,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  appBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  appBadgeText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  languageToggleBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  languageToggleText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#4338CA',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  inputLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    marginBottom: 20,
    height: 52,
  },
  fieldIcon: {
    marginRight: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0F172A',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  loginBtnWrapper: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  loginBtn: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#64748B',
    fontSize: 14,
  },
  linkText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 14,
  },
});
