import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SEEKER_TABS, seekerActiveTab, openSeekerTab } from '../utils/seekerNavigation';
import React, { useContext, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Keyboard, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { LanguageContext } from '../context/LanguageContext';

const HIDDEN_ROUTES = new Set([
  'Login', 'Register', 'VerifyOTP', 'Language', 'Onboarding',
]);

const BottomNav = ({ navigationRef, currentRouteName, isRootNav = false }) => {
  const { isDarkMode } = useTheme();
  const { language } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';
  const insets = useSafeAreaInsets();
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);

  // This bar is beside the navigator rather than inside a Stack.Screen.
  // Using the ref avoids the useRoute/useNavigation context error.
  if (!isRootNav || keyboardVisible || currentRouteName === 'ChatScreen' || HIDDEN_ROUTES.has(currentRouteName)) {
    return null;
  }

  const navigate = screenName => openSeekerTab(navigationRef?.current || navigationRef, screenName);
  const navItems = SEEKER_TABS.map(item => ({ ...item, label: isSi ? item.labelSi : item.label }));
  const isActive = id => seekerActiveTab(currentRouteName) === id;

  const inactiveColor = isDarkMode ? '#94A3B8' : '#64748B';
  const activeColor = isDarkMode ? '#818cf8' : '#4F46E5';
  const activeBg = isDarkMode ? 'rgba(129, 140, 248, 0.15)' : 'rgba(79, 70, 229, 0.1)';

  return (
    <View style={[styles.navContainer, isDarkMode && styles.navContainerDark, { paddingBottom: insets.bottom }]}>
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);

        if (item.isCreateButton) {
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.navItem}
              onPress={() => navigate(item.routeName)}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <LinearGradient
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#4F46E5', '#7C3AED']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.createButton, { borderColor: isDarkMode ? '#17192C' : '#ffffff' }]}
              >
                <MaterialIcons name={item.icon} size={30} color="#fff" />
              </LinearGradient>
              <Text numberOfLines={1} style={[styles.createNavLabel, { color: active ? activeColor : (isDarkMode ? '#cbd5e1' : '#475569') }]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => navigate(item.routeName)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
          >
            <View style={[styles.iconWrapper, active && { backgroundColor: activeBg }]}>
              <MaterialIcons
                name={active && item.activeIcon ? item.activeIcon : item.icon}
                size={23}
                color={active ? activeColor : inactiveColor}
              />
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.navLabel,
                { color: active ? activeColor : inactiveColor },
                active && styles.activeLabel,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: { flexShrink: 0, backgroundColor: '#ffffff' },
  navContainerDark: { backgroundColor: '#17192C' },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 76,
    paddingVertical: 8,
    paddingHorizontal: 2,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  bottomNavDark: { backgroundColor: '#17192C', borderTopColor: '#302E49' },
  navItem: {
    flex: 1,
    minWidth: 0,
    minHeight: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  iconWrapper: {
    width: 38,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: { width: '100%', textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: '500' },
  activeLabel: { fontWeight: '700' },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  createNavLabel: { width: '100%', textAlign: 'center', fontSize: 10, lineHeight: 14, fontWeight: '700' },
});

export default BottomNav;
