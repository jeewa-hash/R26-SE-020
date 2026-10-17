import { COLORS } from '../pages/IT22129376/theme';
import React, { useContext } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';
import HeaderSection from './HeaderSection';

export default function ProviderPageHeader({ navigation, title, subtitle, showBack = true }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const colors = {
    bg: isDark ? COLORS.darkBg : COLORS.bg,
    text: isDark ? COLORS.darkText : COLORS.text,
    muted: isDark ? COLORS.darkMuted : COLORS.muted,
    iconBg: isDark ? COLORS.darkCard : COLORS.card,
    border: isDark ? COLORS.darkBorder : COLORS.border,
  };

  return (
    <>
      <HeaderSection navigation={navigation} onInboxPress={() => navigation.navigate('InboxScreen')} />
      <View style={[styles.pageRow, { backgroundColor: colors.bg, borderBottomColor: colors.border }]}>
        {showBack ? (
          <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.iconBg, borderColor: colors.border }]} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.copy}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  pageRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 0.5 },
  backButton: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 20, fontWeight: '600' },
  subtitle: { fontSize: 12, lineHeight: 17, fontWeight: '400', marginTop: 2 },
});
