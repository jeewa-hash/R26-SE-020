import { useTheme } from '../hooks/useTheme';
import { COLORS } from './IT22129376/theme';
import PageHeader from '../components/PageHeader';
import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Animated,
} from "react-native";
import { useTranslation } from "react-i18next";
import { setLanguage } from "../i18n";
import { LanguageContext } from "../context/LanguageContext";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get("window");

export default function LanguageScreen({ navigation }) {
  const { t } = useTranslation();
  const { isDarkMode } = useTheme();
  const C = { bg: isDarkMode ? COLORS.darkBg : '#F8F8FC', card: isDarkMode ? COLORS.darkCard : '#FFFFFF', text: isDarkMode ? COLORS.darkText : COLORS.text, muted: isDarkMode ? COLORS.darkMuted : '#64748B', border: isDarkMode ? COLORS.darkBorder : '#E9E6F4' };
  const { changeLanguage } = useContext(LanguageContext);
  const [selectedLang, setSelectedLang] = useState(null);
  const fadeAnim = useState(new Animated.Value(0))[0];

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const selectLang = async (lang) => {
    setSelectedLang(lang);
    await setLanguage(lang);
    changeLanguage(lang);
    
    // Animate out before navigation
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const role = await AsyncStorage.getItem('userRole');
        if (token && role === 'Seeker') {
          navigation.replace("Home");
        } else {
          navigation.replace("Login");
        }
      } catch (err) {
        console.log('Error determining next screen after language selection:', err);
        navigation.replace("Login");
      }
    });
  };

  const languages = [
    {
      id: "en",
      name: "English",
      nativeName: "English",
      description: "Connect with professionals globally",
      color: "#4F46E5",
    },
    {
      id: "si",
      name: "Sinhala",
      nativeName: "සිංහල",
      description: "ස්වදේශීය සේවා සපයන්නන් සමඟ සම්බන්ධ වන්න",
      color: "#4338CA",
    },
  ];

  const features = [
    { icon: "search", title: "Find Services", desc: "Browse through verified professionals" },
    { icon: "chatbubbles", title: "Chat & Negotiate", desc: "Direct messaging with providers" },
    { icon: "shield-checkmark", title: "Secure Payments", desc: "Safe and trusted transactions" },
    { icon: "star", title: "Quality Service", desc: "Rated and reviewed professionals" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      <PageHeader title="ServiceHub" onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("Login")} />
      
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Why Choose Us?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={[styles.featureCard, { backgroundColor: C.card, borderColor: C.border }]}>
                <View style={[styles.featureIcon, { backgroundColor: "#4F46E515" }]}>
                  <Ionicons name={feature.icon} size={24} color="#4F46E5" />
                </View>
                <Text style={[styles.featureTitle, { color: C.text }]}>{feature.title}</Text>
                <Text style={[styles.featureDesc, { color: C.muted }]}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.languageSection}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Choose Your Language</Text>
          <Text style={[styles.sectionSubtitle, { color: C.muted }]}>Select your preferred language to continue</Text>
          
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[
                styles.languageCard,
                selectedLang === lang.id && styles.languageCardSelected
              ]}
              onPress={() => selectLang(lang.id)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedLang === lang.id ? [lang.color, `${lang.color}CC`] : [C.card, C.card]}
                style={styles.cardGradient}
              >
                <View style={styles.flagContainer}>
                  <Ionicons name="language-outline" size={28} color={lang.color} />
                </View>
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, { color: C.text }, selectedLang === lang.id && styles.languageNameSelected]}>
                    {lang.name}
                  </Text>
                  <Text style={[styles.languageNative, { color: C.muted }, selectedLang === lang.id && styles.languageNativeSelected]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.languageDesc, { color: C.muted }, selectedLang === lang.id && styles.languageDescSelected]}>
                    {lang.description}
                  </Text>
                </View>
                {selectedLang === lang.id && (
                  <View style={styles.checkmark}>
                    <Ionicons name="checkmark-circle" size={28} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        {/* Get Started Button */}
        {selectedLang && (
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={() => selectLang(selectedLang)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={['#4F46E5', '#4338CA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.getStartedGradient}
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: C.muted }]}>By continuing, you agree to our</Text>
          <View style={styles.footerLinks}>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>•</Text>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    paddingBottom: 40,
    width: "100%",
    maxWidth: 760,
    alignSelf: "center",
  },
  heroSection: {
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 50,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  logoWrapper: {
    position: "relative",
    marginBottom: 16,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ffffff30",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ffffff50",
  },
  logoDot: {
    position: "absolute",
    bottom: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FBBF24",
    borderWidth: 2,
    borderColor: "#fff",
  },
  appName: {
    fontSize: 32,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: "#ffffffcc",
  },
  featuresSection: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  featuresGrid: {
    marginTop: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: "48%",
    minHeight: 156,
    borderWidth: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  featureIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
    textAlign: "center",
  },
  featureDesc: {
    lineHeight: 18,
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  languageSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  languageCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  languageCardSelected: {
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  flagContainer: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  flag: {
    fontSize: 32,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 2,
  },
  languageNameSelected: {
    color: "#fff",
  },
  languageNative: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 4,
  },
  languageNativeSelected: {
    color: "#ffffffcc",
  },
  languageDesc: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  languageDescSelected: {
    color: "#ffffffcc",
  },
  checkmark: {
    marginLeft: 8,
  },
  getStartedButton: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  getStartedGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  footer: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 30,
  },
  footerText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 8,
  },
  footerLinks: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  footerLink: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "500",
  },
  footerDot: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});