import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import { COLORS } from '../theme';
import { mapJobStatus } from '../utils/jobStatusMapper';
import { formatCurrency, formatDate } from '../utils/dateTimeFormatter';

export default function HistoryJobCard({ job, onPress, isDarkMode }) {
  const mapped = mapJobStatus(job.status);

  return (
    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <MaterialIcons name="history" size={26} color={COLORS.primary} />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>{job.title}</Text>
          <Text style={[styles.meta, isDarkMode && styles.mutedDark]}>{job.providerName} • {formatDate(job.completedAt)}</Text>
          <Text style={[styles.amount, isDarkMode && styles.textDark]}>{formatCurrency(job.finalAmount)}</Text>
        </View>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 20, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  titleArea: { flex: 1 },
  title: { fontSize: 15, fontWeight: '900', color: COLORS.text },
  meta: { color: COLORS.muted, fontSize: 12, marginTop: 3, fontWeight: '600' },
  amount: { color: COLORS.text, fontSize: 13, marginTop: 5, fontWeight: '900' },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
