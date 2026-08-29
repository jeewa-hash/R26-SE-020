import React from 'react';
import { View } from 'react-native';
import EmptyJobsState from '../components/EmptyJobsState';
import JobStatusCard from '../components/JobStatusCard';

export default function ActiveJobsSection({ jobs = [], navigation, isDarkMode }) {
  if (!jobs.length) {
    return (
      <EmptyJobsState
        title="No active jobs right now"
        message="Your ongoing requests and waiting provider responses will appear here."
        icon="work-outline"
        buttonLabel="Request a Service"
        onButtonPress={() => navigation.navigate('Home')}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <View>
      {jobs.map((job) => (
        <JobStatusCard
          key={job.id}
          job={job}
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate('IT22129376JobDetails', { job })}
        />
      ))}
    </View>
  );
}
