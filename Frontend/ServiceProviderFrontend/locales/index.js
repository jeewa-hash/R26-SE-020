import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import si from './si';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      si: { translation: si },
      
    },
    lng: 'en',           // default language
    fallbackLng: 'en',   // fallback if translation missing
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;