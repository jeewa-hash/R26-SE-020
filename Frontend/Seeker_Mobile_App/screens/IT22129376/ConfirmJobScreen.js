import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import InfoRow from './components/InfoRow';
import { createBookingFromCoordination } from './services/myJobsApi';
import { COLORS } from './theme';
import { quotes } from './mock/myJobsMockData';
import { formatCurrency, formatDateTime, formatDuration } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

export default function ConfirmJobScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const quote = route.params?.quote || quotes[0];
  const [loading, setLoading] = useState(false);
  const finalStart = quote.selectedSlot?.startTime || quote.proposedStartTime;
  const finalEnd = quote.selectedSlot?.endTime;

  const confirmJob = async () => {
    setLoading(true);
    try {
      if (quote.coordinationId) {
        await createBookingFromCoordination(quote.coordinationId);
      }
      Alert.alert('Job Confirmed', 'Your job has been confirmed successfully.', [
        { text: 'OK', onPress: () => navigation.navigate('MyJobsScreen') },
      ]);
    } catch (error) {
      Alert.alert('Booking Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenShell
      title="Confirm Job"
      subtitle="Final review before booking"
      navigation={navigation}
      footer={<ActionButton label="Confirm Job" icon="verified" variant="success" onPress={confirmJob} loading={loading} />}
    >
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.total, isDarkMode && styles.textDark]}>{formatCurrency(quote.quotedPrice)}</Text>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{quote.title}</Text>
        <Text style={[styles.subtitle, isDarkMode && styles.mutedDark]}>{quote.providerName}</Text>

        <View style={styles.divider} />

        <InfoRow icon="event" label="Final Start" value={formatDateTime(finalStart)} isDarkMode={isDarkMode} />
        <InfoRow icon="event-available" label="Final End" value={finalEnd ? formatDateTime(finalEnd) : 'Calculated by backend'} isDarkMode={isDarkMode} />
        <InfoRow icon="timer" label="Duration" value={formatDuration(quote.estimatedDurationHours)} isDarkMode={isDarkMode} />
        <InfoRow icon="schedule-send" label="Schedule Source" value={quote.selectedSlot ? 'Selected Suggested Slot' : 'Provider Proposed Time'} isDarkMode={isDarkMode} />
      </View>

      <CoordinationSummaryCard
        decision={quote.coordinationDecision}
        recommendedAction="By confirming, this quotation will become a scheduled job."
        conflictDetected={false}
        delayRiskLevel={quote.delayRiskLevel}
        isDarkMode={isDarkMode}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  total: { fontSize: 30, fontWeight: '900', color: COLORS.primary },
  title: { fontSize: 21, fontWeight: '900', color: COLORS.text, marginTop: 6 },
  subtitle: { fontSize: 13, fontWeight: '700', color: COLORS.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
