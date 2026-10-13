import React, { useCallback, useContext, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getBookingEndDate, getBookingId, getBookingStartDate, getBookingStatus,
  getHumanLocation, getHumanSeekerName, getHumanServiceTitle,
  acceptBookingReschedule, getBookingReschedules, getProviderBookingById, openLocationInMaps,
  rejectBookingReschedule, requestBookingReschedule, statusLabel, updateBookingLifecycle,
} from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

const formatDateTime = (value) => value && !Number.isNaN(value.getTime())
  ? value.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not scheduled';

export default function ProviderJobDetailsScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = { bg: isDark ? '#0F172A' : '#F8FAFC', card: isDark ? '#1E293B' : '#FFFFFF', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#94A3B8' : '#4B5563', border: isDark ? '#334155' : '#E2E8F0' };
  const initialBooking = route?.params?.booking || {};
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [delayReason, setDelayReason] = useState('Provider needs additional time');
  const [extraMinutes, setExtraMinutes] = useState('30');
  const [pendingReschedule, setPendingReschedule] = useState(null);
  const bookingId = getBookingId(booking) || getBookingId(initialBooking);
  const status = getBookingStatus(booking);

  const loadBooking = useCallback(async () => {
    const { token, providerId } = await getStoredProviderAuth();
    console.log('LOGGED PROVIDER ID:', providerId);
    if (!token || !providerId || !bookingId) {
      setError('Unable to load data right now. Please check your connection and try again.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const row = await getProviderBookingById(bookingId);
      if (row && typeof row === 'object') setBooking(row);
      const reschedules = await getBookingReschedules(bookingId);
      setPendingReschedule(reschedules.find((item) => ['PENDING', 'PENDING_PROVIDER_REVIEW'].includes(item?.status)) || null);
    } catch (loadError) {
      console.log('Provider booking details load failed:', loadError?.message);
      setError('Unable to load data right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(useCallback(() => { loadBooking(); }, [loadBooking]));

  const runAction = async (action, body = {}) => {
    try {
      setUpdating(true);
      await updateBookingLifecycle(bookingId, action, body);
      const messages = { 'confirm-ready': 'Ready confirmed.', 'on-the-way': 'The seeker can now see that you are on the way.', start: 'Job started successfully.', 'report-delay': 'Delay reported successfully.', complete: 'Job completed successfully.' };
      Alert.alert('Success', messages[action]);
      await loadBooking();
    } catch (actionError) {
      Alert.alert('Update Failed', actionError?.message || 'Unable to update this job right now. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmAction = (title, message, action) => Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' }, { text: title, onPress: () => runAction(action) },
  ]);

  const acceptSlot = async (slot) => {
    try {
      setUpdating(true);
      await acceptBookingReschedule(pendingReschedule?._id, slot);
      Alert.alert('Rescheduled', 'The selected time was validated and applied.');
      await loadBooking();
    } catch (actionError) {
      Alert.alert('Time Unavailable', actionError?.message || 'This time could not be validated.');
    } finally {
      setUpdating(false);
    }
  };

  const keepBooking = async () => {
    try {
      setUpdating(true);
      await rejectBookingReschedule(pendingReschedule?._id);
      Alert.alert('Booking Kept', 'The current booking time remains unchanged.');
      await loadBooking();
    } catch (actionError) {
      Alert.alert('Update Failed', actionError?.message || 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const requestReschedule = async () => {
    try {
      setUpdating(true);
      await requestBookingReschedule(bookingId);
      Alert.alert('Reschedule Requested', 'Choose a validated suggested slot in the review section.');
      await loadBooking();
    } catch (actionError) {
      Alert.alert('Reschedule Unavailable', actionError?.message || 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !getBookingId(booking)) {
    return <View style={[styles.container, { backgroundColor: C.bg }]}><ProviderPageHeader navigation={navigation} title="Job Details" subtitle="View and manage this booking" /><View style={styles.loading}><ActivityIndicator color="#667eea" /><Text style={[styles.row, { color: C.muted }]}>Loading...</Text></View></View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ProviderPageHeader navigation={navigation} title="Job Details" subtitle="View and manage this booking" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{getHumanServiceTitle(booking)}</Text>
          <Text style={styles.status}>{statusLabel(status)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Scheduled: {formatDateTime(getBookingStartDate(booking))} – {formatDateTime(getBookingEndDate(booking))}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Customer: {getHumanSeekerName(booking)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Location: {getHumanLocation(booking)}</Text>
          {getHumanLocation(booking) !== 'Location not provided' ? <TouchableOpacity style={styles.mapButton} onPress={() => openLocationInMaps({ latitude: booking?.location?.lat, longitude: booking?.location?.lng, address: getHumanLocation(booking), label: getHumanServiceTitle(booking) })}><Ionicons name="map-outline" size={17} color="#4F46E5" /><Text style={styles.mapButtonText}>Open in Maps</Text></TouchableOpacity> : null}
          {Number(booking?.estimatedTravelTimeMins) > 0 ? <Text style={[styles.row, { color: C.muted }]}>Estimated travel time: {Math.round(booking.estimatedTravelTimeMins)} mins</Text> : null}
          {Number(booking?.distanceFromPreviousBookingKm) > 0 ? <Text style={[styles.row, { color: C.muted }]}>Distance: {Number(booking.distanceFromPreviousBookingKm).toFixed(1)} km</Text> : null}
          <Text style={[styles.row, { color: C.muted }]}>Amount: {Number(booking?.finalAmount || booking?.amount || 0) ? `LKR ${Number(booking?.finalAmount || booking?.amount).toLocaleString()}` : 'Not set'}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Delay Risk: {booking?.delayRiskLevel || 'UNKNOWN'}</Text>
          {status === 'CONFIRMED' ? <Text style={styles.info}>Booking confirmed</Text> : null}
          {status === 'ON_THE_WAY' ? <Text style={styles.info}>You are on the way</Text> : null}
          {status === 'IN_PROGRESS' ? <Text style={styles.info}>Service in progress</Text> : null}
          {status === 'COMPLETED' ? <Text style={styles.success}>Job completed</Text> : null}
          {booking?.providerReadyConfirmed ? <Text style={styles.success}>Ready confirmed</Text> : null}
          {status === 'DELAY_REPORTED' ? (
            <View style={styles.delayBox}>
              <Text style={styles.warning}>Delay reason: {booking?.delayInfo?.delayReason || 'Not provided'}</Text>
              <Text style={styles.warning}>Additional delay: {booking?.delayInfo?.additionalDelayMins || booking?.delayInfo?.extraTimeMinutes || 0} minutes</Text>
              <Text style={styles.warning}>Expected end: {booking?.delayInfo?.expectedEndTime ? new Date(booking.delayInfo.expectedEndTime).toLocaleString() : 'Not provided'}</Text>
              <Text style={styles.warning}>Impact: {booking?.delayInfo?.delayImpactStatus || 'NONE'}</Text>
            </View>
          ) : null}
          {pendingReschedule ? (
            <View style={styles.delayBox}>
              <Text style={[styles.title, { color: C.text, fontSize: 16 }]}>Reschedule Review</Text>
              <Text style={[styles.row, { color: C.muted }]}>{pendingReschedule.note || pendingReschedule.reason || 'A new service time was requested.'}</Text>
              {(pendingReschedule.suggestedSlots || []).map((slot, index) => (
                <TouchableOpacity key={`${slot.date}-${slot.startTime}-${index}`} disabled={updating} style={styles.button} onPress={() => acceptSlot(slot)}>
                  <Text style={styles.buttonText}>Choose {slot.date} {slot.startTime}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity disabled={updating} style={styles.warningButton} onPress={keepBooking}>
                <Text style={styles.warningButtonText}>Keep Booking</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          {booking?.delayInfo?.delayImpactStatus === 'NEXT_BOOKING_AT_RISK' ? <Text style={styles.riskWarning}>This delay may affect your next scheduled job.</Text> : null}
          {['IN_PROGRESS', 'DELAY_REPORTED'].includes(status) ? <><TextInput style={styles.input} value={delayReason} onChangeText={setDelayReason} placeholder="Delay reason" /><TextInput style={styles.input} value={extraMinutes} onChangeText={setExtraMinutes} keyboardType="numeric" placeholder="Extra minutes" /></> : null}
          <View style={styles.actions}>
            {['CONFIRMED', 'RESCHEDULED'].includes(status) ? <TouchableOpacity disabled={updating} style={styles.button} onPress={() => confirmAction('Start', 'Start this job now?', 'start')}><Text style={styles.buttonText}>Start</Text></TouchableOpacity> : null}
            {['CONFIRMED', 'RESCHEDULED'].includes(status) && !pendingReschedule ? <TouchableOpacity disabled={updating} style={styles.warningButton} onPress={requestReschedule}><Text style={styles.warningButtonText}>Reschedule</Text></TouchableOpacity> : null}
            {status === 'ON_THE_WAY' ? <TouchableOpacity disabled={updating} style={styles.button} onPress={() => confirmAction('Start', 'Start this job now?', 'start')}><Text style={styles.buttonText}>Start</Text></TouchableOpacity> : null}
            {status === 'IN_PROGRESS' ? <TouchableOpacity disabled={updating} style={styles.warningButton} onPress={() => runAction('report-delay', { delayReason, extraTimeMinutes: Number(extraMinutes) || 30 })}><Text style={styles.warningButtonText}>Report Delay</Text></TouchableOpacity> : null}
            {['IN_PROGRESS', 'DELAY_REPORTED'].includes(status) ? <TouchableOpacity disabled={updating} style={styles.successButton} onPress={() => confirmAction('Complete Job', 'Mark this job as completed?', 'complete')}><Text style={styles.successButtonText}>Complete Job</Text></TouchableOpacity> : null}
            {status === 'COMPLETED' ? <Text style={styles.success}>Completed</Text> : null}
            {status === 'EXPIRED' ? <Text style={styles.warning}>Expired</Text> : null}
            {status === 'RESCHEDULE_REQUESTED' ? <Text style={styles.warning}>Reschedule Pending</Text> : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1 }, title: { fontSize: 20, fontWeight: '600', color: '#111827' }, status: { marginTop: 8, color: '#6366F1', fontWeight: '500' }, row: { marginTop: 12, color: '#4B5563', fontSize: 14, fontWeight: '400' },
  info: { marginTop: 12, color: '#2563EB', fontWeight: '600' }, success: { marginTop: 12, color: '#047857', fontWeight: '600' }, delayBox: { marginTop: 12, backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10 }, warning: { color: '#B45309', marginBottom: 5 }, riskWarning: { marginTop: 12, color: '#B45309', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, fontWeight: '600' },
  error: { color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 12 }, input: { marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, color: '#111827' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  button: { backgroundColor: '#667eea', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', fontWeight: '600' }, warningButton: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12 }, warningButtonText: { color: '#B45309', fontWeight: '600' }, successButton: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12 }, successButtonText: { color: '#047857', fontWeight: '600' },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#EEF2FF', borderRadius: 10 }, mapButtonText: { color: '#4F46E5', fontWeight: '600' },
});
