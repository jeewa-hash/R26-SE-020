import { COLORS } from './theme';
import React, { useContext, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform, ScrollView, StyleSheet } from 'react-native';
import { submitProviderQuotation } from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import { CONFIG } from '../../config';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

const notify = (title, message, done) => {
  if (Platform.OS === 'web') { window.alert(`${title}\n\n${message}`); done?.(); }
  else Alert.alert(title, message, [{ text: 'OK', onPress: done }]);
};

export default function ProviderQuotationFormScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || {};
  const request = route?.params?.request || {};
  const requestId = request._id || request.id || request.requestQuotationId;
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingQuoteId, setPendingQuoteId] = useState(null);
  const start = request.preferredStartTime ? new Date(request.preferredStartTime) : null;
  const validTime = start && Number.isFinite(start.getTime()) && start > new Date();
  const C = { bg: isDark ? COLORS.darkBg : COLORS.bg, card: isDark ? COLORS.darkCard : COLORS.card, text: isDark ? COLORS.darkText : COLORS.text, muted: isDark ? COLORS.darkMuted : COLORS.muted, border: isDark ? COLORS.darkBorder : COLORS.border };
  const requestReschedule = async () => {
    if (saving || submitted) return;
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
    if (saving || submitted) return;
    if (!Number.isFinite(Number(price)) || Number(price) <= 0) return notify('Invalid price', 'Enter a price greater than zero.');
    if (!validTime || request.rescheduleRequestedAt) return notify('Start time needed', 'Ask the seeker to choose a future start time before submitting.');
    setSaving(true);
    try {
      const result = await submitProviderQuotation({ providerRequestId: requestId, price: Number(price), notes });
      setSubmitted(true);
      if (result.validationPending) {
        setPendingQuoteId(result._id || result.id);
        notify('Quotation saved', result.message);
        return;
      }
      notify('Quotation saved', ['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(result.coordinationStatus) ? 'Your quotation has been checked and sent to the seeker.' : 'Your price is saved. The requested time needs attention; ask the seeker to reschedule from My Jobs → Quotes.', () => navigation.goBack());
    } catch (error) { notify('Quotation not sent', error.message || 'Please try again. If the time conflicts, request a reschedule.'); }
    finally { setSaving(false); }
  };
  return <View style={[styles.container, { backgroundColor: C.bg }]}>
    <ProviderPageHeader navigation={navigation} title="Send Quotation" subtitle="One quotation per request. The seeker chooses the start time." />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.label, { color: C.muted }]}>Seeker’s requested start</Text>
      <Text style={[styles.time, { color: C.text }]}>{start && Number.isFinite(start.getTime()) ? start.toLocaleString() : 'Not selected yet'}</Text>
      {request.rescheduleRequestedAt ? <Text style={{ color: C.muted }}>Waiting for the seeker to choose a new time.</Text> : null}
      <Text style={[styles.label, { color: C.muted }]}>Your quotation (LKR)</Text>
      <TextInput accessibilityLabel="Quotation price" style={[styles.input, { color: C.text, backgroundColor: C.card, borderColor: C.border }]} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="Enter your total price" placeholderTextColor={C.muted} editable={!saving && !submitted} />
      <Text style={[styles.label, { color: C.muted }]}>Note / reason for requesting a new time</Text>
      <TextInput accessibilityLabel="Quotation note" style={[styles.input, { color: C.text, backgroundColor: C.card, borderColor: C.border }]} value={notes} onChangeText={setNotes} multiline placeholder="Optional note" placeholderTextColor={C.muted} />
      <Text style={{ color: C.muted }}>Your working hours and existing bookings are checked before submission. Duration is calculated automatically.</Text>
      <TouchableOpacity style={[styles.button, (!validTime || saving || submitted || request.rescheduleRequestedAt) && styles.disabled]} onPress={submit} disabled={!validTime || saving || submitted || Boolean(request.rescheduleRequestedAt)}><Text style={styles.buttonText}>{saving ? 'Checking availability…' : 'Check Availability & Send Quotation'}</Text></TouchableOpacity>
      {pendingQuoteId ? <TouchableOpacity style={styles.button} onPress={retryValidation} disabled={saving}><Text style={styles.buttonText}>Retry Validation of Saved Quotation</Text></TouchableOpacity> : null}
      <TouchableOpacity style={[styles.button, styles.secondary]} onPress={requestReschedule} disabled={saving || submitted}><Text style={styles.buttonText}>Ask Seeker to Reschedule</Text></TouchableOpacity>
    </ScrollView>
  </View>;
}
const styles = StyleSheet.create({ container: { flex: 1 }, content: { padding: 20, gap: 12 }, label: { fontSize: 14, fontWeight: '600', marginTop: 8 }, time: { fontSize: 18 }, input: { borderWidth: 1, padding: 12, borderRadius: 12, fontSize: 16 }, button: { backgroundColor: '#15803D', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 8 }, secondary: { backgroundColor: '#475569' }, buttonText: { color: '#fff', fontWeight: '600', textAlign: 'center' }, disabled: { opacity: 0.5 } });
