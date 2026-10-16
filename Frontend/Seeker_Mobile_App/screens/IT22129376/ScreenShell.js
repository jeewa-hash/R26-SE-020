import PageHeader from '../../components/PageHeader';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './theme';
import { useTheme } from '../../hooks/useTheme';

export default function ScreenShell({ title, subtitle, navigation, children, footer }) {
  const { isDarkMode } = useTheme();

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? COLORS.darkBg : COLORS.primary} />
      <PageHeader title={title} subtitle={subtitle} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={[styles.content, footer && styles.contentWithFooter]} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>

      {footer ? <View style={[styles.footer, isDarkMode && styles.footerDark]}>{footer}</View> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  containerDark: { backgroundColor: COLORS.darkBg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff20', alignItems: 'center', justifyContent: 'center' },
  headerTextArea: { flex: 1, minWidth: 0, alignItems: 'center' },
  title: { textAlign: 'center', flexShrink: 1, color: '#fff', fontWeight: '600', fontSize: 18 },
  subtitle: { color: 'rgba(255,255,255,0.78)', fontSize: 12, marginTop: 2, textAlign: 'center' },
  placeholder: { width: 40 },
  content: { padding: 16, paddingBottom: 28 },
  contentWithFooter: { paddingBottom: 110 },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EEF2F7' },
  footerDark: { backgroundColor: COLORS.darkCard, borderTopColor: COLORS.darkBorder },
});
