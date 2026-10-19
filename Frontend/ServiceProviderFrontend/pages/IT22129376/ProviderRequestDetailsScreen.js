import React, { useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
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
  const start = request?.preferredStartTime || request?.requestedStartTime;
  const date = start ? new Date(start) : null;
  const validDate = date && Number.isFinite(date.getTime());
  const startDate = validDate ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Start time not provided';
  const startTime = validDate ? date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : 'Ask the customer to choose a time';
  const budgetValue = request?.seekerBudgetAmount ?? request?.budget;
  const budget = budgetValue != null && budgetValue !== '' && Number.isFinite(Number(budgetValue)) ? `LKR ${Number(budgetValue).toLocaleString()}` : 'Not shared';
  const canQuote = canQuoteRequest(request) && !error && !loading;
  const location = getHumanLocation(request);
  const category = clean(request?.detectedCategory || request?.serviceCategory || request?.category, 'General service');
  const customer = getHumanSeekerName(request);
  const urgency = clean(request?.urgencyLevel || request?.urgency, 'Normal');
  const card = [styles.card, { backgroundColor: C.card, borderColor: C.border }];
  const sectionTitle = [styles.sectionTitle, { color: C.text }];

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ProviderPageHeader navigation={navigation} title="Service Request" subtitle="Review the work before preparing your quote" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}>
          <Text style={[styles.status, { color: C.text }]}>{statusLabel(requestStatus)}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Refresh request" onPress={load} disabled={loading} style={styles.refresh}>
            {loading ? <ActivityIndicator size="small" color="#15803D" /> : <Ionicons name="refresh-outline" size={18} color="#15803D" />}
            <Text style={styles.link}>{loading ? 'Updating' : 'Refresh'}</Text>
          </TouchableOpacity>
        </View>
        {error ? <View style={[styles.card, { backgroundColor: C.card, borderColor: '#D97706' }]}><Text accessibilityRole="alert" style={{ color: C.text }}>Could not refresh this request. {error}</Text><Text style={[styles.hint, { color: C.muted }]}>Refresh before preparing a quotation.</Text></View> : null}

        <View style={card}>
          <Text style={styles.category}>{category}</Text>
          <Text style={[styles.title, { color: C.text }]}>{getHumanServiceTitle(request)}</Text>
          {customer && customer !== 'Customer' ? <Text style={[styles.hint, { color: C.muted }]}>Requested by {customer}</Text> : null}
          <View style={[styles.summary, { borderColor: C.border }]}>
            <View style={styles.summaryItem}><Text style={[styles.label, { color: C.muted }]}>Customer’s budget</Text><Text style={[styles.summaryValue, { color: C.text }]}>{budget}</Text></View>
            <View style={styles.summaryItem}><Text style={[styles.label, { color: C.muted }]}>Urgency</Text><Text style={[styles.summaryValue, { color: C.text }]}>{urgency}</Text></View>
          </View>
          <Text style={sectionTitle}>What the customer needs</Text>
          <Text selectable style={[styles.description, { color: C.text }]}>{clean(request?.briefDescription || request?.description, 'No work description was shared. Message the customer to clarify the job before quoting.')}</Text>
        </View>

        <View style={card}>
          <Text style={sectionTitle}>When & where</Text>
          <View style={styles.detailRow}>
            <View style={[styles.icon, { backgroundColor: C.bg }]}><Ionicons name="calendar-outline" size={21} color="#15803D" /></View>
            <View style={styles.detailText}><Text style={[styles.label, { color: C.muted }]}>Requested start</Text><Text style={[styles.detailValue, { color: C.text }]}>{startDate}</Text><Text style={[styles.detailValue, { color: C.text }]}>{startTime}</Text></View>
          </View>
          <View style={styles.detailRow}>
            <View style={[styles.icon, { backgroundColor: C.bg }]}><Ionicons name="location-outline" size={21} color="#15803D" /></View>
            <View style={styles.detailText}><Text style={[styles.label, { color: C.muted }]}>Job location</Text><Text style={[styles.detailValue, { color: C.text }]}>{location}</Text>
              {location !== 'Location not provided' ? <TouchableOpacity accessibilityRole="button" style={styles.mapButton} onPress={() => openLocationInMaps({ latitude: request?.serviceLatitude ?? request?.location?.lat, longitude: request?.serviceLongitude ?? request?.location?.lng, address: location, label: getHumanServiceTitle(request) })}><Text style={styles.link}>Open in Maps</Text><Ionicons name="open-outline" size={16} color="#15803D" /></TouchableOpacity> : null}
            </View>
          </View>
          <View style={[styles.notice, { backgroundColor: C.bg }]}><Ionicons name="time-outline" size={20} color="#15803D" /><Text style={[styles.noticeText, { color: C.muted }]}>The estimated duration and finish time will appear when you check availability while preparing your quote.</Text></View>
        </View>

        <View style={card}>
          <Text style={sectionTitle}>{canQuoteRequest(request) ? 'Your next step' : 'Request progress'}</Text>
          <Text style={[styles.description, { color: C.muted }]}>{request.rescheduleRequestedAt ? 'You asked for another time. Wait for the customer to update the request.' : canQuoteRequest(request) ? 'Review the job, then prepare your price and check whether the requested time fits your schedule. Sending a quote does not confirm a booking.' : 'This request is no longer waiting for a new quotation. Track your offer in My Quotations.'}</Text>
          {request.seekerId ? <TouchableOpacity accessibilityRole="button" style={[styles.secondary, { borderColor: C.border }]} onPress={() => openProviderChat(navigation, request.seekerId, customer)}><Ionicons name="chatbubble-outline" size={18} color="#15803D" /><Text style={styles.link}>Message Customer</Text></TouchableOpacity> : null}
          {request.postId ? <TouchableOpacity accessibilityRole="button" style={styles.textButton} onPress={() => navigation.navigate('ProviderPostDetail', { post: { _id: idOf(request.postId) } })}><Text style={styles.link}>View Original Post</Text><Ionicons name="arrow-forward" size={16} color="#15803D" /></TouchableOpacity> : null}
          <TouchableOpacity accessibilityRole="button" style={styles.textButton} onPress={() => openProviderTab(navigation, 'Bookings', { tab: 'Quotes' })}><Text style={styles.link}>My Quotations</Text><Ionicons name="arrow-forward" size={16} color="#15803D" /></TouchableOpacity>
        </View>
      </ScrollView>
      {canQuoteRequest(request) ? <View style={[styles.footer, { backgroundColor: C.card, borderColor: C.border }]}><TouchableOpacity accessibilityRole="button" disabled={!canQuote} style={[styles.button, !canQuote && { opacity: .5 }]} onPress={() => navigation.navigate('IT22129376ProviderQuotationForm', { request })}><Text style={styles.buttonText}>Prepare Quotation</Text><Ionicons name="arrow-forward" size={19} color="#FFFFFF" /></TouchableOpacity></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, gap: 14, paddingBottom: 24 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  card: { borderRadius: 18, padding: 18, borderWidth: 1 },
  status: { fontSize: 13, fontWeight: '600', flex: 1 }, category: { color: '#15803D', fontSize: 12, fontWeight: '700', marginBottom: 7 },
  title: { fontSize: 22, fontWeight: '700', lineHeight: 29 }, hint: { marginTop: 8, fontSize: 13, lineHeight: 19 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 22, borderTopWidth: 1, marginTop: 18, paddingTop: 16, marginBottom: 22 },
  summaryItem: { flexGrow: 1 }, label: { fontSize: 12, lineHeight: 18 }, summaryValue: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 }, description: { fontSize: 14, lineHeight: 23 },
  detailRow: { flexDirection: 'row', gap: 12, marginVertical: 10 }, icon: { height: 42, width: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }, detailText: { flex: 1 }, detailValue: { fontSize: 15, lineHeight: 23, fontWeight: '600', marginTop: 2 },
  notice: { flexDirection: 'row', gap: 9, borderRadius: 12, padding: 12, marginTop: 12 }, noticeText: { flex: 1, fontSize: 12, lineHeight: 19 },
  link: { color: '#15803D', fontWeight: '600', fontSize: 13 }, mapButton: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 10 },
  secondary: { borderWidth: 1, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', padding: 13, marginTop: 18, borderRadius: 12 },
  textButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13, marginTop: 4 },
  footer: { padding: 16, borderTopWidth: 1 }, button: { backgroundColor: '#15803D', borderRadius: 13, padding: 16, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
