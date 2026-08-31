import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import DelayRiskBadge from './DelayRiskBadge';
import ActionButton from './ActionButton';
import { COLORS } from '../theme';
import { mapCoordinationDecision } from '../utils/coordinationMapper';
import { formatCurrency, formatDateTime, formatDuration } from '../utils/dateTimeFormatter';

export default function QuoteCard({ quote, onPress, onCheckCoordination, isDarkMode }) {
  const mapped = mapCoordinationDecision(quote.coordinationDecision);

  return (
    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.headerRow}>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={28} color={COLORS.primary} />
        </View>
        <View style={styles.providerArea}>
          <Text style={[styles.providerName, isDarkMode && styles.textDark]}>{quote.providerName}</Text>
          <Text style={[styles.jobTitle, isDarkMode && styles.mutedDark]}>{quote.title}</Text>
        </View>
        <Text style={styles.price}>{formatCurrency(quote.quotedPrice)}</Text>
      </View>

      <View style={styles.badgeRow}>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />
        {quote.delayRiskLevel ? <DelayRiskBadge riskLevel={quote.delayRiskLevel} /> : null}
      </View>

      <View style={[styles.offerBox, isDarkMode && styles.offerBoxDark]}>
        <View style={styles.offerItem}>
          <Text style={[styles.offerLabel, isDarkMode && styles.mutedDark]}>Proposed Time</Text>
          <Text style={[styles.offerValue, isDarkMode && styles.textDark]}>{formatDateTime(quote.proposedStartTime)}</Text>
        </View>
        <View style={styles.offerItem}>
          <Text style={[styles.offerLabel, isDarkMode && styles.mutedDark]}>Duration</Text>
          <Text style={[styles.offerValue, isDarkMode && styles.textDark]}>{formatDuration(quote.estimatedDurationHours)}</Text>
        </View>
      </View>

      <Text style={[styles.note, isDarkMode && styles.mutedDark]} numberOfLines={2}>{quote.note}</Text>

      <View style={styles.actionRow}>
        <View style={styles.actionFlex}>
          <ActionButton label="Review" variant="secondary" icon="visibility" onPress={onPress} />
        </View>
        <View style={styles.actionFlex}>
          <ActionButton
            label={quote.coordinationDecision === 'NOT_CHECKED' ? 'Check Risk' : 'View Result'}
            variant="primary"
            icon="rule"
            onPress={onCheckCoordination || onPress}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 46, height: 46, borderRadius: 15, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  providerArea: { flex: 1 },
  providerName: { fontSize: 16, fontWeight: '900', color: COLORS.text },
  jobTitle: { fontSize: 12, fontWeight: '600', color: COLORS.muted, marginTop: 2 },
  price: { fontSize: 17, fontWeight: '900', color: COLORS.primary },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  offerBox: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, marginTop: 14, gap: 12 },
  offerBoxDark: { backgroundColor: '#ffffff08' },
  offerItem: { flex: 1 },
  offerLabel: { fontSize: 11, fontWeight: '700', color: COLORS.muted, marginBottom: 4 },
  offerValue: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  note: { fontSize: 13, color: COLORS.muted, lineHeight: 18, marginTop: 12 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionFlex: { flex: 1 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
