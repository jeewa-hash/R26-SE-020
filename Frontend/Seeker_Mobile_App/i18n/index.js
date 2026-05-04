import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";

import en from "./en.json";
import si from "./si.json";

const LANG_KEY = "seeker_lang";

const resources = {
  en: { translation: en },
  si: { translation: si },
};

// init
i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// load saved language
export const loadLanguage = async () => {
  const lang = await AsyncStorage.getItem(LANG_KEY);
  if (lang) {
    i18n.changeLanguage(lang);
  }
};

// change language
export const setLanguage = async (lang) => {
  await AsyncStorage.setItem(LANG_KEY, lang);
  await i18n.changeLanguage(lang);
};

export default i18n;