import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

export default function UserQuotesScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  // Single hardcoded quote – styled like an invoice
  const [quote] = useState({
    id: 'INV-001',
    providerName: 'John Miller (HVAC Pro)',
    serviceDescription: 'Complete HVAC repair – filter replacement, system check, and thermostat calibration.',
    serviceCost: 180,
    transportFee: 25,
    tax: 10,
    total: 215,
    timeline: '2 days',
    message: 'I have 10 years of experience and can start tomorrow.',
    validUntil: '2024-06-01',
    paymentTerms: '50% advance, 50% upon completion',
  });

  const handleConfirm = () => {
    Alert.alert(
      'Confirm Booking',
      `Do you want to accept this quote and confirm the booking?\nTotal: $${quote.total}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => {
            Alert.alert('Success', 'Booking confirmed! You will receive a confirmation email.');
            // Navigate to a success screen or go back
            navigation.goBack();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'} />
      
      {/* Header */}
      <LinearGradient colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quote / Invoice</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Invoice Card */}
        <View style={[styles.invoiceCard, isDarkMode && styles.invoiceCardDark]}>
          {/* Header */}
          <View style={styles.invoiceHeader}>
            <Text style={[styles.invoiceTitle, isDarkMode && styles.textDark]}>PROPOSAL / QUOTE</Text>
            <Text style={[styles.invoiceNumber, isDarkMode && styles.textMutedDark]}>#{quote.id}</Text>
          </View>

          {/* Provider Info */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, isDarkMode && styles.textMutedDark]}>Provider</Text>
            <Text style={[styles.providerName, isDarkMode && styles.textDark]}>{quote.providerName}</Text>
            <Text style={[styles.message, isDarkMode && styles.textMutedDark]}>{quote.message}</Text>
          </View>

          {/* Timeline */}
          <View style={styles.row}>
            <Ionicons name="time-outline" size={20} color="#667eea" />
            <Text style={[styles.rowText, isDarkMode && styles.textDark]}>Estimated timeline: {quote.timeline}</Text>
          </View>
          <View style={styles.row}>
            <Ionicons name="calendar-outline" size={20} color="#667eea" />
            <Text style={[styles.rowText, isDarkMode && styles.textDark]}>Valid until: {quote.validUntil}</Text>
          </View>

          {/* Service Description */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, isDarkMode && styles.textMutedDark]}>Service Description</Text>
            <Text style={[styles.description, isDarkMode && styles.textMutedDark]}>{quote.serviceDescription}</Text>
          </View>

          {/* Cost Breakdown (Invoice style) */}
          <View style={styles.costBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, isDarkMode && styles.textMutedDark]}>Service cost</Text>
              <Text style={[styles.breakdownAmount, isDarkMode && styles.textDark]}>${quote.serviceCost}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, isDarkMode && styles.textMutedDark]}>Transport / travel fee</Text>
              <Text style={[styles.breakdownAmount, isDarkMode && styles.textDark]}>${quote.transportFee}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, isDarkMode && styles.textMutedDark]}>Tax (estimated)</Text>
              <Text style={[styles.breakdownAmount, isDarkMode && styles.textDark]}>${quote.tax}</Text>
            </View>
            <View style={[styles.divider, isDarkMode && styles.dividerDark]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, isDarkMode && styles.textDark]}>Total</Text>
              <Text style={[styles.totalAmount, isDarkMode && styles.textDark]}>${quote.total}</Text>
            </View>
          </View>

          {/* Payment Terms */}
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, isDarkMode && styles.textMutedDark]}>Payment Terms</Text>
            <Text style={[styles.termsText, isDarkMode && styles.textMutedDark]}>{quote.paymentTerms}</Text>
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
            <LinearGradient colors={['#10B981', '#059669']} style={styles.confirmGradient}>
              <Text style={styles.confirmButtonText}>Confirm Booking</Text>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Note */}
          <Text style={[styles.note, isDarkMode && styles.textMutedDark]}>
            By confirming, you agree to the terms and conditions of this quote.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff20', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  content: { padding: 16, paddingBottom: 40 },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  invoiceCardDark: { backgroundColor: '#16213e' },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  invoiceTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', letterSpacing: 1 },
  invoiceNumber: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  section: { marginBottom: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '500', color: '#6B7280', marginBottom: 6, textTransform: 'uppercase' },
  providerName: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  message: { fontSize: 14, color: '#6B7280', lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  rowText: { fontSize: 14, color: '#1F2937' },
  description: { fontSize: 14, color: '#4B5563', lineHeight: 20 },
  costBreakdown: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 16, marginBottom: 20 },
  breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  breakdownLabel: { fontSize: 14, color: '#6B7280' },
  breakdownAmount: { fontSize: 14, fontWeight: '500', color: '#1F2937' },
  divider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 12 },
  dividerDark: { backgroundColor: '#2d3561' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#1F2937' },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#667eea' },
  termsText: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
  confirmButton: { borderRadius: 14, overflow: 'hidden', marginTop: 8, marginBottom: 16 },
  confirmGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
  confirmButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  note: { fontSize: 11, color: '#9CA3AF', textAlign: 'center', marginTop: 8 },
});