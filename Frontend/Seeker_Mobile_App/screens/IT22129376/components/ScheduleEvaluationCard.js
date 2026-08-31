import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import StatusBadge from './StatusBadge';
import { COLORS } from '../theme';
import { formatDateTime, formatDuration } from '../utils/dateTimeFormatter';

export default function ScheduleEvaluationCard({ evaluation = {}, isDarkMode }) {
  const conflict = Boolean(evaluation.conflictDetected);
  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>Schedule Review</Text>
        <StatusBadge
          label={conflict ? 'Conflict Found' : 'Schedule OK'}
          tone={conflict ? 'danger' : 'success'}
          icon={conflict ? 'event-busy' : 'event-available'}
        />
      </View>
      <View style={styles.rows}>
        <Row label="Proposed start" value={formatDateTime(evaluation.proposedStartTime)} isDarkMode={isDarkMode} />
        <Row label="Provider estimate" value={formatDuration(evaluation.providerEstimatedDurationHours)} isDarkMode={isDarkMode} />
        <Row label="ML predicted duration" value={formatDuration(evaluation.mlPredictedDurationHours)} isDarkMode={isDarkMode} />
        <Row label="Final scheduling duration" value={formatDuration(evaluation.finalSchedulingDurationHours)} isDarkMode={isDarkMode} />
        <Row label="Buffer" value={`${evaluation.bufferMinutes || 0} mins`} isDarkMode={isDarkMode} />
        <Row label="Bookings today" value={`${evaluation.providerBookingsToday || 0}`} isDarkMode={isDarkMode} />
        {Number(evaluation.distanceFromPreviousBookingKm) > 0 ? <Row label="Travel distance" value={`${Number(evaluation.distanceFromPreviousBookingKm).toFixed(1)} km`} isDarkMode={isDarkMode} /> : null}
        {Number(evaluation.estimatedTravelTimeMins) > 0 ? <Row label="Estimated travel time" value={`${Math.round(evaluation.estimatedTravelTimeMins)} mins`} isDarkMode={isDarkMode} /> : null}
        {evaluation.gapFromPreviousBookingMins != null ? <Row label="Travel check" value={Number(evaluation.gapFromPreviousBookingMins) >= Number(evaluation.estimatedTravelTimeMins || 0) ? 'OK' : 'Not enough travel time'} isDarkMode={isDarkMode} /> : null}
      </View>
      {evaluation.conflictReason ? <Text style={[styles.message, isDarkMode && styles.mutedDark]}>{evaluation.conflictReason}</Text> : null}
      {!evaluation.conflictReason && evaluation.availabilityMessage ? <Text style={[styles.message, isDarkMode && styles.mutedDark]}>{evaluation.availabilityMessage}</Text> : null}
    </View>
  );
}

function Row({ label, value, isDarkMode }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, isDarkMode && styles.mutedDark]}>{label}</Text>
      <Text style={[styles.value, isDarkMode && styles.textDark]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  rows: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 14 },
  label: { color: COLORS.muted, fontSize: 12, fontWeight: '600' },
  value: { flex: 1, textAlign: 'right', color: COLORS.text, fontSize: 12, fontWeight: '600' },
  message: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 12 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
