import React from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { generateRescheduleSuggestions } from '../../services/coordinationApi';
import { styles, COLORS } from './styles';

const formatDateTime = (dateValue) => {
  if (!dateValue) return '-';

  return new Date(dateValue).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

function InfoRow({ label, value }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '-'}</Text>
    </View>
  );
}

export default function ScheduleImpactResultScreen({ route, navigation }) {
  const { result, delayType, booking } = route.params || {};

  const delayReport = result?.delayReport;
  const startDelayAnalysis = result?.startDelayAnalysis;
  const executionDelayAnalysis = result?.executionDelayAnalysis;
  const scheduleImpact = result?.scheduleImpact;

  const conflictDetected = scheduleImpact?.conflictDetected;
  const reschedulingRequired = scheduleImpact?.reschedulingRequired;
  const affectedBookings = scheduleImpact?.affectedBookings || [];

  const handleGenerateSuggestion = async (affectedBookingId) => {
    try {
      const response = await generateRescheduleSuggestions({
        bookingId: affectedBookingId,
        workingStartTime: '08:00',
        workingEndTime: '18:00',
        searchDays: 7,
        stepMinutes: 60,
        bufferMinutes: 30,
      });

      const slots = response.data?.suggestedSlots || [];

      alert(
        slots.length > 0
          ? `Generated ${slots.length} suggested slot(s). Check seeker reschedule view later.`
          : 'No suitable slots found.'
      );
    } catch (error) {
      console.log(error?.response?.data || error.message);
      alert('Could not generate reschedule suggestions.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('ProviderCalendar')}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Schedule Impact</Text>
            <Text style={styles.headerSubtitle}>
              Delay analysis and affected booking result
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              borderColor: conflictDetected ? COLORS.danger : COLORS.success,
              borderWidth: 1.5,
            },
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '900',
                  color: conflictDetected ? COLORS.danger : COLORS.success,
                }}
              >
                {conflictDetected ? 'Conflict Detected' : 'No Conflict'}
              </Text>
              <Text style={[styles.mutedText, { marginTop: 6 }]}>
                {conflictDetected
                  ? 'The updated service time affects another booking.'
                  : 'This delay does not affect upcoming bookings.'}
              </Text>
            </View>

            <Ionicons
              name={conflictDetected ? 'warning-outline' : 'checkmark-circle-outline'}
              size={34}
              color={conflictDetected ? COLORS.danger : COLORS.success}
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delay Summary</Text>

          <InfoRow
            label="Delay Type"
            value={delayType === 'start_delay' ? 'Start Delay' : 'Execution Delay'}
          />

          <InfoRow
            label="Start Delay"
            value={
              startDelayAnalysis
                ? `${startDelayAnalysis.startDelayMinutes} mins`
                : '-'
            }
          />

          <InfoRow
            label="Execution Delay"
            value={
              executionDelayAnalysis
                ? `${executionDelayAnalysis.executionDelayMinutes} mins`
                : '-'
            }
          />

          <InfoRow
            label="Updated End Time"
            value={formatDateTime(delayReport?.updatedExpectedEndTime)}
          />

          <InfoRow
            label="Rescheduling Required"
            value={reschedulingRequired ? 'Yes' : 'No'}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Affected Bookings</Text>

          {affectedBookings.length === 0 ? (
            <Text style={styles.mutedText}>
              No future bookings were affected.
            </Text>
          ) : (
            affectedBookings.map((item) => (
              <View
                key={item.bookingId}
                style={{
                  backgroundColor: COLORS.dangerSoft,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 12,
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '900', color: COLORS.text }}>
                  {item.serviceSubCategory}
                </Text>

                <Text style={[styles.mutedText, { marginTop: 4 }]}>
                  Customer: {item.customerId}
                </Text>

                <Text style={[styles.mutedText, { marginTop: 4 }]}>
                  Original Time: {formatDateTime(item.scheduledStartTime)} -{' '}
                  {formatDateTime(item.scheduledEndTime)}
                </Text>

                <TouchableOpacity
                  style={[styles.dangerButton, { marginTop: 12 }]}
                  onPress={() => handleGenerateSuggestion(item.bookingId)}
                >
                  <Ionicons name="calendar-outline" size={18} color="#fff" />
                  <Text style={styles.dangerButtonText}>
                    Generate Reschedule Slots
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('ProviderCalendar')}
        >
          <Ionicons name="calendar-outline" size={19} color="#fff" />
          <Text style={styles.primaryButtonText}>Back to Calendar</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}