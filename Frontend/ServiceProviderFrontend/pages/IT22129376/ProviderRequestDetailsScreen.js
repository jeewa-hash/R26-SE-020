import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getProviderRequestById } from '../../services/providerFlowApi';
import { canQuoteRequest, idOf } from '../../utils/providerFlowState';
import { openProviderTab, openProviderChat } from '../../utils/providerFlowUi';
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
  const C = { bg: isDark ? '#0C0F0D' : '#F5FAF6', card: isDark ? '#161C18' : '#FFFFFF', text: isDark ? '#F5FAF6' : '#161C18', muted: isDark ? '#94A3B8' : '#4B5563', border: isDark ? '#303C33' : '#D8E8DC' };
  const [request, setRequest] = useState(route?.params?.request || {});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestId = idOf(route?.params?.requestId || route?.params?.request?._id || route?.params?.request?.id);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { if (!requestId) throw new Error('Request ID is missing.'); setRequest(await getProviderRequestById(requestId)); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [requestId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const requestStatus = String(request?.status || 'pending').toLowerCase();
  const formatTime = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString() : 'Not selected';
  const budget = Number(request?.seekerBudgetAmount || request?.budget || 0);

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ProviderPageHeader navigation={navigation} title="Request Details" subtitle="Review the customer's service request" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? <Text accessibilityRole="alert" style={{ color: '#DC2626' }}>{error}</Text> : null}
        <TouchableOpacity onPress={load} disabled={loading}><Text style={{ color: '#15803D', padding: 12 }}>{loading ? 'Refreshing…' : 'Refresh Request'}</Text></TouchableOpacity>
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.title, { color: C.text }]}>{getHumanServiceTitle(request)}</Text>
          <Text style={styles.status}>{statusLabel(requestStatus)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Category: {clean(request?.detectedCategory || request?.serviceCategory || request?.category, 'General')}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Detected service: {clean(request?.detectedObject || request?.serviceSubcategory, 'Service')}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Customer: {getHumanSeekerName(request)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Location: {getHumanLocation(request)}</Text>
          {(getHumanLocation(request) !== 'Location not provided') ? <TouchableOpacity style={styles.mapButton} onPress={() => openLocationInMaps({ latitude: request?.serviceLatitude ?? request?.location?.lat, longitude: request?.serviceLongitude ?? request?.location?.lng, address: getHumanLocation(request), label: getHumanServiceTitle(request) })}><Ionicons name="map-outline" size={17} color="#166534" /><Text style={styles.mapButtonText}>Open in Maps</Text></TouchableOpacity> : null}
          {Number(request?.estimatedTravelTimeMins) > 0 ? <Text style={[styles.row, { color: C.muted }]}>Estimated travel time: {Math.round(request.estimatedTravelTimeMins)} mins</Text> : null}
          {Number(request?.distanceFromPreviousBookingKm) > 0 ? <Text style={[styles.row, { color: C.muted }]}>Distance: {Number(request.distanceFromPreviousBookingKm).toFixed(1)} km</Text> : null}
          <Text style={[styles.row, { color: C.muted }]}>Preferred time: {clean(request?.preferredTimeLabel)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Preferred start: {formatTime(request?.preferredStartTime || request?.requestedStartTime)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Preferred end: {formatTime(request?.preferredEndTime || request?.requestedEndTime)}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Task duration is calculated during availability validation.</Text>
          <Text style={[styles.row, { color: C.muted }]}>Budget: {budget ? `LKR ${budget.toLocaleString()}` : 'Not provided'}</Text>
          <Text style={[styles.row, { color: C.muted }]}>Urgency: {clean(request?.urgencyLevel || request?.urgency)}</Text>
          <Text style={[styles.description, { color: C.text, backgroundColor: C.bg }]}>{clean(request?.briefDescription || request?.description, 'No description provided.')}</Text>
          {canQuoteRequest(request) && !error ? (
            <TouchableOpacity disabled={loading} style={[styles.button, loading && { opacity: .5 }]} onPress={() => navigation.navigate('IT22129376ProviderQuotationForm', { request })}>
              <Text style={styles.buttonText}>Send Quotation</Text>
            </TouchableOpacity>
          ) : <Text style={[styles.row, { color: C.muted }]}>{request.rescheduleRequestedAt ? 'Waiting for the seeker to choose a new time.' : 'This request is no longer awaiting a quotation.'}</Text>}
          {request.seekerId ? <TouchableOpacity style={styles.mapButton} onPress={() => openProviderChat(navigation, request.seekerId, getHumanSeekerName(request))}><Text style={styles.mapButtonText}>Message Seeker</Text></TouchableOpacity> : null}
          {request.postId ? <TouchableOpacity style={styles.mapButton} onPress={() => navigation.navigate('ProviderPostDetail', { post: { _id: idOf(request.postId) } })}><Text style={styles.mapButtonText}>View Original Post</Text></TouchableOpacity> : null}
          <TouchableOpacity style={styles.button} onPress={() => openProviderTab(navigation, 'Bookings', { tab: 'Quotes' })}><Text style={styles.buttonText}>View My Quotations</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF6' },
  content: { padding: 16 }, card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1 },
  title: { fontSize: 20, fontWeight: '600', color: '#162C49' }, status: { marginTop: 8, color: '#15803D', fontWeight: '600' },
  row: { marginTop: 12, color: '#4B5563', fontSize: 14, fontWeight: '400' },
  description: { marginTop: 16, color: '#374151', lineHeight: 21, backgroundColor: '#F5FAF6', padding: 12, borderRadius: 10 },
  button: { backgroundColor: '#15803D', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '600' },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#EAF7EE', borderRadius: 10 },
  mapButtonText: { color: '#166534', fontWeight: '600' },
});
