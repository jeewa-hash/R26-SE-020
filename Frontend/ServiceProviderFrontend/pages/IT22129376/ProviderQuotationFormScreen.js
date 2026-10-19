import { COLORS } from './theme';
import React, { useContext, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { canQuoteRequest } from '../../utils/providerFlowState';
import { submitProviderQuotation, getProviderRequestById } from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import { CONFIG } from '../../config';
import { openProviderTab } from '../../utils/providerFlowUi';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

const notify = (title, message, done) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${message}`); done?.(); }
  else Alert.alert(title, message, [{ text: 'OK', onPress: done }]);
};

export default function ProviderQuotationFormScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [request, setRequest] = useState(route?.params?.request || {});
  const [refreshingRequest, setRefreshingRequest] = useState(true);
  const [requestError, setRequestError] = useState('');
  const requestId = request._id || request.id || request.requestQuotationId;
  const durationTaskContext = { serviceCategory: request.serviceContext?.category || request.detectedCategory || request.serviceCategory || 'Service', serviceType: request.serviceContext?.serviceType || request.serviceType || request.detectedCategory || 'Service', taskName: request.serviceContext?.taskName || request.taskName || request.detectedTask || request.detectedObject || 'Service request' };
  const [modelContext, setModelContext] = useState({ plannedTeamSize: '1' });
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingQuoteId, setPendingQuoteId] = useState(null);
  const loadRequest = useCallback(async () => {
    setRefreshingRequest(true); setRequestError('');
    try {
      if (!requestId) throw new Error('Request ID is missing.');
      setRequest(await getProviderRequestById(requestId));
    } catch (e) { setRequestError(e.message); }
    finally { setRefreshingRequest(false); }
  }, [requestId]);
  useFocusEffect(useCallback(() => { loadRequest(); }, [loadRequest]));
  const start = request.preferredStartTime ? new Date(request.preferredStartTime) : null;
  const validTime = start && Number.isFinite(start.getTime()) && start > new Date();
  const C = { bg: isDark ? COLORS.darkBg : COLORS.bg, card: isDark ? COLORS.darkCard : COLORS.card, text: isDark ? COLORS.darkText : COLORS.text, muted: isDark ? COLORS.darkMuted : COLORS.muted, border: isDark ? COLORS.darkBorder : COLORS.border };
  const requestReschedule = async () => {
    if (saving || submitted || refreshingRequest || requestError) return;
    setSaving(true);
    try {
      const { token } = await getStoredProviderAuth();
      const response = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/request-quotations/${requestId}/reschedule-request`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: notes.trim() || 'I cannot work at the requested time. Please choose another start time.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to request a new time.');
      notify('New time requested', 'The seeker can choose a new date and time in this session. You have not submitted a quotation yet.', () => navigation.goBack());
    } catch (error) { notify('Unable to request reschedule', error.message); }
    finally { setSaving(false); }
  };
  const retryValidation = async () => {
    setSaving(true);
    try {
      const { token } = await getStoredProviderAuth();
      const response = await fetch(`${CONFIG.PROVIDER_SERVICE_API_URL}/api/provider/quotations/${pendingQuoteId}/validate`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      notify('Validation finished', 'Your saved quotation has been checked.', () => navigation.goBack());
    } catch (error) { notify('Validation pending', error.message); }
    finally { setSaving(false); }
  };
  const submit = async () => {
    if (saving || submitted || refreshingRequest || requestError) return;
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) return notify('Invalid price', 'Enter a price greater than zero.');
    for (const [key, value] of Object.entries(modelContext)) {
      const number = Number(value), minimum = key === 'plannedTeamSize' ? 1 : 0;
      if (value !== '' && (!Number.isFinite(number) || number < minimum || (key !== 'yearsExperience' && !Number.isInteger(number)))) return notify('Check task details', 'Enter valid experience, monthly frequency and team size.');
    }
    if (!canQuoteRequest(request)) return notify('Request unavailable', 'This request is no longer awaiting a quotation or is waiting for a new time.');
    if (!validTime || request.rescheduleRequestedAt) return notify('Start time needed', 'Ask the seeker to choose a future start time before submitting.');
    setSaving(true);
    try {
      const result = await submitProviderQuotation({ providerRequestId: requestId, price: Number(price), notes, plannedTeamSize: Number(modelContext.plannedTeamSize) });
      setSubmitted(true);
      if (result.validationPending) {
        setPendingQuoteId(result._id || result.id);
        notify('Quotation saved', result.message, () => navigation.replace('IT22129376ProviderQuotationDetails', { quotation: result, quotationId: result._id || result.id }));
        return;
      }
      notify('Quotation saved', ['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(result.coordinationStatus) ? 'Your quotation has been checked and sent to the seeker.' : 'Your price is saved. The requested time needs attention; ask the seeker to reschedule from My Jobs → Quotes.', () => navigation.replace('IT22129376ProviderQuotationDetails', { quotation: result, quotationId: result._id || result.id }));
    } catch (error) { notify('Quotation not sent', error.message || 'Please try again. If the time conflicts, request a reschedule.'); }
    finally { setSaving(false); }
  };
  return <View style={[styles.container, { backgroundColor: C.bg }]}>
    <ProviderPageHeader navigation={navigation} title="Send Quotation" subtitle="One quotation per request. The seeker chooses the start time." />
    <ScrollView contentContainerStyle={styles.content}>
      {requestError ? <Text accessibilityRole="alert" style={{ color: '#DC2626' }}>{requestError}</Text> : null}
      <TouchableOpacity onPress={loadRequest} disabled={saving || refreshingRequest}><Text style={{ color: '#15803D' }}>{refreshingRequest ? 'Refreshing request…' : 'Refresh Request'}</Text></TouchableOpacity>
      {!canQuoteRequest(request) && !request.rescheduleRequestedAt ? <Text style={{ color: C.muted }}>A quotation is no longer requested. View My Quotations to track the existing offer.</Text> : null}
      <Text style={[styles.label, { color: C.muted }]}>Seeker’s requested start</Text>
      <Text style={[styles.time, { color: C.text }]}>{start && Number.isFinite(start.getTime()) ? start.toLocaleString() : 'Not selected yet'}</Text>
      {request.rescheduleRequestedAt ? <Text style={{ color: C.muted }}>Waiting for the seeker to choose a new time.</Text> : null}
      <Text style={[styles.label, { color: C.muted }]}>Your quotation (LKR)</Text>
      <TextInput accessibilityLabel="Quotation price" style={[styles.input, { color: C.text, backgroundColor: C.card, borderColor: C.border }]} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Enter your total price" placeholderTextColor={C.muted} editable={!saving && !submitted} />
      <View style={[styles.summary, { backgroundColor: C.card, borderColor: C.border }]}>
        <Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>SERVICE FROM THE REQUEST</Text>
        <Text style={{ color: C.text, fontSize: 17, fontWeight: '700' }}>{durationTaskContext.taskName}</Text>
        <Text style={{ color: C.muted }}>{durationTaskContext.serviceCategory}</Text>
      </View>
      <View style={[styles.summary, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.summaryRow}><View style={{ flex: 1 }}><Text style={{ color: C.text, fontWeight: '600' }}>People working on this job</Text><Text style={{ color: C.muted, fontSize: 12 }}>Include yourself</Text></View><TouchableOpacity accessibilityLabel="Remove team member" disabled={saving || submitted || Number(modelContext.plannedTeamSize) <= 1} onPress={() => setModelContext(current => ({ ...current, plannedTeamSize: String(Math.max(1, Number(current.plannedTeamSize) - 1)) }))} style={styles.stepper}><Text style={{ color: C.text, fontSize: 22 }}>−</Text></TouchableOpacity><Text style={{ color: C.text, fontWeight: '700', fontSize: 18 }}>{modelContext.plannedTeamSize}</Text><TouchableOpacity accessibilityLabel="Add team member" disabled={saving || submitted} onPress={() => setModelContext(current => ({ ...current, plannedTeamSize: String(Number(current.plannedTeamSize) + 1) }))} style={styles.stepper}><Text style={{ color: C.text, fontSize: 22 }}>+</Text></TouchableOpacity></View>
      </View>
      <Text style={[styles.label, { color: C.muted }]}>Note / reason for requesting a new time</Text>
      <TextInput accessibilityLabel="Quotation note" style={[styles.input, { color: C.text, backgroundColor: C.card, borderColor: C.border }]} value={notes} onChangeText={setNotes} multiline placeholder="Optional note" placeholderTextColor={C.muted} />
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => navigation.navigate('ProviderAvailability')} disabled={saving}><Text style={styles.buttonText}>Manage Working Hours</Text></TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => openProviderTab(navigation, 'Bookings', { tab: 'Quotes' })} disabled={saving}><Text style={styles.buttonText}>View My Quotations</Text></TouchableOpacity>
      <Text style={{ color: C.muted }}>Your working hours and existing bookings are checked before submission. Duration is calculated automatically.</Text>
      <TouchableOpacity style={[styles.button, (!validTime || saving || submitted || request.rescheduleRequestedAt) && styles.disabled]} onPress={submit} disabled={!validTime || saving || submitted || refreshingRequest || Boolean(requestError) || !canQuoteRequest(request)}><Text style={styles.buttonText}>{saving ? 'Checking availability…' : 'Check Availability & Send Quotation'}</Text></TouchableOpacity>
      {pendingQuoteId ? <TouchableOpacity style={styles.button} onPress={retryValidation} disabled={saving}><Text style={styles.buttonText}>Retry Validation of Saved Quotation</Text></TouchableOpacity> : null}
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={requestReschedule} disabled={saving || submitted}><Text style={styles.buttonText}>Ask Seeker to Reschedule</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, summary: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 14 }, summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }, stepper: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#E8F5EC', alignItems: 'center', justifyContent: 'center' }, content: { padding: 20, gap: 12 }, label: { fontSize: 14, fontWeight: '600', marginTop: 8 }, time: { fontSize: 18 }, input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 16 }, button: { backgroundColor: '#15803D', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 }, secondary: { backgroundColor: '#475569' }, buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' }, disabled: { opacity: 0.5 } });
