import React from 'react';
import { View } from 'react-native';
import EmptyJobsState from '../components/EmptyJobsState';
import QuoteCard from '../components/QuoteCard';

export default function QuotesSection({ quotes = [], navigation, isDarkMode }) {
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
      {quotes.map((quote) => (
        <QuoteCard
          key={quote.id}
          quote={quote}
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate('IT22129376QuoteDetails', { quote })}
          onCheckCoordination={() => navigation.navigate('IT22129376CoordinationReview', { quote })}
        />
      ))}
    </View>
  );
}
