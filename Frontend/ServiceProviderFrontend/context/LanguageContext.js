import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../locales';

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(i18n.language || 'en');

  useEffect(() => {
    AsyncStorage.getItem('language').then((val) => {
      if (val) {
        setLanguageState(val);
        i18n.changeLanguage(val);
      } else {
        AsyncStorage.getItem('selectedLanguage').then((val2) => {
          if (val2) {
            setLanguageState(val2);
            i18n.changeLanguage(val2);
          }
        });
      }
    });
  }, []);

  const setLanguage = (code) => {
    setLanguageState(code);
    AsyncStorage.setItem('language', code);
    AsyncStorage.setItem('selectedLanguage', code);
    i18n.changeLanguage(code);
  };

  const t = (key, options) => i18n.t(key, options);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}