import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import ActionButton from './ActionButton';
import { COLORS } from '../theme';
import { formatDate, formatTime } from '../utils/dateTimeFormatter';

export default function SuggestedSlotCard({ slot, onSelect, selected, loading, isDarkMode }) {
  return (
    <View style={[styles.card, selected && styles.selected, isDarkMode && styles.cardDark]}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <MaterialIcons name="event-repeat" size={26} color={COLORS.primary} />
        </View>
        <View style={styles.textArea}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>{slot.label || 'Suggested Slot'}</Text>
          <Text style={[styles.time, isDarkMode && styles.mutedDark]}>
            {formatDate(slot.startTime)} • {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
          </Text>
          <Text style={[styles.reason, isDarkMode && styles.mutedDark]}>{slot.reason}</Text>
        </View>
      </View>
      <View style={styles.buttonSpace}>
        <ActionButton
          label={selected ? 'Selected' : 'Select This Slot'}
          variant={selected ? 'success' : 'primary'}
          icon={selected ? 'check-circle' : 'touch-app'}
          onPress={onSelect}
          loading={loading}
          disabled={selected}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  selected: { borderColor: COLORS.success, borderWidth: 1.5 },
  row: { flexDirection: 'row', gap: 12 },
  iconBox: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  textArea: { flex: 1 },
  label: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  time: { fontSize: 13, color: COLORS.muted, marginTop: 4, fontWeight: '700' },
  reason: { fontSize: 12, color: COLORS.muted, marginTop: 6, lineHeight: 17 },
  buttonSpace: { marginTop: 12 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
