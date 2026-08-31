import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { submitProviderQuotation } from '../../services/providerFlowApi';
import { getStoredUserId } from '../../utils/jwtHelpers';

export default function ProviderQuotationFormScreen({ route, navigation }) {
  const request = route?.params?.request || {};
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState(String(request?.seekerEstimatedDurationHours || request?.estimatedDurationHours || ''));
  const [startTime, setStartTime] = useState(request?.preferredStartTime || '');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const requestId = request?._id || request?.id || request?.requestQuotationId;

  const submit = async () => {
    if (!price || !duration || !startTime) {
      Alert.alert('Missing Details', 'Please enter price, duration and proposed start time.');
      return;
    }
    try {
      setSaving(true);
      const providerId = await getStoredUserId();
      await submitProviderQuotation({
        providerRequestId: requestId,
        externalRequestQuotationId: requestId,
        externalSessionId: request?.sessionId || request?.externalSessionId || request?.serviceSessionId,
        seekerId: request?.seekerId || request?.userId || request?.customerId,
        providerId,
        serviceCategory: request?.serviceCategory || request?.detectedCategory || 'General',
        serviceSubcategory: request?.serviceSubcategory || request?.detectedObject || 'Service',
        price: Number(price),
        proposedStartTime: startTime,
        estimatedDurationHours: Number(duration),
        durationText: `${duration} Hours`,
        notes,
      });
      Alert.alert('Success', 'Quotation submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Failed', error?.message || 'Could not submit quotation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Submit Quotation</Text>
        <Text style={styles.label}>Price (LKR)</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={price} onChangeText={setPrice} placeholder="2000" />
        <Text style={styles.label}>Estimated Duration Hours</Text>
        <TextInput style={styles.input} keyboardType="numeric" value={duration} onChangeText={setDuration} placeholder="2" />
        <Text style={styles.label}>Proposed Start Time</Text>
        <TextInput style={styles.input} value={startTime} onChangeText={setStartTime} placeholder="2026-09-01T09:00:00" />
        <Text style={styles.label}>Notes</Text>
        <TextInput style={[styles.input, styles.textArea]} value={notes} onChangeText={setNotes} placeholder="Add a short note" multiline />
        <TouchableOpacity style={styles.button} onPress={submit} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Submitting...' : 'Submit Quotation'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 8 },
  input: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', padding: 13, marginBottom: 16 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  button: { backgroundColor: '#667eea', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
