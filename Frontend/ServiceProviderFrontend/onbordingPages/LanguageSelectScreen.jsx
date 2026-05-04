import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Button, Switch } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import i18n from '../locales';
import { Colors } from '../theme';

const languages = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'si', label: 'Sinhala', native: 'සිංහල' },
];

export default function LanguageSelectScreen({ navigation }) {
  const { t } = useTranslation();
  const [selectedLang, setSelectedLang] = useState('en');
  const [skipTutorial, setSkipTutorial] = useState(false);

  const handleSelectLanguage = (langId) => {
    setSelectedLang(langId);
    i18n.changeLanguage(langId); // ← instantly changes language as user selects
  };

  const handleContinue = async () => {
    await AsyncStorage.setItem('selectedLanguage', selectedLang);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Home' }],
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <View style={styles.helpBox}>
            <Text style={styles.helpText}>?</Text>
          </View>
        </View>

        {/* Title — changes language instantly */}
        <Text style={styles.title}>{t('welcome')}</Text>
        <Text style={styles.subtitle}>{t('selectLanguage')}</Text>

        {/* Language Cards */}
        {languages.map((lang) => {
          const isSelected = selectedLang === lang.id;
          return (
            <TouchableOpacity
              key={lang.id}
              onPress={() => handleSelectLanguage(lang.id)}
              style={[styles.languageCard, isSelected && styles.languageCardSelected]}
            >
              {isSelected && (
                <View style={styles.checkmark}>
                  <Text style={styles.checkmarkText}>✓</Text>
                </View>
              )}
              <View style={[styles.langIcon, isSelected && styles.langIconSelected]}>
                <Text style={styles.langIconEmoji}>🌐</Text>
              </View>
              <Text style={styles.langNative}>{lang.native}</Text>
              <Text style={styles.langLabel}>{lang.label}</Text>
            </TouchableOpacity>
          );
        })}

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>{t('languageNote')}</Text>
        </View>

        {/* Skip Tutorial */}
        <View style={styles.toggleBox}>
          <View>
            <Text style={styles.toggleTitle}>{t('skipTutorial')}</Text>
            <Text style={styles.toggleSubtitle}>{t('skipTutorialSub')}</Text>
          </View>
          <Switch
            value={skipTutorial}
            onValueChange={setSkipTutorial}
            color={Colors.primary}
          />
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <Button
          mode="contained"
          onPress={handleContinue}
          contentStyle={styles.buttonContent}
          style={styles.button}
          labelStyle={styles.buttonLabel}
          icon="chevron-right"
        >
          {t('continue')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  scrollContent: { padding: 24, paddingTop: 60 },
  footer: { padding: 24, paddingBottom: 36 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  logoBox: { width: 44, height: 44, backgroundColor: Colors.black, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logoText: { color: Colors.white, fontSize: 20 },
  helpBox: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: Colors.border, justifyContent: 'center', alignItems: 'center' },
  helpText: { fontSize: 18, color: Colors.text },
  title: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textLight, marginBottom: 32, lineHeight: 22 },
  languageCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 14, padding: 20, marginBottom: 14, backgroundColor: '#FAFAFA', alignItems: 'center' },
  languageCardSelected: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: '#EEF0FF' },
  checkmark: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  checkmarkText: { color: Colors.white, fontSize: 14 },
  langIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.border, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  langIconSelected: { backgroundColor: Colors.primary },
  langIconEmoji: { fontSize: 22 },
  langNative: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 2 },
  langLabel: { fontSize: 13, color: Colors.textLight },
  infoBox: { flexDirection: 'row', backgroundColor: '#EEF4FF', borderRadius: 12, padding: 14, marginBottom: 16, gap: 10 },
  infoIcon: { fontSize: 16 },
  infoText: { flex: 1, fontSize: 13, color: Colors.text, lineHeight: 20 },
  toggleBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, padding: 16, marginBottom: 32 },
  toggleTitle: { fontSize: 15, fontWeight: '600', color: Colors.text },
  toggleSubtitle: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  button: { borderRadius: 14 },
  buttonContent: { height: 52 },
  buttonLabel: { fontSize: 16, fontWeight: 'bold' },
});