// pages/IT22129376/ProviderJobDetailsScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './theme';
import { completeProviderJob, reportProviderDelay, startProviderJob } from './services/providerFlowApi';
import { formatDateTime, formatTime } from './utils/dateTimeFormatter';
import { getBookingEnd, getBookingId, getBookingStart, getLocation, getRiskStyle, getServiceCategory, getServiceTitle, getSeekerName, getStatus, getStatusStyle } from './utils/providerFlowMapper';

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '-'}</Text>
  </View>
);

const Badge = ({ label, bg, color }) => (
  <View style={[styles.badge, { backgroundColor: bg }]}> 
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

export default function ProviderJobDetailsScreen({ route, navigation }) {
  const [booking, setBooking] = useState(route?.params?.booking || {});
  const bookingId = route?.params?.bookingId || getBookingId(booking);
  const [delayReason, setDelayReason] = useState('');
  const [loadingAction, setLoadingAction] = useState(null);

  const status = getStatusStyle(getStatus(booking));
  const risk = getRiskStyle(booking.delayRiskLevel || booking.predictedDelayRiskLevel);

  const runAction = async (actionName, fn, successStatus) => {
    if (!bookingId) {
      Alert.alert('Missing Booking', 'Booking ID was not found.');
      return;
    }
    setLoadingAction(actionName);
    try {
      await fn();
      setBooking((current) => ({ ...current, status: successStatus }));
      Alert.alert('Success', `${actionName} updated successfully.`);
    } catch (error) {
      console.log(`${actionName} failed:`, error);
      Alert.alert('Action Failed', error.message || `Could not update ${actionName}.`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleStart = () => runAction('Start Job', () => startProviderJob(bookingId), 'IN_PROGRESS');
  const handleComplete = () => runAction('Complete Job', () => completeProviderJob(bookingId), 'COMPLETED');
  const handleDelay = () => {
    if (!delayReason.trim()) {
      Alert.alert('Delay Reason Required', 'Please add a short delay reason.');
      return;
    }
    runAction('Report Delay', () => reportProviderDelay(bookingId, delayReason.trim()), 'DELAY_REPORTED');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Job Details</Text>
          <Text style={styles.headerSub}>Manage provider job lifecycle</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{getServiceTitle(booking)}</Text>
              <Text style={styles.subtitle}>{getServiceCategory(booking)}</Text>
            </View>
          </View>

          <View style={styles.badgeRow}>
            <Badge label={status.label} bg={status.bg} color={status.color} />
            <Badge label={risk.label} bg={risk.bg} color={risk.color} />
          </View>

          <Row label="Booking ID" value={bookingId} />
          <Row label="Seeker" value={getSeekerName(booking)} />
          <Row label="Scheduled Start" value={formatDateTime(getBookingStart(booking))} />
          <Row label="Scheduled End" value={formatDateTime(getBookingEnd(booking))} />
          <Row label="Time Window" value={`${formatTime(getBookingStart(booking))} - ${formatTime(getBookingEnd(booking))}`} />
          <Row label="Location" value={getLocation(booking)} />
          <Row label="Final Amount" value={booking.finalAmount || booking.price ? `LKR ${booking.finalAmount || booking.price}` : '-'} />
          <Row label="Coordination Status" value={booking.coordinationStatus || booking.finalDecision} />
          <Row label="Notes" value={booking.notes || booking.description} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Provider Actions</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStart} disabled={loadingAction !== null}>
            {loadingAction === 'Start Job' ? <ActivityIndicator color="#fff" /> : <><Ionicons name="play-outline" size={19} color="#fff" /><Text style={styles.primaryButtonText}>Start Job</Text></>}
          </TouchableOpacity>

          <TextInput
            style={styles.delayInput}
            value={delayReason}
            onChangeText={setDelayReason}
            placeholder="Delay reason, e.g. traffic delay"
            placeholderTextColor="#9CA3AF"
            multiline
          />
          <TouchableOpacity style={styles.warningButton} onPress={handleDelay} disabled={loadingAction !== null}>
            {loadingAction === 'Report Delay' ? <ActivityIndicator color="#fff" /> : <><Ionicons name="warning-outline" size={19} color="#fff" /><Text style={styles.primaryButtonText}>Report Delay</Text></>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.successButton} onPress={handleComplete} disabled={loadingAction !== null}>
            {loadingAction === 'Complete Job' ? <ActivityIndicator color="#fff" /> : <><Ionicons name="checkmark-done-outline" size={19} color="#fff" /><Text style={styles.primaryButtonText}>Complete Job</Text></>}
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 26, gap: 12, borderBottomLeftRadius: 26, borderBottomRightRadius: 26 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: '900' },
  headerSub: { color: 'rgba(255,255,255,0.82)', fontSize: 12, marginTop: 3, fontWeight: '600' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '900' },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  rowLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  sectionTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900', marginBottom: 12 },
  primaryButton: { backgroundColor: COLORS.primary, borderRadius: 16, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  warningButton: { backgroundColor: COLORS.warning, borderRadius: 16, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12 },
  successButton: { backgroundColor: COLORS.success, borderRadius: 16, height: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
  delayInput: { height: 86, backgroundColor: '#F9FAFB', borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 12, color: COLORS.text, marginBottom: 12, textAlignVertical: 'top', fontWeight: '700' },
});
