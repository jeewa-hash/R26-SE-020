import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import InfoRow from './components/InfoRow';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import { COLORS } from './theme';
import { quotes } from './mock/myJobsMockData';
import { formatCurrency, formatDateTime, formatDuration } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

export default function QuoteDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const quote = route.params?.quote || quotes[0];

  return (
    <ScreenShell
      title="Quote Details"
      subtitle={quote?.providerName || 'Provider offer'}
      navigation={navigation}
      footer={
        <ActionButton
          label="Check Availability & Risk"
          icon="rule"
          onPress={() => navigation.navigate('IT22129376CoordinationReview', { quote })}
        />
      }
    >
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.amount, isDarkMode && styles.textDark]}>{formatCurrency(quote.quotedPrice)}</Text>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{quote.title}</Text>
        <Text style={[styles.note, isDarkMode && styles.mutedDark]}>{quote.note}</Text>

        <View style={styles.divider} />

        <InfoRow icon="person" label="Provider" value={quote.providerName} isDarkMode={isDarkMode} />
        <InfoRow icon="schedule" label="Proposed Time" value={formatDateTime(quote.proposedStartTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="timer" label="Estimated Duration" value={formatDuration(quote.estimatedDurationHours)} isDarkMode={isDarkMode} />
        <InfoRow icon="account-balance-wallet" label="Your Budget" value={formatCurrency(quote.seekerBudget)} isDarkMode={isDarkMode} />
      </View>

      <CoordinationSummaryCard
        decision={quote.coordinationDecision}
        recommendedAction="Review the coordination result before confirming the job."
        conflictDetected={quote.scheduleEvaluation?.conflictDetected}
        delayRiskLevel={quote.delayRiskLevel}
        isDarkMode={isDarkMode}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  amount: { color: COLORS.primary, fontSize: 30, fontWeight: '900' },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900', marginTop: 6 },
  note: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
