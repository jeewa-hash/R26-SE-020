import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { APP_THEME } from '../context/ThemeContext';

export default function PageHeader({ title, subtitle, onBack, showBack = true, leading, renderActions }) {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const colors = isDarkMode ? APP_THEME.dark : APP_THEME.light;
  const textColor = colors.text;
  const goBack = onBack || (() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'));
  return <LinearGradient colors={isDarkMode ? [colors.surface, colors.canvas] : [colors.surface, colors.canvas]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { borderBottomColor: colors.border }]}>
    <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />
    {showBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={[styles.back, { backgroundColor: colors.accentSoft }]}><Ionicons name="arrow-back" size={24} color={colors.accent} /></TouchableOpacity> : null}
    {leading}
    <View style={styles.text}><Text style={[styles.title, { color: textColor }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}</View>
    {renderActions ? <View style={styles.actions}>{renderActions({ textColor, isDarkMode })}</View> : null}
  </LinearGradient>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, text: { flex: 1, minWidth: 0 }, title: { fontSize: 22, lineHeight: 28, fontWeight: '700' }, subtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
