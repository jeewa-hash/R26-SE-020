import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import EmptyJobsState from '../components/EmptyJobsState';
import QuoteCard from '../components/QuoteCard';

export default function QuotesSection({ quotes = [], requests = [], navigation, isDarkMode }) {
  const [expandedComparisons, setExpandedComparisons] = useState({});
  const groups = useMemo(() => Object.values(quotes.reduce((acc, quote) => {
    const key = quote.externalSessionId || quote.sessionId || quote.id;
    if (!acc[key]) acc[key] = { sessionId: key, quotes: [] };
    acc[key].quotes.push(quote);
    return acc;
  }, {})), [quotes]);

  if (!quotes.length) {
    return (
      <EmptyJobsState
        title="No quotes yet"
        message="Provider responses and availability review results will appear here."
        icon="request-quote"
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <View>
      {groups.map((group) => {
        const first = group.quotes[0];
        const rates = group.quotes
          .map((q) => Number(q.estimatedDurationHours) > 0 ? Number(q.quotedPrice) / Number(q.estimatedDurationHours) : null)
          .filter((rate) => Number.isFinite(rate));
        const average = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;
        const expanded = expandedComparisons[group.sessionId];
        const requestedProviders = new Set(requests
          .filter((request) => String(request.sessionId || request.externalSessionId || '') === String(group.sessionId))
          .map((request) => String(request.providerId?._id || request.providerId || ''))
          .filter(Boolean));
        const requestedProviderCount = requestedProviders.size;
        const receivedQuotationCount = group.quotes.length;
        return (
          <View key={group.sessionId} style={[styles.group, isDarkMode && styles.groupDark]}>
            <Text style={[styles.title, isDarkMode && styles.textDark]}>{first.title || 'Service Request'}</Text>
            <Text style={styles.meta}>{requestedProviderCount} provider{requestedProviderCount === 1 ? '' : 's'} requested · {receivedQuotationCount} quote{receivedQuotationCount === 1 ? '' : 's'} received</Text>
            {Number(first.seekerBudget) >= 0 && first.seekerBudget !== 0 ? <Text style={styles.detail}>Budget: LKR {Number(first.seekerBudget).toFixed(2)}</Text> : null}
            {first.preferredTimeLabel ? <Text style={styles.detail}>Preferred time: {first.preferredTimeLabel}</Text> : null}
            {first.serviceLocation ? <Text style={styles.detail}>Location: {first.serviceLocation}</Text> : null}
            {requestedProviderCount > 1 && receivedQuotationCount > 1 ? (
              <TouchableOpacity style={styles.compareButton} onPress={() => setExpandedComparisons((prev) => ({ ...prev, [group.sessionId]: !expanded }))}>
                <Text style={styles.compareText}>Compare Quotes / Smart Bid</Text>
              </TouchableOpacity>
            ) : null}
            {requestedProviderCount > 1 && receivedQuotationCount <= 1 ? <Text style={styles.waiting}>Waiting for more providers to respond. You can still accept this quotation if it suits you.</Text> : null}
            {expanded ? (
              <View style={styles.comparison}>
                <Text style={styles.average}>Average hourly rate: LKR {average.toFixed(2)}/hr</Text>
                {group.quotes.map((q) => {
                  const duration = Number(q.estimatedDurationHours);
                  const rate = duration > 0 ? Number(q.quotedPrice) / duration : 0;
                  const difference = average > 0 ? ((rate - average) / average) * 100 : 0;
                  const recommendation = Math.abs(difference) < 5 ? 'Fair price based on session average' : difference > 0 ? 'Above average compared with other quotes' : 'Below average compared with other quotes';
                  return <Text key={q.id} style={styles.comparisonLine}>{q.providerName}: LKR {rate.toFixed(2)}/hr · {difference.toFixed(1)}% · {recommendation}</Text>;
                })}
              </View>
            ) : null}
            {group.quotes.map((quote) => {
              const canAccept = ['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(quote.coordinationDecision);
              return <QuoteCard
                key={quote.id}
                quote={quote}
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate('IT22129376QuoteDetails', { quote })}
                onCheckCoordination={() => navigation.navigate(canAccept ? 'IT22129376ConfirmJob' : 'IT22129376CoordinationReview', { quote })}
              />;
            })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { backgroundColor: '#F8FAFC', borderRadius: 20, padding: 12, marginBottom: 16 },
  groupDark: { backgroundColor: '#ffffff08' },
  title: { fontSize: 17, fontWeight: '600', color: '#111827' },
  textDark: { color: '#F8FAFC' },
  meta: { color: '#64748B', fontWeight: '500', marginTop: 3, marginBottom: 10 },
  detail: { color: '#64748B', fontSize: 12, marginBottom: 4 },
  compareButton: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  compareText: { color: '#4F46E5', fontWeight: '600' },
  comparison: { backgroundColor: '#ECFDF5', padding: 12, borderRadius: 12, marginBottom: 12 },
  average: { color: '#047857', fontWeight: '600', marginBottom: 8 },
  waiting: { color: '#92400E', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, fontSize: 12, lineHeight: 18, marginBottom: 12 },
  comparisonLine: { color: '#065F46', fontSize: 12, lineHeight: 18, marginBottom: 4 },
});
