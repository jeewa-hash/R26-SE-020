import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getBookingEndDate, getBookingId, getBookingStartDate, getBookingStatus,
  getHumanLocation, getHumanSeekerName, getHumanServiceTitle,
  getProviderBookingById, statusLabel, updateBookingLifecycle,
} from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';

const formatDateTime = (value) => value && !Number.isNaN(value.getTime())
  ? value.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not scheduled';

export default function ProviderJobDetailsScreen({ route, navigation }) {
  const initialBooking = route?.params?.booking || {};
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [delayReason, setDelayReason] = useState('Provider needs additional time');
  const [extraMinutes, setExtraMinutes] = useState('30');
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
      const messages = { 'confirm-ready': 'Ready confirmed.', start: 'Job started successfully.', 'report-delay': 'Delay reported successfully.', complete: 'Job completed successfully.' };
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

  if (loading && !getBookingId(booking)) {
    return <SafeAreaView style={styles.container}><View style={styles.loading}><ActivityIndicator color="#667eea" /><Text style={styles.row}>Loading...</Text></View></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.card}>
          <Text style={styles.title}>{getHumanServiceTitle(booking)}</Text>
          <Text style={styles.status}>{statusLabel(status)}</Text>
          <Text style={styles.row}>Scheduled: {formatDateTime(getBookingStartDate(booking))} – {formatDateTime(getBookingEndDate(booking))}</Text>
          <Text style={styles.row}>Customer: {getHumanSeekerName(booking)}</Text>
          <Text style={styles.row}>Location: {getHumanLocation(booking)}</Text>
          <Text style={styles.row}>Amount: {Number(booking?.finalAmount || booking?.amount || 0) ? `LKR ${Number(booking?.finalAmount || booking?.amount).toLocaleString()}` : 'Not set'}</Text>
          <Text style={styles.row}>Delay Risk: {booking?.delayRiskLevel || 'UNKNOWN'}</Text>
          {status === 'CONFIRMED' ? <Text style={styles.info}>Booking confirmed</Text> : null}
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
          {booking?.delayInfo?.delayImpactStatus === 'NEXT_BOOKING_AT_RISK' ? <Text style={styles.riskWarning}>This delay may affect your next scheduled job.</Text> : null}
          {['CONFIRMED', 'IN_PROGRESS'].includes(status) ? <><TextInput style={styles.input} value={delayReason} onChangeText={setDelayReason} placeholder="Delay reason" /><TextInput style={styles.input} value={extraMinutes} onChangeText={setExtraMinutes} keyboardType="numeric" placeholder="Extra minutes" /></> : null}
          <View style={styles.actions}>
            {status === 'CONFIRMED' ? <><TouchableOpacity disabled={updating} style={styles.button} onPress={() => runAction('confirm-ready')}><Text style={styles.buttonText}>Confirm Ready</Text></TouchableOpacity><TouchableOpacity disabled={updating} style={styles.button} onPress={() => confirmAction('Start Job', 'Start this job now?', 'start')}><Text style={styles.buttonText}>Start Job</Text></TouchableOpacity></> : null}
            {['CONFIRMED', 'IN_PROGRESS'].includes(status) ? <TouchableOpacity disabled={updating} style={styles.warningButton} onPress={() => runAction('report-delay', { delayReason, extraTimeMinutes: Number(extraMinutes) || 30 })}><Text style={styles.warningButtonText}>Report Delay</Text></TouchableOpacity> : null}
            {['IN_PROGRESS', 'DELAY_REPORTED'].includes(status) ? <TouchableOpacity disabled={updating} style={styles.successButton} onPress={() => confirmAction('Complete Job', 'Mark this job as completed?', 'complete')}><Text style={styles.successButtonText}>Complete Job</Text></TouchableOpacity> : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' }, header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  backButton: { marginRight: 12 }, headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' }, content: { padding: 16 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18 }, title: { fontSize: 20, fontWeight: '800', color: '#111827' }, status: { marginTop: 8, color: '#6366F1', fontWeight: '800' }, row: { marginTop: 12, color: '#4B5563', fontSize: 15 },
  info: { marginTop: 12, color: '#2563EB', fontWeight: '800' }, success: { marginTop: 12, color: '#047857', fontWeight: '800' }, delayBox: { marginTop: 12, backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10 }, warning: { color: '#B45309', marginBottom: 5 }, riskWarning: { marginTop: 12, color: '#B45309', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, fontWeight: '700' },
  error: { color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 12 }, input: { marginTop: 12, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, padding: 12, color: '#111827' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  button: { backgroundColor: '#667eea', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', fontWeight: '800' }, warningButton: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12 }, warningButtonText: { color: '#B45309', fontWeight: '800' }, successButton: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12 }, successButtonText: { color: '#047857', fontWeight: '800' },
});
