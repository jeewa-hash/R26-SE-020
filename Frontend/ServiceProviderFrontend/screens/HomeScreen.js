import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials } from '../utils/biometricAuth';

export default function HomeScreen({ navigation }) {
  const handleLogout = async () => {
    await clearCredentials();
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    navigation.replace('Login');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Provider!</Text>
      <Text style={styles.subtitle}>Your account is verified and active.</Text>
      
      <TouchableOpacity style={styles.button} onPress={handleLogout}>
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20, 
    backgroundColor: '#f5f5f5'
  },
  title: {
    fontSize: 28, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10, 
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold'
  }
});
