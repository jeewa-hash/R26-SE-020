import React from 'react';
import { View } from 'react-native';
import EmptyJobsState from '../components/EmptyJobsState';
import ScheduledJobCard from '../components/ScheduledJobCard';

export default function ScheduledJobsSection({ bookings = [], navigation, isDarkMode }) {
  if (!bookings.length) {
    return (
      <EmptyJobsState
        title="No scheduled jobs yet"
        message="Confirmed bookings and upcoming service jobs will appear here."
        icon="event-busy"
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <View>
      {bookings.map((booking) => (
        <ScheduledJobCard
          key={booking.id}
          booking={booking}
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate('IT22129376ScheduledJobDetails', { booking })}
        />
      ))}
    </View>
  );
}
