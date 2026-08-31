import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBookingStatus, getHumanSeekerName, getHumanServiceTitle, getHumanLocation, statusLabel } from '../../services/providerFlowApi';

export default function ProviderJobDetailsScreen({ route, navigation }) {
  const booking = route?.params?.booking || {};
  const status = getBookingStatus(booking);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{getHumanServiceTitle(booking)}</Text>
          <Text style={styles.status}>{statusLabel(status)}</Text>
          <Text style={styles.row}>Customer: {getHumanSeekerName(booking)}</Text>
          <Text style={styles.row}>Location: {getHumanLocation(booking)}</Text>
          <Text style={styles.row}>Amount: LKR {Number(booking.finalAmount || 0).toLocaleString()}</Text>
          <Text style={styles.row}>Delay Risk: {booking.delayRiskLevel || 'UNKNOWN'}</Text>
          {booking.providerReadyConfirmed ? <Text style={styles.success}>Ready confirmed</Text> : null}
          {booking.delayInfo?.delayReason ? <Text style={styles.warning}>Delay reason: {booking.delayInfo.delayReason}</Text> : null}
          {booking.delayInfo?.delayImpactStatus === 'NEXT_BOOKING_AT_RISK' ? <Text style={styles.warning}>This delay may affect your next scheduled job.</Text> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  content: { padding: 16 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' },
  status: { marginTop: 8, color: '#6366F1', fontWeight: '800' },
  row: { marginTop: 12, color: '#4B5563', fontSize: 15 },
  success: { marginTop: 12, color: '#047857', fontWeight: '800' },
  warning: { marginTop: 12, color: '#B45309', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10 },
});
