import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  confirmBooking,
  startBooking,
  completeBooking,
} from '../../services/coordinationApi';
import { styles, COLORS, getRiskStyle, getStatusStyle } from './styles';

const formatDateTime = (dateValue) => {
  if (!dateValue) return '-';

  return new Date(dateValue).toLocaleString([], {
    year: 'numeric',
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

export default function ProviderBookingDetailScreen({ route, navigation }) {
  const { booking } = route.params || {};
  const [loadingAction, setLoadingAction] = useState(false);
  const [currentBooking, setCurrentBooking] = useState(booking);

  if (!currentBooking) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>Booking not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const bookingId = currentBooking.bookingId || currentBooking._id;
  const risk = getRiskStyle(currentBooking.predictedDelayRiskLevel);
  const status = getStatusStyle(currentBooking.bookingStatus);

  const handleConfirm = async () => {
    try {
      setLoadingAction(true);
      const response = await confirmBooking(bookingId);
      setCurrentBooking(response.data);
      Alert.alert('Success', 'Booking confirmed successfully.');
    } catch (error) {
      console.log(error?.response?.data || error.message);
      Alert.alert('Error', 'Could not confirm booking.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStart = async () => {
    try {
      setLoadingAction(true);
      const actualStartTime = new Date().toISOString();
      const response = await startBooking(bookingId, actualStartTime);
      setCurrentBooking(response.data);
      Alert.alert('Success', 'Service marked as started.');
    } catch (error) {
      console.log(error?.response?.data || error.message);
      Alert.alert('Error', 'Could not start service.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleComplete = async () => {
    try {
      setLoadingAction(true);
      const actualEndTime = new Date().toISOString();
      const response = await completeBooking(bookingId, actualEndTime);
      setCurrentBooking(response.data);
      Alert.alert('Success', 'Service marked as completed.');
    } catch (error) {
      console.log(error?.response?.data || error.message);
      Alert.alert('Error', 'Could not complete service.');
    } finally {
      setLoadingAction(false);
    }
  };

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
            <Text style={styles.headerTitle}>Booking Details</Text>
            <Text style={styles.headerSubtitle}>
              Service schedule and delay-risk information
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.text }}>
                {currentBooking.serviceSubCategory}
              </Text>
              <Text style={[styles.mutedText, { marginTop: 4 }]}>
                {currentBooking.serviceCategory}
              </Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <View style={[styles.badge, { backgroundColor: risk.bg }]}>
              <Text style={[styles.badgeText, { color: risk.color }]}>
                {risk.label}
              </Text>
            </View>

            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>
                {status.label}
              </Text>
            </View>

            {currentBooking.reschedulingRequired && (
              <View style={[styles.badge, { backgroundColor: COLORS.dangerSoft }]}>
                <Text style={[styles.badgeText, { color: COLORS.danger }]}>
                  Rescheduling Required
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <InfoRow
            label="Name"
            value={currentBooking.customerSnapshot?.name || currentBooking.customerId}
          />
          <InfoRow label="Email" value={currentBooking.customerSnapshot?.email} />
          <InfoRow label="District" value={currentBooking.customerSnapshot?.district} />
          <InfoRow label="Telephone" value={currentBooking.customerSnapshot?.telephone} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Schedule</Text>
          <InfoRow label="Start Time" value={formatDateTime(currentBooking.startTime || currentBooking.scheduledStartTime)} />
          <InfoRow label="End Time" value={formatDateTime(currentBooking.endTime || currentBooking.scheduledEndTime)} />
          <InfoRow label="Actual Start" value={formatDateTime(currentBooking.actualStartTime)} />
          <InfoRow label="Actual End" value={formatDateTime(currentBooking.actualEndTime)} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>AI Coordination Result</Text>
          <InfoRow
            label="Estimated Duration"
            value={`${currentBooking.estimatedDurationHours || '-'} hours`}
          />
          <InfoRow
            label="Predicted Duration"
            value={`${currentBooking.predictedActualDurationHours || '-'} hours`}
          />
          <InfoRow
            label="Delay Risk"
            value={currentBooking.predictedDelayRiskLevel}
          />
          <InfoRow
            label="Conflict Status"
            value={currentBooking.conflictStatus}
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Provider Actions</Text>

          {loadingAction ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <TouchableOpacity style={styles.outlineButton} onPress={handleConfirm}>
                <Ionicons name="checkmark-circle-outline" size={19} color={COLORS.primary} />
                <Text style={styles.outlineButtonText}>Confirm Booking</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
                <Ionicons name="play-circle-outline" size={19} color="#fff" />
                <Text style={styles.primaryButtonText}>Start Service</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerButton}
                onPress={() =>
                  navigation.navigate('ProviderDelayReport', {
                    booking: currentBooking,
                  })
                }
              >
                <Ionicons name="warning-outline" size={19} color="#fff" />
                <Text style={styles.dangerButtonText}>Report Delay</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.outlineButton} onPress={handleComplete}>
                <Ionicons name="flag-outline" size={19} color={COLORS.primary} />
                <Text style={styles.outlineButtonText}>Complete Service</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}