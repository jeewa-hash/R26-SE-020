import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import InfoRow from './components/InfoRow';
import EmptyJobsState from './components/EmptyJobsState';
import { createBookingFromCoordination } from './services/myJobsApi';
import { COLORS } from './theme';
import { formatCurrency, formatDateTime, formatDuration } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

const getAmount = (quote) => quote?.quotedPrice || quote?.price || quote?.finalAmount || 0;
const getTitle = (quote) => quote?.title || quote?.serviceSubcategory || quote?.serviceSubCategory || quote?.subcategory || 'Service Job';
const getProvider = (quote) => quote?.providerSnapshot?.name || quote?.providerName || quote?.providerId || 'Provider';

export default function ConfirmJobScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const quote = route.params?.quote;
  const [loading, setLoading] = useState(false);

  if (!quote?.coordinationId) {
    return (
      <ScreenShell title="Confirm Job" subtitle="No coordination selected" navigation={navigation}>
        <EmptyJobsState
          title="Cannot confirm without coordination"
          message="Open a real quotation, run the availability check, then confirm the job."
          icon="verified"
          buttonLabel="Back to My Jobs"
          onButtonPress={() => navigation.navigate('MyJobsScreen')}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  const finalStart = quote.selectedSlot?.startTime || quote.coordinatedStartTime || quote.proposedStartTime;
  const finalEnd = quote.selectedSlot?.endTime || quote.coordinatedEndTime;

  const confirmJob = async () => {
    setLoading(true);

    try {
      const result = await createBookingFromCoordination(quote.coordinationId);
      const booking = result?.data?.booking || result?.booking || result?.data || result;

      Alert.alert('Booking Confirmed', 'Booking confirmed successfully.', [
        {
          text: 'View Scheduled Jobs',
          onPress: () => navigation.navigate('MyJobsScreen', { refresh: Date.now(), booking }),
        },
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
      footer={
        <ActionButton
          label="Confirm Job"
          icon="verified"
          variant="success"
          onPress={confirmJob}
          loading={loading}
        />
      }
    >
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.total, isDarkMode && styles.textDark]}>
          {formatCurrency(getAmount(quote))}
        </Text>

        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          {getTitle(quote)}
        </Text>

        <Text style={[styles.subtitle, isDarkMode && styles.mutedDark]}>
          {getProvider(quote)}
        </Text>

        <View style={styles.divider} />

        <InfoRow icon="event" label="Final Start" value={formatDateTime(finalStart)} isDarkMode={isDarkMode} />
        <InfoRow icon="event-available" label="Final End" value={finalEnd ? formatDateTime(finalEnd) : 'Calculated by backend'} isDarkMode={isDarkMode} />
        <InfoRow icon="timer" label="Duration" value={formatDuration(quote.estimatedDurationHours || quote.durationHours)} isDarkMode={isDarkMode} />
        <InfoRow icon="schedule-send" label="Schedule Source" value={quote.selectedSlot ? 'Selected Suggested Slot' : 'Provider Proposed Time'} isDarkMode={isDarkMode} />
      </View>

      <CoordinationSummaryCard
        decision={quote.coordinationDecision || quote.coordinationStatus || 'AVAILABLE_WITH_CAUTION'}
        recommendedAction="By confirming, this quotation will become a scheduled job."
        conflictDetected={false}
        delayRiskLevel={quote.delayRiskLevel || quote.scheduleEvaluation?.delayRiskLevel}
        isDarkMode={isDarkMode}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  total: { fontSize: 30, fontWeight: '600', color: COLORS.primary },
  title: { fontSize: 21, fontWeight: '600', color: COLORS.text, marginTop: 6 },
  subtitle: { fontSize: 13, fontWeight: '600', color: COLORS.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
