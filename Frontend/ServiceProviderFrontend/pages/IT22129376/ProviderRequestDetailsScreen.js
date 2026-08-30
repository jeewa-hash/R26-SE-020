// pages/IT22129376/ProviderRequestDetailsScreen.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './theme';
import { formatDateTime } from './utils/dateTimeFormatter';
import { getRequestId, getServiceCategory, getServiceTitle, getSeekerName, getLocation, getStatusStyle } from './utils/providerFlowMapper';

const Row = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value || '-'}</Text>
  </View>
);

export default function ProviderRequestDetailsScreen({ route, navigation }) {
  const request = route?.params?.request || {};
  const providerId = route?.params?.providerId;
  const status = getStatusStyle(request.status || 'PENDING');

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Request Details</Text>
          <Text style={styles.headerSub}>Review seeker request before sending quotation</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{getServiceTitle(request)}</Text>
              <Text style={styles.subtitle}>{getServiceCategory(request)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: status.bg }]}>
              <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
            </View>
          </View>

          <Row label="Request ID" value={getRequestId(request)} />
          <Row label="Session ID" value={request.externalSessionId || request.sessionId || request.serviceSessionId} />
          <Row label="Seeker" value={getSeekerName(request)} />
          <Row label="Location" value={getLocation(request)} />
          <Row label="Preferred Start" value={formatDateTime(request.preferredStartTime || request.requestedDate)} />
          <Row label="Preferred End" value={formatDateTime(request.preferredEndTime)} />
          <Row label="Estimated Duration" value={`${request.seekerEstimatedDurationHours || request.estimatedDurationHours || '-'} hours`} />
          <Row label="Budget" value={request.seekerBudgetAmount || request.budget ? `LKR ${request.seekerBudgetAmount || request.budget}` : '-'} />
          <Row label="Urgency" value={request.urgency || request.priority} />
          <Row label="Notes" value={request.notes || request.description || request.problemDescription} />
        </View>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('IT22129376ProviderQuotationForm', { request, providerId })}
          activeOpacity={0.85}
        >
          <Ionicons name="send-outline" size={19} color="#fff" />
          <Text style={styles.primaryButtonText}>Submit Provider Quotation</Text>
        </TouchableOpacity>

        <View style={{ height: 60 }} />
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
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 },
  title: { color: COLORS.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: COLORS.muted, fontSize: 13, fontWeight: '700', marginTop: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeText: { fontSize: 11, fontWeight: '900' },
  row: { paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  rowLabel: { color: COLORS.muted, fontSize: 12, fontWeight: '800', marginBottom: 4 },
  rowValue: { color: COLORS.text, fontSize: 14, fontWeight: '700', lineHeight: 20 },
  primaryButton: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 18, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
