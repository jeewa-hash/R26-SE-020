// context/ThemeContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();
export const APP_THEME = {
  light: {
    accent: '#4F46E5',
    accentDeep: '#4338CA',
    accentSoft: '#EEF2FF',
    canvas: '#F8FAFC',
    surface: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    muted: '#64748B',
  },
  dark: {
    accent: '#818CF8',
    accentDeep: '#6366F1',
    accentSoft: '#1E1B4B',
    canvas: '#0F172A',
    surface: '#17192C',
    border: '#302E49',
    text: '#F8FAFC',
    muted: '#94A3B8',
  },
};

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load theme preference on startup
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('darkMode');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'true');
      }
    } catch (error) {
      console.log('Error loading theme:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTheme = async () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    try {
      await AsyncStorage.setItem('darkMode', newTheme.toString());
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  const setTheme = async (value) => {
    setIsDarkMode(value);
    try {
      await AsyncStorage.setItem('darkMode', value.toString());
    } catch (error) {
      console.log('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        toggleTheme,
        setTheme,
        isLoading,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};