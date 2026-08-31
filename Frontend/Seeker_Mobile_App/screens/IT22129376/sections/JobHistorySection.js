import React from 'react';
import { View } from 'react-native';
import EmptyJobsState from '../components/EmptyJobsState';
import HistoryJobCard from '../components/HistoryJobCard';

export default function JobHistorySection({ history = [], navigation, isDarkMode }) {
  if (!history.length) {
    return (
      <EmptyJobsState
        title="No job history yet"
        message="Completed, cancelled and expired jobs will appear here."
        icon="history"
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <View>
      {history.map((job) => (
        <HistoryJobCard
          key={job.id}
          job={job}
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate('IT22129376JobHistoryDetails', { job })}
        />
      ))}
    </View>
  );
}
