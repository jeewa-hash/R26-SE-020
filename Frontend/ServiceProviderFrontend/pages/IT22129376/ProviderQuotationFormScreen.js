import React, { useContext, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { submitProviderQuotation } from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

export default function ProviderQuotationFormScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = { bg: isDark ? '#0F172A' : '#F8FAFC', card: isDark ? '#1E293B' : '#FFFFFF', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#CBD5E1' : '#374151', border: isDark ? '#334155' : '#E2E8F0' };
  const request = route?.params?.request || {};
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(String(request?.seekerEstimatedDurationHours || request?.estimatedDurationHours || ''));
  const preferredDate = request?.preferredStartTime ? new Date(request.preferredStartTime) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const [startTime, setStartTime] = useState(Number.isNaN(preferredDate.getTime()) ? new Date(Date.now() + 24 * 60 * 60 * 1000) : preferredDate);
  const [pickerMode, setPickerMode] = useState(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const requestId = request?._id || request?.id || request?.requestQuotationId;

  const submit = async () => {
    if (!price || !duration || !startTime) {
      Alert.alert('Missing Details', 'Please enter price, duration and proposed start time.');
      return;
    }
    if (Number(price) <= 0 || Number(duration) <= 0 || startTime <= new Date()) {
      Alert.alert('Invalid Details', 'Price and duration must be greater than zero, and the proposed start must be in the future.');
      return;
    }
    try {
      setSaving(true);
      const { token, providerId } = await getStoredProviderAuth();
      console.log('LOGGED PROVIDER ID:', providerId);
      if (!token || !providerId || !requestId) throw new Error('Your provider session or request details are missing. Please login again.');
      await submitProviderQuotation({
        providerRequestId: requestId,
        externalRequestQuotationId: requestId,
        externalSessionId: request?.sessionId,
        seekerId: request?.seekerId,
        providerId,
        serviceCategory: request?.detectedCategory || request?.category || request?.serviceCategory || 'General',
        serviceSubcategory: request?.detectedObject || request?.serviceSubcategory || 'Service',
        price: Number(price),
        proposedStartTime: startTime.toISOString(),
        estimatedDurationHours: Number(duration),
        durationText: `${duration} Hours`,
        notes,
      });
      Alert.alert('Success', 'Quotation sent successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Failed', error?.message || 'Could not submit quotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ProviderPageHeader navigation={navigation} title="Submit Quotation" subtitle="Prepare your price and schedule proposal" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.label, { color: C.muted }]}>Price (LKR)</Text>
        <TextInput style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="2000" />
        <Text style={[styles.label, { color: C.muted }]}>Estimated Duration Hours</Text>
        <TextInput style={[styles.input, { backgroundColor: C.card, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} keyboardType="numeric" value={duration} onChangeText={setDuration} placeholder="2" />
        <Text style={[styles.label, { color: C.muted }]}>Proposed Date</Text>
        <TouchableOpacity style={[styles.pickerButton, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => setPickerMode('date')}><Text style={{ color: C.text }}>{startTime.toLocaleDateString()}</Text></TouchableOpacity>
        <Text style={[styles.label, { color: C.muted }]}>Proposed Start Time</Text>
        <TouchableOpacity style={[styles.pickerButton, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => setPickerMode('time')}><Text style={{ color: C.text }}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity>
        {pickerMode ? <DateTimePicker value={startTime} mode={pickerMode} minimumDate={pickerMode === 'date' ? new Date() : undefined} onChange={(event, value) => { setPickerMode(null); if (value) setStartTime((current) => { const next = new Date(current); if (pickerMode === 'date') next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate()); else next.setHours(value.getHours(), value.getMinutes(), 0, 0); return next; }); }} /> : null}
        <Text style={[styles.label, { color: C.muted }]}>Notes</Text>
        <TextInput style={[styles.input, styles.textArea, { backgroundColor: C.card, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={notes} onChangeText={setNotes} placeholder="Add a short note" multiline />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Submitting...' : 'Submit Quotation'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: 20 },
  label: { fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 13, marginBottom: 16 },
  pickerButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 13, justifyContent: 'center', marginBottom: 16 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: { backgroundColor: '#667eea', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
