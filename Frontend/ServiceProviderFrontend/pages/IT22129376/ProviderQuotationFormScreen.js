// pages/IT22129376/ProviderQuotationFormScreen.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from './theme';
import { toDatetimeLocalString, datetimeLocalToIso, formatDateTime } from './utils/dateTimeFormatter';
import { buildQuotationPayload, createProviderQuotation } from './services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import { getRequestId, getServiceCategory, getServiceTitle } from './utils/providerFlowMapper';

const Field = ({ label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false }) => (
  <View style={styles.field}>
    <Text style={styles.label}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && styles.textArea]}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#9CA3AF"
      keyboardType={keyboardType}
      multiline={multiline}
    />
  </View>
);

export default function ProviderQuotationFormScreen({ route, navigation }) {
  const request = route?.params?.request || {};
  const routeProviderId = route?.params?.providerId;
  const [price, setPrice] = useState('');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState(String(request.providerEstimatedDurationHours || request.estimatedDurationHours || request.seekerEstimatedDurationHours || ''));
  const [proposedStartTime, setProposedStartTime] = useState(toDatetimeLocalString(request.preferredStartTime || new Date()));
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const previewIso = useMemo(() => datetimeLocalToIso(proposedStartTime), [proposedStartTime]);

  const submitQuotation = async () => {
    if (!price || Number(price) <= 0) {
      Alert.alert('Missing Price', 'Please enter a valid quotation amount.');
      return;
    }
    if (!estimatedDurationHours || Number(estimatedDurationHours) <= 0) {
      Alert.alert('Missing Duration', 'Please enter estimated duration in hours.');
      return;
    }
    if (!previewIso) {
      Alert.alert('Invalid Time', 'Please enter proposed start time like 2026-08-30T10:30.');
      return;
    }

    setLoading(true);
    try {
      const auth = await getStoredProviderAuth();
      const providerId = routeProviderId || auth.providerId;
      if (!providerId) throw new Error('Provider ID not found. Please login again.');

      const payload = buildQuotationPayload({ request, providerId, price, proposedStartTime: previewIso, estimatedDurationHours, notes });
      console.log('Submitting provider quotation:', payload);
      const result = await createProviderQuotation(payload);
      Alert.alert('Quotation Sent', 'Your quotation was sent to the seeker successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
      console.log('Quotation submit result:', result);
    } catch (error) {
      console.log('Submit quotation failed:', error);
      Alert.alert('Submit Failed', error.message || 'Could not submit quotation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.purple]} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Submit Quotation</Text>
          <Text style={styles.headerSub}>Price, time and duration for coordination</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.requestCard}>
          <Text style={styles.requestTitle}>{getServiceTitle(request)}</Text>
          <Text style={styles.requestSub}>{getServiceCategory(request)}</Text>
          <Text style={styles.requestMeta}>Request: {getRequestId(request) || '-'}</Text>
          <Text style={styles.requestMeta}>Seeker preferred: {formatDateTime(request.preferredStartTime)}</Text>
        </View>

        <View style={styles.formCard}>
          <Field label="Quotation Amount (LKR)" value={price} onChangeText={setPrice} placeholder="Example: 2700" keyboardType="numeric" />
          <Field label="Proposed Start Time" value={proposedStartTime} onChangeText={setProposedStartTime} placeholder="2026-08-30T10:30" />
          <Text style={styles.helperText}>Use format: YYYY-MM-DDTHH:mm. Example: 2026-08-30T10:30</Text>
          <Field label="Estimated Duration (hours)" value={estimatedDurationHours} onChangeText={setEstimatedDurationHours} placeholder="Example: 3" keyboardType="numeric" />
          <Field label="Notes / Warranty / Conditions" value={notes} onChangeText={setNotes} placeholder="Example: I can bring materials. Warranty 7 days." multiline />
        </View>

        <TouchableOpacity style={[styles.primaryButton, loading && styles.disabled]} onPress={submitQuotation} disabled={loading} activeOpacity={0.85}>
          {loading ? <ActivityIndicator color="#fff" /> : <><Ionicons name="send-outline" size={19} color="#fff" /><Text style={styles.primaryButtonText}>Send Quotation</Text></>}
        </TouchableOpacity>
        <View style={{ height: 80 }} />
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
  requestCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 14 },
  requestTitle: { color: COLORS.text, fontSize: 18, fontWeight: '900' },
  requestSub: { color: COLORS.muted, fontSize: 13, marginTop: 4, fontWeight: '700' },
  requestMeta: { color: COLORS.muted, fontSize: 12, marginTop: 8, fontWeight: '600' },
  formCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: COLORS.border },
  field: { marginBottom: 16 },
  label: { color: COLORS.text, fontSize: 13, fontWeight: '900', marginBottom: 7 },
  input: { minHeight: 48, backgroundColor: '#F9FAFB', borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, color: COLORS.text, fontWeight: '700' },
  textArea: { height: 110, textAlignVertical: 'top', paddingTop: 12 },
  helperText: { color: COLORS.muted, fontSize: 11, marginTop: -10, marginBottom: 14, lineHeight: 16 },
  primaryButton: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: 18, height: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  disabled: { opacity: 0.65 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '900' },
});
