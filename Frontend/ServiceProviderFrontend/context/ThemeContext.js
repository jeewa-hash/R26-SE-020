import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme')
      .then((val) => {
        if (val === 'dark') setIsDark(true);
      })
      .catch((err) => console.error('Failed to load theme:', err))
      .finally(() => setIsThemeLoaded(true));
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem('theme', next ? 'dark' : 'light').catch((err) =>
        console.error('Failed to save theme:', err)
      );
      return next;
    });
  };

  // Prevent children from reading undefined state while loading initial theme
  if (!isThemeLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to guarantee safe context consumption
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};