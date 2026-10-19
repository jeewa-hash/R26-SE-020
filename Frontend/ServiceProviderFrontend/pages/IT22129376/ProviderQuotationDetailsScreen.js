import { Ionicons } from '@expo/vector-icons';
import { sessionGuidance } from '../../utils/providerSessions';
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';
import { getProviderQuotationById, getProviderRequestById, getProviderBookings, retryProviderQuotation, askSeekerToReschedule, getHumanServiceTitle, statusLabel } from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import { bookingForQuote, idOf } from '../../utils/providerFlowState';
import { confirm, notify, openProviderTab } from '../../utils/providerFlowUi';

export default function ProviderQuotationDetailsScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [quote, setQuote] = useState(route.params?.quotation || {});
  const [request, setRequest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const quoteId = idOf(route.params?.quotationId || route.params?.quotation?._id || route.params?.quotation?.id);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (!quoteId) throw new Error('Quotation ID is missing. Return to My Jobs and refresh.');
      const latest = await getProviderQuotationById(quoteId);
      setQuote(latest);
      const { providerId } = await getStoredProviderAuth();
      const requestId = idOf(latest.providerRequestId || latest.externalRequestQuotationId);
      const results = await Promise.allSettled([
        requestId ? getProviderRequestById(requestId) : Promise.resolve(null),
        getProviderBookings(providerId),
      ]);
      setRequest(results[0].status === 'fulfilled' ? results[0].value : null);
      setBooking(results[1].status === 'fulfilled' ? bookingForQuote(results[1].value, latest) || null : null);
      if (results.some(result => result.status === 'rejected')) setError('Some linked details could not be loaded. Refresh before taking the next step.');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [quoteId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const action = async work => {
    if (busy) return;
    setBusy(true);
    try { await work(); await load(); }
    catch (e) { notify('Unable to update quotation', e.message); }
    finally { setBusy(false); }
  };
  const status = String(quote.status || 'SENT').toUpperCase();
  const coordination = String(quote.coordinationStatus || 'NOT_CHECKED').toUpperCase();
  const sent = ['SENT', 'COUNTER_OFFERED'].includes(status);
  const needsTime = ['RESCHEDULE_REQUIRED','CONFLICT_DETECTED','NOT_AVAILABLE','REJECTED_DUE_TO_CONFLICT','NEEDS_RESCHEDULE','CONFLICT_FOUND','REJECTED_BY_COORDINATION'].includes(coordination);
  const C = { bg: isDark ? '#0C0F0D' : '#F5FAF6', card: isDark ? '#161F19' : '#FFFFFF', text: isDark ? '#F0FDF4' : '#182B20', muted: isDark ? '#B1C2B6' : '#58685E', border: isDark ? '#35483B' : '#DCE9E0', tint: isDark ? '#233D2B' : '#EDF7F0' };
  const guidance = sessionGuidance({ request, quotation: quote, booking });
  const ready = ['CAN_ACCEPT','AVAILABLE_WITH_CAUTION'].includes(coordination);
  const disabled = busy || loading || Boolean(error);
  const start = quote.coordinatedStartTime || quote.proposedStartTime || request?.preferredStartTime;
  const date = start ? new Date(start) : null;
  const hasDate = date && Number.isFinite(date.getTime());
  const availability = coordination === 'CAN_ACCEPT' ? ['Time available', 'Your schedule check passed for this start time.']
    : coordination === 'AVAILABLE_WITH_CAUTION' ? ['Available · review advisory', 'This time can proceed. The availability check includes an advisory; a confirmed booking is still needed.']
    : needsTime ? ['Another time needed', 'The requested time could not be approved. Review your hours and ask the customer for another time.']
    : ['Availability not verified', 'Recheck your saved quotation before it can proceed.'];
  const primary = booking ? { label: 'Manage Booking', icon: 'calendar-outline', onPress: () => navigation.navigate('IT22129376ProviderJobDetails', { booking }) }
    : sent && needsTime && request && !request.rescheduleRequestedAt ? { label: 'Ask Customer for Another Time', icon: 'time-outline', onPress: () => confirm('Request a new time', 'Ask the customer to choose another start time? Your price stays unchanged.', () => action(() => askSeekerToReschedule(idOf(request._id || request.id), 'I cannot work at the requested time. Please choose another start time.'))) }
    : sent && !ready && !request?.rescheduleRequestedAt ? { label: 'Check Availability', icon: 'refresh-outline', onPress: () => action(() => retryProviderQuotation(quoteId)) } : null;
  const secondary = (label, icon, onPress, blocked = false) => <TouchableOpacity accessibilityRole="button" disabled={blocked || busy || loading} onPress={onPress} style={[styles.linkRow, { borderColor: C.border, opacity: blocked || busy || loading ? .5 : 1 }]}><Ionicons name={icon} size={19} color="#15803D" /><Text style={[styles.linkText, { color: C.text }]}>{label}</Text><Ionicons name="chevron-forward" size={17} color={C.muted} /></TouchableOpacity>;
  const card = [styles.card, { backgroundColor: C.card, borderColor: C.border }];
  return <View style={[styles.container, { backgroundColor: C.bg }]}>
    <ProviderPageHeader navigation={navigation} title="Your Quotation" subtitle="Track your offer and what happens next" />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.toolbar}><View style={[styles.badge, { backgroundColor: C.tint }]}><Text style={[styles.badgeText, { color: C.text }]}>{statusLabel(status)}</Text></View><TouchableOpacity accessibilityRole="button" disabled={loading || busy} onPress={load} style={styles.refresh}>{loading || busy ? <ActivityIndicator size="small" color="#15803D" /> : <Ionicons name="refresh-outline" size={18} color="#15803D" />}<Text style={styles.refreshText}>{loading || busy ? 'Updating' : 'Refresh'}</Text></TouchableOpacity></View>
      {error ? <View style={[styles.notice, { backgroundColor: C.card, borderColor: '#D97706' }]}><Text accessibilityRole="alert" style={[styles.body, { color: C.text }]}>{error}</Text></View> : null}
      <View style={card}>
        <Text style={[styles.eyebrow, { color: C.muted }]}>YOUR PRICE</Text><Text style={[styles.price, { color: isDark ? '#86EFAC' : '#166534' }]}>LKR {Number(quote.price || 0).toLocaleString()}</Text>
        <Text style={[styles.title, { color: C.text }]}>{getHumanServiceTitle(request || quote)}</Text>
        {quote.notes ? <View style={[styles.notes, { borderColor: C.border }]}><Text style={[styles.label, { color: C.muted }]}>Your note to the customer</Text><Text style={[styles.body, { color: C.text }]}>{quote.notes}</Text></View> : null}
      </View>
      <View style={[styles.card, { backgroundColor: C.tint, borderColor: C.border }]}>
        <View style={styles.headingRow}><Ionicons name={booking ? 'checkmark-circle-outline' : needsTime ? 'time-outline' : 'chatbubble-ellipses-outline'} size={23} color="#15803D" /><Text style={[styles.sectionTitle, { color: C.text, flex: 1 }]}>{guidance.title}</Text></View>
        <Text style={[styles.body, { color: C.muted }]}>{guidance.message}</Text>
        <Text style={[styles.owner, { color: C.text }]}>Next step: {guidance.owner === 'Seeker' ? 'Customer' : guidance.owner}</Text>
      </View>
      <View style={card}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>Schedule</Text>
        <View style={styles.scheduleRow}><View style={[styles.icon, { backgroundColor: C.tint }]}><Ionicons name="calendar-outline" size={23} color="#15803D" /></View><View style={styles.flex}><Text style={[styles.label, { color: C.muted }]}>Requested start</Text><Text style={[styles.date, { color: C.text }]}>{hasDate ? date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : 'Not provided'}</Text>{hasDate ? <Text style={[styles.time, { color: C.text }]}>{date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</Text> : null}</View></View>
        <View style={[styles.notes, { borderColor: C.border }]}><Text style={[styles.availabilityTitle, { color: C.text }]}>{availability[0]}</Text><Text style={[styles.body, { color: C.muted }]}>{availability[1]}</Text></View>
      </View>
      <View style={card}><Text style={[styles.sectionTitle, { color: C.text }]}>Related details</Text>
        {request ? secondary('Original Request', 'document-text-outline', () => navigation.navigate('IT22129376ProviderRequestDetails', { request })) : null}
        {sent && ready && !request?.rescheduleRequestedAt && !booking ? secondary('Recheck Availability', 'refresh-outline', () => action(() => retryProviderQuotation(quoteId)), Boolean(error)) : null}
        {secondary('Manage Working Hours', 'time-outline', () => navigation.navigate('ProviderAvailability'))}
        {secondary('My Jobs', 'briefcase-outline', () => openProviderTab(navigation, 'Bookings', { tab: booking ? 'Scheduled' : 'Quotes' }))}
      </View>
    </ScrollView>
    {primary ? <View style={[styles.footer, { backgroundColor: C.card, borderColor: C.border }]}><TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={primary.onPress} style={[styles.primary, disabled && { opacity: .5 }]}><Text style={styles.primaryText}>{primary.label}</Text><Ionicons name={primary.icon} size={20} color="#FFFFFF" /></TouchableOpacity></View> : null}
  </View>;
}
const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, gap: 14, paddingBottom: 24 }, flex: { flex: 1 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, flexShrink: 1 }, badgeText: { fontSize: 12, fontWeight: '600' }, refresh: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 }, refreshText: { color: '#15803D', fontSize: 13, fontWeight: '600' },
  card: { padding: 18, borderRadius: 18, borderWidth: 1 }, notice: { padding: 14, borderRadius: 12, borderWidth: 1 }, eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1 }, price: { fontSize: 32, fontWeight: '700', marginTop: 5, marginBottom: 14 }, title: { fontSize: 20, lineHeight: 28, fontWeight: '700' },
  notes: { borderTopWidth: 1, paddingTop: 14, marginTop: 16 }, label: { fontSize: 12, marginBottom: 4 }, body: { fontSize: 14, lineHeight: 22, marginTop: 5 }, headingRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 5 }, sectionTitle: { fontSize: 16, fontWeight: '700', lineHeight: 23 }, owner: { fontSize: 12, fontWeight: '600', marginTop: 12 },
  scheduleRow: { flexDirection: 'row', gap: 12, marginTop: 16 }, icon: { width: 45, height: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, date: { fontSize: 15, fontWeight: '600', lineHeight: 22 }, time: { fontSize: 17, fontWeight: '700', marginTop: 4 }, availabilityTitle: { fontSize: 14, fontWeight: '600' },
  linkRow: { paddingVertical: 15, borderTopWidth: 1, marginTop: 10, flexDirection: 'row', gap: 10, alignItems: 'center' }, linkText: { flex: 1, fontSize: 14, fontWeight: '500' }, footer: { padding: 16, borderTopWidth: 1 }, primary: { backgroundColor: '#15803D', padding: 16, borderRadius: 13, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }, primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
