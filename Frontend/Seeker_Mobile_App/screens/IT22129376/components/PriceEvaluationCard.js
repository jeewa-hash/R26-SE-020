import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../theme';
import { formatCurrency } from '../utils/dateTimeFormatter';
import StatusBadge from './StatusBadge';

export default function PriceEvaluationCard({ evaluation = {}, isDarkMode }) {
  const withinBudget = String(evaluation.budgetStatus || '').includes('WITHIN');
  return (
    <View style={[styles.card, isDarkMode && styles.cardDark]}>
      <View style={styles.headerRow}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>Price Review</Text>
        <StatusBadge
          label={withinBudget ? 'Within Budget' : 'Review Price'}
          tone={withinBudget ? 'success' : 'warning'}
          icon="payments"
        />
      </View>
      <View style={styles.grid}>
        <Metric label="Provider Quote" value={formatCurrency(evaluation.providerQuotedPrice)} isDarkMode={isDarkMode} />
        <Metric label="Your Budget" value={formatCurrency(evaluation.seekerBudgetAmount)} isDarkMode={isDarkMode} />
        <Metric label="Suggested Fair" value={formatCurrency(evaluation.suggestedPrice)} isDarkMode={isDarkMode} />
        <Metric label="Fair Range" value={`${formatCurrency(evaluation.minFairPrice)} - ${formatCurrency(evaluation.maxFairPrice)}`} isDarkMode={isDarkMode} />
      </View>
      {evaluation.message ? <Text style={[styles.message, isDarkMode && styles.mutedDark]}>{evaluation.message}</Text> : null}
    </View>
  );
}

function Metric({ label, value, isDarkMode }) {
  return (
    <View style={[styles.metric, isDarkMode && styles.metricDark]}>
      <Text style={[styles.metricLabel, isDarkMode && styles.mutedDark]}>{label}</Text>
      <Text style={[styles.metricValue, isDarkMode && styles.textDark]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '600', color: COLORS.text },
  grid: { gap: 10 },
  metric: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 12 },
  metricDark: { backgroundColor: '#ffffff08' },
  metricLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '600', marginBottom: 4 },
  metricValue: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  message: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 12 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
