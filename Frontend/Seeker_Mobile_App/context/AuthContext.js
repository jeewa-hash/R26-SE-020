import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.log('Error loading auth user:', error);
      } finally {
        setIsReady(true);
      }
    };

    loadUser();
  }, []);

  const saveUser = async (userPayload) => {
    setUser(userPayload);
    await AsyncStorage.setItem('user', JSON.stringify(userPayload));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.multiRemove(['userToken', 'userRole', 'user']);
  };

  return (
    <AuthContext.Provider value={{ user, isReady, saveUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
