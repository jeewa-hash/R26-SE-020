import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import ActionButton from './ActionButton';
import DelayRiskBadge from './DelayRiskBadge';
import { COLORS } from '../theme';
import { mapJobStatus } from '../utils/jobStatusMapper';
import { formatCurrency, formatDateTime } from '../utils/dateTimeFormatter';

export default function ScheduledJobCard({ booking, onPress, isDarkMode }) {
  const mapped = mapJobStatus(booking.status);

  return (
    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <MaterialIcons name="event-available" size={30} color={COLORS.success} />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>{booking.title}</Text>
          <Text style={[styles.provider, isDarkMode && styles.mutedDark]}>{booking.providerName}</Text>
        </View>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />
      </View>

      <View style={[styles.detailsBox, isDarkMode && styles.detailsBoxDark]}>
        <View style={styles.detailLine}>
          <Text style={[styles.detailLabel, isDarkMode && styles.mutedDark]}>Schedule</Text>
          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{formatDateTime(booking.scheduledStartTime)}</Text>
        </View>
        <View style={styles.detailLine}>
          <Text style={[styles.detailLabel, isDarkMode && styles.mutedDark]}>Amount</Text>
          <Text style={[styles.detailValue, isDarkMode && styles.textDark]}>{formatCurrency(booking.finalAmount)}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <DelayRiskBadge riskLevel={booking.delayRiskLevel} />
        <Text style={[styles.source, isDarkMode && styles.mutedDark]}>{booking.scheduleSource}</Text>
      </View>

      <View style={styles.buttonSpace}>
        <ActionButton label="View Job" variant="secondary" icon="arrow-forward" onPress={onPress} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F7', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  titleArea: { flex: 1 },
  title: { fontSize: 17, fontWeight: '900', color: COLORS.text },
  provider: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginTop: 3 },
  detailsBox: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, marginTop: 14, gap: 8 },
  detailsBoxDark: { backgroundColor: '#ffffff08' },
  detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { fontSize: 12, fontWeight: '700', color: COLORS.muted },
  detailValue: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '800', color: COLORS.text },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  source: { flex: 1, textAlign: 'right', color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  buttonSpace: { marginTop: 14 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
