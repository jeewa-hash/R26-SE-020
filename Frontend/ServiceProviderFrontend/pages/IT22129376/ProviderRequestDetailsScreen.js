import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHumanLocation, getHumanSeekerName, getHumanServiceTitle, openLocationInMaps, statusLabel } from '../../services/providerFlowApi';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

const clean = (value, fallback = 'Not provided') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text && !/^[a-f\d]{24}$/i.test(text) ? text : fallback;
};

export default function ProviderRequestDetailsScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = { bg: isDark ? '#0F172A' : '#F8FAFC', card: isDark ? '#1E293B' : '#FFFFFF', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#94A3B8' : '#4B5563', border: isDark ? '#334155' : '#E2E8F0' };
  const request = route?.params?.request || {};
  const requestStatus = String(request?.status || 'pending').toLowerCase();
  const duration = request?.seekerEstimatedDurationHours || request?.estimatedDurationHours;
  const budget = Number(request?.seekerBudgetAmount || request?.budget || 0);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ProviderPageHeader navigation={navigation} title="Request Details" subtitle="Review the customer's service request" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{getHumanServiceTitle(request)}</Text>
          <Text style={styles.status}>{statusLabel(requestStatus)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Category: {clean(request?.detectedCategory || request?.serviceCategory || request?.category, 'General')}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Detected service: {clean(request?.detectedObject || request?.serviceSubcategory, 'Service')}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Customer: {getHumanSeekerName(request)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Location: {getHumanLocation(request)}</Text>
          {(getHumanLocation(request) !== 'Location not provided') ? <TouchableOpacity style={styles.mapButton} onPress={() => openLocationInMaps({ latitude: request?.serviceLatitude ?? request?.location?.lat, longitude: request?.serviceLongitude ?? request?.location?.lng, address: getHumanLocation(request), label: getHumanServiceTitle(request) })}><Ionicons name="map-outline" size={17} color="#4F46E5" /><Text style={styles.mapButtonText}>Open in Maps</Text></TouchableOpacity> : null}
          {Number(request?.estimatedTravelTimeMins) > 0 ? <Text style={[styles.row, { color: C.muted }]}>Estimated travel time: {Math.round(request.estimatedTravelTimeMins)} mins</Text> : null}
          {Number(request?.distanceFromPreviousBookingKm) > 0 ? <Text style={[styles.row, { color: C.muted }]}>Distance: {Number(request.distanceFromPreviousBookingKm).toFixed(1)} km</Text> : null}
          <Text style={[styles.row, { color: C.muted }]}>Preferred time: {clean(request?.preferredTimeLabel)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Preferred start: {clean(request?.preferredStartTime || request?.requestedStartTime)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Preferred end: {clean(request?.preferredEndTime || request?.requestedEndTime)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Estimated duration: {duration ? `${duration} hour(s)` : 'Not provided'}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Budget: {budget ? `LKR ${budget.toLocaleString()}` : 'Not provided'}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Urgency: {clean(request?.urgencyLevel || request?.urgency)}</Text>
          <Text style={[styles.description, { color: C.text, backgroundColor: C.bg }]}>{clean(request?.briefDescription || request?.description, 'No description provided.')}</Text>
          {requestStatus === 'pending' ? (
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('IT22129376ProviderQuotationForm', { request })}>
              <Text style={styles.buttonText}>Send Quotation</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 16 }, card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '600', color: '#111827' }, status: { marginTop: 8, color: '#6366F1', fontWeight: '600' },
  row: { marginTop: 12, color: '#4B5563', fontSize: 14, fontWeight: '400' },
  description: { marginTop: 16, color: '#374151', lineHeight: 21, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10 },
  button: { backgroundColor: '#667eea', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '600' },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#EEF2FF', borderRadius: 10 },
  mapButtonText: { color: '#4F46E5', fontWeight: '600' },
});
