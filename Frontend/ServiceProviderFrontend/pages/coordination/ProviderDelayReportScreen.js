import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  reportStartDelay,
  reportExecutionDelay,
} from '../../services/coordinationApi';
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

export default function ProviderDelayReportScreen({ route, navigation }) {
  const { booking } = route.params || {};

  const [delayType, setDelayType] = useState('start_delay');
  const [actualStartTime, setActualStartTime] = useState(
    '2026-05-10T11:00:00.000Z'
  );
  const [updatedExpectedEndTime, setUpdatedExpectedEndTime] = useState(
    '2026-05-10T15:30:00.000Z'
  );
  const [delayReason, setDelayReason] = useState('Previous job overran');
  const [loading, setLoading] = useState(false);

  if (!booking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bookingId = booking.bookingId || booking._id;

  const handleAnalyze = async () => {
    try {
      setLoading(true);

      let response;

      if (delayType === 'start_delay') {
        response = await reportStartDelay({
          bookingId,
          actualStartTime,
          delayReason,
        });
      } else {
        response = await reportExecutionDelay({
          bookingId,
          updatedExpectedEndTime,
          delayReason,
        });
      }

      navigation.navigate('ScheduleImpactResult', {
        result: response.data,
        delayType,
        booking,
      });
    } catch (error) {
      console.log(error?.response?.data || error.message);
      Alert.alert(
        'Delay Analysis Failed',
        'Could not analyze delay. Check backend and booking ID.'
      );
    } finally {
      setLoading(false);
    }
  };

  const InputBox = ({ label, value, onChangeText, placeholder }) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={{ fontSize: 13, color: COLORS.muted, fontWeight: '700', marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={{
          backgroundColor: '#F9FAFB',
          borderWidth: 1,
          borderColor: COLORS.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 14,
          color: COLORS.text,
        }}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>Report Delay</Text>
            <Text style={styles.headerSubtitle}>
              Analyze service delay and schedule impact
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Current Booking</Text>

          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>
            {booking.serviceSubCategory}
          </Text>

          <Text style={[styles.mutedText, { marginTop: 4 }]}>
            {booking.serviceCategory}
          </Text>

          <View style={{ marginTop: 12 }}>
            <Text style={styles.mutedText}>
              Scheduled Start: {formatDateTime(booking.startTime || booking.scheduledStartTime)}
            </Text>
            <Text style={[styles.mutedText, { marginTop: 4 }]}>
              Scheduled End: {formatDateTime(booking.endTime || booking.scheduledEndTime)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delay Type</Text>

          <TouchableOpacity
            style={[
              styles.card,
              {
                marginBottom: 10,
                backgroundColor:
                  delayType === 'start_delay' ? COLORS.primarySoft : COLORS.card,
                borderColor:
                  delayType === 'start_delay' ? COLORS.primary : COLORS.border,
              },
            ]}
            onPress={() => setDelayType('start_delay')}
          >
            <View style={styles.rowBetween}>
              <View>
                <Text style={{ fontWeight: '900', color: COLORS.text }}>
                  Start Delay
                </Text>
                <Text style={[styles.mutedText, { marginTop: 4 }]}>
                  Provider started later than scheduled time.
                </Text>
              </View>
              <Ionicons
                name={delayType === 'start_delay' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={COLORS.primary}
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              {
                marginBottom: 0,
                backgroundColor:
                  delayType === 'execution_delay' ? COLORS.primarySoft : COLORS.card,
                borderColor:
                  delayType === 'execution_delay' ? COLORS.primary : COLORS.border,
              },
            ]}
            onPress={() => setDelayType('execution_delay')}
          >
            <View style={styles.rowBetween}>
              <View>
                <Text style={{ fontWeight: '900', color: COLORS.text }}>
                  Execution Delay
                </Text>
                <Text style={[styles.mutedText, { marginTop: 4 }]}>
                  Service is taking longer than expected.
                </Text>
              </View>
              <Ionicons
                name={delayType === 'execution_delay' ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={COLORS.primary}
              />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delay Details</Text>

          {delayType === 'start_delay' ? (
            <InputBox
              label="Actual Start Time"
              value={actualStartTime}
              onChangeText={setActualStartTime}
              placeholder="2026-05-10T11:00:00.000Z"
            />
          ) : (
            <InputBox
              label="Updated Expected End Time"
              value={updatedExpectedEndTime}
              onChangeText={setUpdatedExpectedEndTime}
              placeholder="2026-05-10T15:30:00.000Z"
            />
          )}

          <InputBox
            label="Delay Reason"
            value={delayReason}
            onChangeText={setDelayReason}
            placeholder="Previous job overran"
          />

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="analytics-outline" size={19} color="#fff" />
                <Text style={styles.primaryButtonText}>Analyze Schedule Impact</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}