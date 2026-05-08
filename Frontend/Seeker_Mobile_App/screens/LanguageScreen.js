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

const { width, height } = Dimensions.get("window");

export default function LanguageScreen({ navigation }) {
  const { t } = useTranslation();
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
    }).start(() => {
      navigation.replace("Home");
    });
  };

  const languages = [
    {
      id: "en",
      name: "English",
      nativeName: "English",
      flag: "🇺🇸",
      description: "Connect with professionals globally",
      color: "#667eea",
    },
    {
      id: "si",
      name: "Sinhala",
      nativeName: "සිංහල",
      flag: "🇱🇰",
      description: "ස්වදේශීය සේවා සපයන්නන් සමඟ සම්බන්ධ වන්න",
      color: "#764ba2",
    },
  ];

  const features = [
    { icon: "search", title: "Find Services", desc: "Browse through verified professionals" },
    { icon: "chatbubbles", title: "Chat & Negotiate", desc: "Direct messaging with providers" },
    { icon: "shield-checkmark", title: "Secure Payments", desc: "Safe and trusted transactions" },
    { icon: "star", title: "Quality Service", desc: "Rated and reviewed professionals" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <Animated.ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={["#667eea", "#764ba2", "#f093fb"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <View style={styles.logoWrapper}>
            <View style={styles.logoContainer}>
              <Ionicons name="briefcase" size={40} color="#fff" />
            </View>
            <View style={styles.logoDot} />
          </View>
          <Text style={styles.appName}>ServiceHub</Text>
          <Text style={styles.tagline}>Connect with trusted professionals</Text>
        </LinearGradient>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Why Choose Us?</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <View style={[styles.featureIcon, { backgroundColor: "#667eea15" }]}>
                  <Ionicons name={feature.icon} size={24} color="#667eea" />
                </View>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Language Selection */}
        <View style={styles.languageSection}>
          <Text style={styles.sectionTitle}>Choose Your Language</Text>
          <Text style={styles.sectionSubtitle}>Select your preferred language to continue</Text>
          
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
                colors={selectedLang === lang.id ? [lang.color, `${lang.color}CC`] : ["#ffffff", "#f8f9fa"]}
                style={styles.cardGradient}
              >
                <View style={styles.flagContainer}>
                  <Text style={styles.flag}>{lang.flag}</Text>
                </View>
                <View style={styles.languageInfo}>
                  <Text style={[styles.languageName, selectedLang === lang.id && styles.languageNameSelected]}>
                    {lang.name}
                  </Text>
                  <Text style={[styles.languageNative, selectedLang === lang.id && styles.languageNativeSelected]}>
                    {lang.nativeName}
                  </Text>
                  <Text style={[styles.languageDesc, selectedLang === lang.id && styles.languageDescSelected]}>
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
              colors={['#667eea', '#764ba2']}
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
          <Text style={styles.footerText}>By continuing, you agree to our</Text>
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
    paddingTop: 30,
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  featureCard: {
    width: (width - 50) / 2,
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
    fontSize: 11,
    color: "#6B7280",
    textAlign: "center",
  },
  languageSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
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
    shadowColor: "#667eea",
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
    color: "#667eea",
    fontWeight: "500",
  },
  footerDot: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});