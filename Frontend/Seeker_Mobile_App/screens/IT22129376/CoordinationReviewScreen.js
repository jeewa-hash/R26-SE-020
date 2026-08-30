import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import PriceEvaluationCard from './components/PriceEvaluationCard';
import ScheduleEvaluationCard from './components/ScheduleEvaluationCard';
import SuggestedSlotCard from './components/SuggestedSlotCard';
import EmptyJobsState from './components/EmptyJobsState';
import { checkBidCoordination } from './services/myJobsApi';
import { COLORS } from './theme';
import { useTheme } from '../../hooks/useTheme';

const getQuoteId = (quote) => quote?._id || quote?.id || quote?.externalQuotationId;
const getRequestId = (quote) => quote?.externalRequestQuotationId || quote?.requestQuotationId || quote?.providerRequestId || quote?.requestId;
const getDecision = (quote) => quote?.coordinationDecision || quote?.coordinationStatus || quote?.finalDecision || 'NOT_CHECKED';

export default function CoordinationReviewScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const initialQuote = route.params?.quote;
  const [quote, setQuote] = useState(initialQuote || null);
  const [loading, setLoading] = useState(false);

  if (!quote || !getQuoteId(quote)) {
    return (
      <ScreenShell title="Smart Review" subtitle="No quote selected" navigation={navigation}>
        <EmptyJobsState
          title="No real quotation found"
          message="Please open Smart Review from a real provider quote in My Jobs."
          icon="rule"
          buttonLabel="Back to My Jobs"
          onButtonPress={() => navigation.navigate('MyJobsScreen')}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  const runCoordination = async () => {
    const externalRequestQuotationId = getRequestId(quote);
    const externalQuotationId = getQuoteId(quote);

    if (!externalRequestQuotationId || !externalQuotationId) {
      Alert.alert(
        'Missing IDs',
        'This real quote does not have the request quotation ID or provider quotation ID needed for coordination.'
      );
      return;
    }

    setLoading(true);

    try {
      const result = await checkBidCoordination({
        externalRequestQuotationId,
        externalQuotationId,
      });

      const payload = result.data || result;
      const coordination = payload.coordination || payload.bidCoordination || payload;

      setQuote((prev) => ({
        ...prev,
        coordinationId: coordination?._id || payload.coordinationId || prev.coordinationId,
        coordinationDecision: coordination?.finalDecision || payload.finalDecision || prev.coordinationDecision,
        priceEvaluation: payload.priceEvaluation || coordination?.priceEvaluation || prev.priceEvaluation,
        scheduleEvaluation: payload.scheduleEvaluation || coordination?.scheduleEvaluation || prev.scheduleEvaluation,
        suggestedSlots: payload.suggestedSlots || coordination?.suggestedSlots || prev.suggestedSlots || [],
        delayRiskLevel:
          payload.scheduleEvaluation?.delayRiskLevel ||
          coordination?.scheduleEvaluation?.delayRiskLevel ||
          payload.delayRiskLevel ||
          prev.delayRiskLevel,
      }));
    } catch (error) {
      Alert.alert('Coordination Check Failed', error.message || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const decision = getDecision(quote);
  const canConfirm = ['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(decision);
  const needsSlots = decision === 'RESCHEDULE_REQUIRED';

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
          <ActionButton
            label="Run Availability Check"
            icon="rule"
            onPress={runCoordination}
            loading={loading}
          />
        )
      }
    >
      <CoordinationSummaryCard
        decision={decision}
        recommendedAction={canConfirm ? 'This quote is ready for final confirmation.' : 'Run or review the smart availability check before booking.'}
        conflictDetected={quote.scheduleEvaluation?.conflictDetected}
        delayRiskLevel={quote.delayRiskLevel || quote.scheduleEvaluation?.delayRiskLevel}
        isDarkMode={isDarkMode}
      />

      <PriceEvaluationCard evaluation={quote.priceEvaluation} isDarkMode={isDarkMode} />
      <ScheduleEvaluationCard evaluation={quote.scheduleEvaluation} isDarkMode={isDarkMode} />

      {quote.suggestedSlots?.length ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            Suggested Slot Preview
          </Text>

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
