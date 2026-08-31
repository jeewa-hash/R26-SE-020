import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { toneColors } from '../theme';

export default function StatusBadge({ label, tone = 'neutral', icon }) {
  const C = toneColors[tone] || toneColors.neutral;
  return (
    <View style={[styles.badge, { backgroundColor: C.bg }]}> 
      {icon ? <MaterialIcons name={icon} size={14} color={C.icon} /> : null}
      <Text style={[styles.text, { color: C.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  text: {
    fontSize: 11,
    fontWeight: '800',
  },
});
