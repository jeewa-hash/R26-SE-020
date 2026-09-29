import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import InfoRow from './components/InfoRow';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import EmptyJobsState from './components/EmptyJobsState';
import { COLORS } from './theme';
import { formatCurrency, formatDateTime, formatDuration } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

const getQuoteId = (quote) => quote?._id || quote?.id || quote?.externalQuotationId;
const getRequestId = (quote) => quote?.externalRequestQuotationId || quote?.requestQuotationId || quote?.providerRequestId || quote?.requestId;
const getAmount = (quote) => quote?.quotedPrice || quote?.price || quote?.finalAmount || 0;
const getTitle = (quote) => quote?.title || quote?.serviceSubcategory || quote?.serviceSubCategory || quote?.subcategory || 'Provider Quote';
const getProvider = (quote) => quote?.providerSnapshot?.name || quote?.providerName || quote?.providerId || 'Provider';
const getNote = (quote) => quote?.note || quote?.notes || 'Provider quotation received.';
const getBudget = (quote) => quote?.seekerBudget || quote?.request?.seekerBudgetAmount || quote?.request?.budgetAmount || quote?.request?.budget || 0;

export default function QuoteDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const quote = route.params?.quote;

  if (!quote || !getQuoteId(quote)) {
    return (
      <ScreenShell title="Quote Details" subtitle="No quote selected" navigation={navigation}>
        <EmptyJobsState
          title="No real quote selected"
          message="Open this screen from My Jobs → Quotes to view a real provider quotation."
          icon="request-quote"
          buttonLabel="Back to My Jobs"
          onButtonPress={() => navigation.navigate('MyJobsScreen')}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  const normalizedQuote = {
    ...quote,
    externalQuotationId: getQuoteId(quote),
    externalRequestQuotationId: getRequestId(quote),
  };

  return (
    <ScreenShell
      title="Quote Details"
      subtitle={getProvider(quote)}
      navigation={navigation}
      footer={
        <ActionButton
          label="Check Availability & Risk"
          icon="rule"
          onPress={() => navigation.navigate('IT22129376CoordinationReview', { quote: normalizedQuote })}
        />
      }
    >
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.amount, isDarkMode && styles.textDark]}>
          {formatCurrency(getAmount(quote))}
        </Text>

        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          {getTitle(quote)}
        </Text>

        <Text style={[styles.note, isDarkMode && styles.mutedDark]}>
          {getNote(quote)}
        </Text>

        <View style={styles.divider} />

        <InfoRow icon="person" label="Provider" value={getProvider(quote)} isDarkMode={isDarkMode} />
        <InfoRow icon="schedule" label="Proposed Time" value={formatDateTime(quote.proposedStartTime || quote.coordinatedStartTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="timer" label="Estimated Duration" value={formatDuration(quote.estimatedDurationHours || quote.durationHours)} isDarkMode={isDarkMode} />
        <InfoRow icon="account-balance-wallet" label="Your Budget" value={formatCurrency(getBudget(quote))} isDarkMode={isDarkMode} />
        <InfoRow icon="tag" label="Quote Status" value={quote.status || 'SENT'} isDarkMode={isDarkMode} />
      </View>

      <CoordinationSummaryCard
        decision={quote.coordinationDecision || quote.coordinationStatus || 'NOT_CHECKED'}
        recommendedAction="Review the coordination result before confirming the job."
        conflictDetected={quote.scheduleEvaluation?.conflictDetected}
        delayRiskLevel={quote.delayRiskLevel || quote.scheduleEvaluation?.delayRiskLevel}
        isDarkMode={isDarkMode}
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  amount: { color: COLORS.primary, fontSize: 30, fontWeight: '600' },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '600', marginTop: 6 },
  note: { color: COLORS.muted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
