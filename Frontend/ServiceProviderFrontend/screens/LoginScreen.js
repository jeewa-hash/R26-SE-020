import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';
import {
  saveCredentials,
  hasStoredCredentials,
  isBiometricAvailable,
  promptBiometric,
  getToken,
} from '../utils/biometricAuth';

const API_URL = `http://${IP_ADDRESS}:4003`;

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fingerprintReady, setFingerprintReady] = useState(false);

  useEffect(() => {
    checkFingerprintStatus();
  }, []);

  const checkFingerprintStatus = async () => {
    const hasCreds = await hasStoredCredentials();
    const bioAvailable = await isBiometricAvailable();
    setFingerprintReady(hasCreds && bioAvailable);
  };

  const handleFingerprintLogin = async () => {
    const result = await promptBiometric();
    if (result.success) {
      const token = await getToken();
      if (token) {
        navigation.replace('Home');
      } else {
        Alert.alert('Error', 'Session expired. Please log in with your password.');
        setFingerprintReady(false);
      }
    } else {
      Alert.alert('Authentication Failed', 'Fingerprint verification failed. Please use your password.');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password
      });

      await saveCredentials(response.data.token, response.data.role);
      await AsyncStorage.setItem('userToken', response.data.token);
      await AsyncStorage.setItem('userRole', response.data.role);

      Alert.alert('Success', 'Logged in successfully!');
      navigation.replace('Home');
      
    } catch (error) {
      const msg = error.response?.data?.message || 'Something went wrong';
      console.log('Login Error:', msg);
      Alert.alert('Login Failed', msg);
    } finally {
      setLoading(false);
    }
  };

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
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <MaterialIcons 
              name={showPassword ? 'visibility' : 'visibility-off'} 
              size={24} 
              color="#777" 
            />
          </TouchableOpacity>
        </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>

        {fingerprintReady && (
          <TouchableOpacity
            style={styles.fingerprintButton}
            onPress={handleFingerprintLogin}
            activeOpacity={0.8}
          >
            <MaterialIcons name="fingerprint" size={26} color="#6366f1" />
            <Text style={styles.fingerprintButtonText}>Login with Fingerprint</Text>
          </TouchableOpacity>
        )}

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

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    padding: 20, 
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 30, 
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ddd'
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
    marginTop: 10
  },
  buttonText: {
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold'
  },
  footer: {
    flexDirection: 'row', 
    justifyContent: 'center', 
    marginTop: 20
  },
  footerText: {
    color: '#666'
  },
  link: {
    color: '#007bff', 
    fontWeight: 'bold'
  },
  fingerprintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#6366f1',
    gap: 8,
  },
  fingerprintButtonText: {
    color: '#6366f1',
    fontSize: 15,
    fontWeight: '700',
  }
});
