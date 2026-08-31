import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getHumanLocation, getHumanSeekerName, getHumanServiceTitle, statusLabel } from '../../services/providerFlowApi';

const clean = (value, fallback = 'Not provided') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text && !/^[a-f\d]{24}$/i.test(text) ? text : fallback;
};

export default function ProviderRequestDetailsScreen({ route, navigation }) {
  const request = route?.params?.request || {};
  const requestStatus = String(request?.status || 'pending').toLowerCase();
  const duration = request?.seekerEstimatedDurationHours || request?.estimatedDurationHours;
  const budget = Number(request?.seekerBudgetAmount || request?.budget || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}><Ionicons name="arrow-back" size={24} color="#111827" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Request Details</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{getHumanServiceTitle(request)}</Text>
          <Text style={styles.status}>{statusLabel(requestStatus)}</Text>
          <Text style={styles.row}>Category: {clean(request?.detectedCategory || request?.serviceCategory || request?.category, 'General')}</Text>
          <Text style={styles.row}>Detected service: {clean(request?.detectedObject || request?.serviceSubcategory, 'Service')}</Text>
          <Text style={styles.row}>Customer: {getHumanSeekerName(request)}</Text>
          <Text style={styles.row}>Location: {getHumanLocation(request)}</Text>
          <Text style={styles.row}>Preferred time: {clean(request?.preferredTimeLabel)}</Text>
          <Text style={styles.row}>Preferred start: {clean(request?.preferredStartTime || request?.requestedStartTime)}</Text>
          <Text style={styles.row}>Preferred end: {clean(request?.preferredEndTime || request?.requestedEndTime)}</Text>
          <Text style={styles.row}>Estimated duration: {duration ? `${duration} hour(s)` : 'Not provided'}</Text>
          <Text style={styles.row}>Budget: {budget ? `LKR ${budget.toLocaleString()}` : 'Not provided'}</Text>
          <Text style={styles.row}>Urgency: {clean(request?.urgency)}</Text>
          <Text style={styles.description}>{clean(request?.briefDescription || request?.description, 'No description provided.')}</Text>
          {requestStatus === 'pending' ? (
            <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('IT22129376ProviderQuotationForm', { request })}>
              <Text style={styles.buttonText}>Send Quotation</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingTop: 48, paddingHorizontal: 16, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff' },
  backButton: { marginRight: 12 }, headerTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  content: { padding: 16 }, card: { backgroundColor: '#fff', borderRadius: 16, padding: 18 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827' }, status: { marginTop: 8, color: '#6366F1', fontWeight: '800' },
  row: { marginTop: 12, color: '#4B5563', fontSize: 15 },
  description: { marginTop: 16, color: '#374151', lineHeight: 21, backgroundColor: '#F9FAFB', padding: 12, borderRadius: 10 },
  button: { backgroundColor: '#667eea', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontWeight: '800' },
});
