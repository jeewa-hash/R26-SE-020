import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import PriceEvaluationCard from './components/PriceEvaluationCard';
import ScheduleEvaluationCard from './components/ScheduleEvaluationCard';
import SuggestedSlotCard from './components/SuggestedSlotCard';
import { quotes } from './mock/myJobsMockData';
import { checkBidCoordination } from './services/myJobsApi';
import { COLORS } from './theme';
import { useTheme } from '../../hooks/useTheme';

export default function CoordinationReviewScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const initialQuote = route.params?.quote || quotes[0];
  const [quote, setQuote] = useState(initialQuote);
  const [loading, setLoading] = useState(false);

  const runCoordination = async () => {
    setLoading(true);
    try {
      const result = await checkBidCoordination({
        externalRequestQuotationId: quote.externalRequestQuotationId,
        externalQuotationId: quote.externalQuotationId,
      });

      const payload = result.data || result;
      setQuote((prev) => ({
        ...prev,
        coordinationId: payload.coordination?._id || payload._id || prev.coordinationId,
        coordinationDecision: payload.finalDecision || payload.coordination?.finalDecision || prev.coordinationDecision,
        priceEvaluation: payload.priceEvaluation || prev.priceEvaluation,
        scheduleEvaluation: payload.scheduleEvaluation || prev.scheduleEvaluation,
        suggestedSlots: payload.suggestedSlots || prev.suggestedSlots,
        delayRiskLevel: payload.scheduleEvaluation?.delayRiskLevel || prev.delayRiskLevel,
      }));
    } catch (error) {
      Alert.alert('Coordination Check Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canConfirm = ['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(quote.coordinationDecision);
  const needsSlots = quote.coordinationDecision === 'RESCHEDULE_REQUIRED';

  return (
    <ScreenShell
      title="Smart Review"
      subtitle="Availability-aware coordination"
      navigation={navigation}
      footer={
        canConfirm ? (
          <ActionButton
            label="Continue to Confirm Job"
            icon="check-circle"
            variant="success"
            onPress={() => navigation.navigate('IT22129376ConfirmJob', { quote })}
          />
        ) : needsSlots ? (
          <ActionButton
            label="View Suggested Slots"
            icon="event-repeat"
            onPress={() => navigation.navigate('IT22129376SuggestedSlots', { quote })}
          />
        ) : (
          <ActionButton label="Run Availability Check" icon="rule" onPress={runCoordination} loading={loading} />
        )
      }
    >
      <CoordinationSummaryCard
        decision={quote.coordinationDecision}
        recommendedAction={canConfirm ? 'This quote is ready for final confirmation.' : 'Run or review the smart availability check before booking.'}
        conflictDetected={quote.scheduleEvaluation?.conflictDetected}
        delayRiskLevel={quote.delayRiskLevel}
        isDarkMode={isDarkMode}
      />

      <PriceEvaluationCard evaluation={quote.priceEvaluation} isDarkMode={isDarkMode} />
      <ScheduleEvaluationCard evaluation={quote.scheduleEvaluation} isDarkMode={isDarkMode} />

      {quote.suggestedSlots?.length ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Suggested Slot Preview</Text>
          {quote.suggestedSlots.slice(0, 1).map((slot) => (
            <SuggestedSlotCard
              key={slot._id || slot.id}
              slot={slot}
              isDarkMode={isDarkMode}
              onSelect={() => navigation.navigate('IT22129376SuggestedSlots', { quote })}
            />
          ))}
        </View>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  section: { marginTop: 2 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginBottom: 10 },
  textDark: { color: COLORS.darkText },
});
