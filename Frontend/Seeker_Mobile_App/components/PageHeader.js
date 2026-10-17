import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';
import { COLORS } from '../screens/IT22129376/theme';

export default function PageHeader({ title, subtitle, onBack, showBack = true, leading, renderActions }) {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const textColor = isDarkMode ? COLORS.darkText : COLORS.text;
  const goBack = onBack || (() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'));
  return <LinearGradient colors={isDarkMode ? ['#24223E', '#1A1A2E'] : ['#EDE9FF', '#F5F2FF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.header, { borderBottomColor: isDarkMode ? '#34304E' : '#DFD9F7' }]}>
    <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#24223E' : '#EDE9FF'} />
    {showBack ? <TouchableOpacity accessibilityRole="button" accessibilityLabel="Back" onPress={goBack} style={[styles.back, { backgroundColor: isDarkMode ? '#FFFFFF0D' : '#FFFFFF99' }]}><Ionicons name="arrow-back" size={24} color={textColor} /></TouchableOpacity> : null}
    {leading}
    <View style={styles.text}><Text style={[styles.title, { color: textColor }]}>{title}</Text>{subtitle ? <Text style={[styles.subtitle, { color: isDarkMode ? COLORS.darkMuted : COLORS.muted }]}>{subtitle}</Text> : null}</View>
    {renderActions ? <View style={styles.actions}>{renderActions({ textColor, isDarkMode })}</View> : null}
  </LinearGradient>;
}
const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 }, back: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, text: { flex: 1, minWidth: 0 }, title: { fontSize: 22, lineHeight: 28, fontWeight: '700' }, subtitle: { fontSize: 12, lineHeight: 18, marginTop: 2 }, actions: { flexDirection: 'row', alignItems: 'center', gap: 8 } });
