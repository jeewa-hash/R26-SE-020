import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function InfoRow({ icon, label, value, isDarkMode }) {
  return (
    <View style={styles.row}>
      <View style={styles.iconBox}>
        <MaterialIcons name={icon} size={17} color={COLORS.primary} />
      </View>
      <View style={styles.textArea}>
        <Text style={[styles.label, isDarkMode && styles.mutedDark]}>{label}</Text>
        <Text style={[styles.value, isDarkMode && styles.textDark]}>{value || 'Not set'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  textArea: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '700',
  },
  value: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '700',
    marginTop: 2,
  },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
