import React, { useState, useRef, useContext, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Switch,
  ScrollView,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { ThemeContext } from '../context/ThemeContext';
import { LanguageContext } from '../context/LanguageContext';
import SettingsScreen from '../screens/SettingsScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { clearCredentials } from '../utils/biometricAuth';
import { CommonActions, useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.72;

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
];

const SIDEBAR_MENU = [
  { id: '1', icon: 'edit', label: 'Edit Profile', route: 'EditProfile', color: '#2563EB', bg: '#EFF6FF' },
  { id: '2', icon: 'bar-chart', label: 'Performance', route: 'Stats', color: '#7C3AED', bg: '#F5F3FF' },
  { id: '3', icon: 'emoji-events', label: 'My Badges', route: 'Badges', color: '#F59E0B', bg: '#FFFBEB' },
  { id: '4', icon: 'credit-card', label: 'Subscription', route: 'Subscription', color: '#059669', bg: '#ECFDF5' },
  { id: '5', icon: 'settings', label: 'Settings', route: 'Settings', color: '#6B7280', bg: '#F9FAFB' },
  { id: '6', icon: 'help-outline', label: 'Help & Support', route: 'Help', color: '#0891B2', bg: '#ECFEFF' },
];

export default function ProfileHeader({ 
  navigation: propNavigation, 
  onLogout, 
  externalVisible = false, 
  onClose = null,
  userName = 'Kasun Perera',
  userInitials = 'KP',
}) {
  const { i18n } = useTranslation();
  const { isDark, toggleTheme } = useContext(ThemeContext);
  const { language, setLanguage } = useContext(LanguageContext);
  
  // Use prop navigation or fallback to useNavigation hook
  const navigation = propNavigation || useNavigation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const sideAnim = useRef(new Animated.Value(SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  // Control sidebar from external props
  useEffect(() => {
    if (externalVisible) {
      openSidebar();
    } else {
      closeSidebar();
    }
  }, [externalVisible]);

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(sideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(sideAnim, { toValue: SIDEBAR_WIDTH, useNativeDriver: true, tension: 65, friction: 11 }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setSidebarOpen(false);
      if (onClose) onClose(); // Call external close handler
    });
  };

  const handleNav = (route) => {
    closeSidebar();
    if (route) {
      setTimeout(() => {
        try {
          navigation.navigate(route);
        } catch (error) {
          console.log('Navigation error:', error);
          if (navigation.getParent) {
            navigation.getParent()?.navigate(route);
          }
        }
      }, 300);
    }
  };

  const changeLanguage = (code) => {
    setLanguage(code);
    i18n.changeLanguage(code);
  };

  const handleLogout = async () => {
    await clearCredentials();
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      })
    );
  };

  return (
    <>
      {/* ── Top Header Bar ── */}
      <View style={[styles.header, { backgroundColor: isDark ? '#1c1c1e' : '#fff', borderBottomColor: isDark ? '#2c2c2e' : '#F0F0F5' }]}>
        {/* Logo + App name */}
        <View style={styles.brandRow}>
          <View style={[styles.logoBox, { backgroundColor: isDark ? '#fff' : '#111' }]}>
            <Text style={{ fontSize: 16, color: isDark ? '#111' : '#fff' }}>⚡</Text>
          </View>
          <View>
            <Text style={[styles.appName, { color: isDark ? '#F2F2F7' : '#111' }]}>LocalPro</Text>
            <Text style={[styles.appTagline, { color: isDark ? '#8E8E93' : '#AAAAAA' }]}>Service Provider</Text>
          </View>
        </View>

        {/* Right actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: isDark ? '#2c2c2e' : '#F5F5F7', borderColor: isDark ? '#3a3a3c' : '#EBEBEB' }]}
            onPress={() => navigation.navigate('Notifications')}
          >
            <MaterialIcons name="notifications-none" size={20} color={isDark ? '#F2F2F7' : '#111'} />
            <View style={[styles.notifDot, { borderColor: isDark ? '#1c1c1e' : '#fff' }]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuBtn, { backgroundColor: isDark ? '#2c2c2e' : '#F5F5F7', borderColor: isDark ? '#3a3a3c' : '#EBEBEB' }]}
            onPress={openSidebar}
          >
            <View style={styles.burgerLines}>
              <View style={[styles.burgerLine, { backgroundColor: isDark ? '#F2F2F7' : '#111' }]} />
              <View style={[styles.burgerLine, { width: 14, backgroundColor: isDark ? '#F2F2F7' : '#111' }]} />
              <View style={[styles.burgerLine, { backgroundColor: isDark ? '#F2F2F7' : '#111' }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]} pointerEvents="auto">
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closeSidebar} />
        </Animated.View>
      )}

      {/* ── Right Sidebar ── */}
      <Animated.View style={[styles.sidebar, { backgroundColor: isDark ? '#1c1c1e' : '#fff', transform: [{ translateX: sideAnim }] }]}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Sidebar header */}
          <LinearGradient
            colors={['#1D4ED8', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sidebarHeader}
          >
            <TouchableOpacity style={styles.closeBtn} onPress={closeSidebar}>
              <MaterialIcons name="close" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>

            {/* Mini logo + name */}
            <View style={styles.sidebarBrand}>
              <View style={styles.sidebarLogoBox}>
                <Text style={{ fontSize: 18 }}>⚡</Text>
              </View>
              <View>
                <Text style={styles.sidebarAppName}>LocalPro</Text>
                <Text style={styles.sidebarAppSub}>Service Provider</Text>
              </View>
            </View>

            <View style={styles.sidebarDividerLine} />

            {/* User info */}
            <View style={styles.sidebarAvatar}>
              <Text style={styles.sidebarAvatarText}>{userInitials}</Text>
            </View>
            <Text style={styles.sidebarName}>{userName}</Text>
            <Text style={styles.sidebarHandle}>@{userName.toLowerCase().replace(' ', '')}</Text>
            <View style={styles.sidebarBadge}>
              <MaterialIcons name="emoji-events" size={11} color="#FAC775" />
              <Text style={styles.sidebarBadgeText}>Top Rated Pro</Text>
            </View>
          </LinearGradient>

          {/* Menu items */}
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionLabel, { color: isDark ? '#8E8E93' : '#AAAAAA' }]}>MENU</Text>
            {SIDEBAR_MENU.map((item, index) => {
              const isSettings = item.route === 'Settings';
              return (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.menuRow}
                    onPress={() => {
                      if (isSettings) {
                        setSettingsOpen(!settingsOpen);
                      } else {
                        console.log(`Navigating to: ${item.route}`);
                        handleNav(item.route);
                      }
                    }}
                    activeOpacity={0.6}
                  >
                    <View style={[styles.menuIconBox, { backgroundColor: item.bg }]}>
                      <MaterialIcons name={item.icon} size={18} color={item.color} />
                    </View>
                    <Text style={[styles.menuLabel, { color: isDark ? '#F2F2F7' : '#111' }]}>{item.label}</Text>
                    <MaterialIcons
                      name={isSettings ? (settingsOpen ? 'expand-less' : 'expand-more') : 'chevron-right'}
                      size={18}
                      color={isDark ? '#48484A' : '#D1D5DB'}
                    />
                  </TouchableOpacity>

                  {/* Settings dropdown */}
                  {isSettings && settingsOpen && <SettingsScreen isDark={isDark} />}

                  {index < SIDEBAR_MENU.length - 1 && (
                    <View style={[styles.menuDivider, { backgroundColor: isDark ? '#2c2c2e' : '#F1F5F9', marginLeft: 62 }]} />
                  )}
                </View>
              );
            })}
          </View>

          {/* Preferences */}
          <View style={styles.menuSection}>
            <Text style={[styles.menuSectionLabel, { color: isDark ? '#8E8E93' : '#AAAAAA' }]}>PREFERENCES</Text>

            {/* Dark mode */}
            <View style={styles.menuRow}>
              <View style={[styles.menuIconBox, { backgroundColor: isDark ? '#1a1a2e' : '#F0F0FF' }]}>
                <MaterialIcons name={isDark ? 'dark-mode' : 'light-mode'} size={18} color={isDark ? '#AFA9EC' : '#534AB7'} />
              </View>
              <Text style={[styles.menuLabel, { color: isDark ? '#F2F2F7' : '#111' }]}>Dark Mode</Text>
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: '#E5E7EB', true: '#7C3AED' }}
                thumbColor="#fff"
                style={{ transform: [{ scale: 0.85 }] }}
              />
            </View>

            <View style={[styles.menuDivider, { backgroundColor: isDark ? '#2c2c2e' : '#F1F5F9', marginLeft: 62 }]} />

            {/* Language */}
            <View style={styles.menuRow}>
              <View style={[styles.menuIconBox, { backgroundColor: isDark ? '#0d2820' : '#ECFDF5' }]}>
                <MaterialIcons name="language" size={18} color={isDark ? '#5DCAA5' : '#059669'} />
              </View>
              <Text style={[styles.menuLabel, { color: isDark ? '#F2F2F7' : '#111' }]}>Language</Text>
            </View>
            <View style={styles.langPills}>
              {LANGUAGES.map((lang) => {
                const active = language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => changeLanguage(lang.code)}
                    style={[
                      styles.langPill,
                      {
                        backgroundColor: active ? '#7C3AED' : (isDark ? '#2a2a2a' : '#F1F5F9'),
                        borderColor: active ? 'transparent' : (isDark ? '#3a3a3c' : '#E2E8F0'),
                      },
                    ]}
                  >
                    <Text style={[styles.langPillText, { color: active ? '#fff' : (isDark ? '#8E8E93' : '#6B7280') }]}>
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: isDark ? '#2d0f0f' : '#FEF2F2', borderColor: isDark ? '#501313' : '#FECACA' }]}
            onPress={handleLogout}
          >
            <MaterialIcons name="logout" size={18} color="#DC2626" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>

          <Text style={[styles.versionText, { color: isDark ? '#3a3a3c' : '#D1D5DB' }]}>
            LocalPro v1.0.0 · SLIIT R26-SE-020
          </Text>
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  /* ── Header bar ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    zIndex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  appTagline: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#7F77DD',
    borderWidth: 1.5,
  },
  menuBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  burgerLines: {
    gap: 4,
    alignItems: 'flex-end',
  },
  burgerLine: {
    width: 18,
    height: 2,
    borderRadius: 2,
  },

  /* ── Overlay ── */
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 10,
  },

  /* ── Sidebar ── */
  sidebar: {
    position: 'absolute',
    top: 0, right: 0, bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 11,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sidebarHeader: {
    padding: 24,
    paddingTop: 56,
    alignItems: 'center',
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    top: 52,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    marginBottom: 16,
  },
  sidebarLogoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarAppName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  sidebarAppSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
  },
  sidebarDividerLine: {
    width: '100%',
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  sidebarAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: 'rgba(255,255,255,0.45)',
    marginBottom: 10,
  },
  sidebarAvatarText: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  sidebarName: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 3 },
  sidebarHandle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 10 },
  sidebarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sidebarBadgeText: { fontSize: 12, color: '#fff', fontWeight: '600' },

  /* Menu */
  menuSection: { padding: 16 },
  menuSectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  menuIconBox: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontWeight: '500' },
  menuDivider: { height: 0.5 },

  /* Language */
  langPills: { flexDirection: 'row', gap: 8, paddingLeft: 50, paddingBottom: 8 },
  langPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5 },
  langPillText: { fontSize: 13, fontWeight: '600' },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 16,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
  versionText: { textAlign: 'center', fontSize: 11, marginBottom: 32 },
});