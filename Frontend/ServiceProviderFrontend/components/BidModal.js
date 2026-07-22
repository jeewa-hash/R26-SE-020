import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function BidModal({ job, onDismiss }) {
  const [bidAmount, setBidAmount] = useState(job?.minPrice || 50);
  
  const handleIncrement = () => setBidAmount(prev => prev + 5);
  const handleDecrement = () => setBidAmount(prev => prev > 5 ? prev - 5 : prev);

  return (
    <View style={styles.modalContent}>
      {/* 1. Header with Countdown */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Place Your Bid</Text>
          <Text style={styles.subtitle}>{job?.title || 'Garden Landscaping'}</Text>
        </View>
        <View style={styles.timerBadge}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#EF4444" />
          <Text style={styles.timerText}>04:59</Text>
        </View>
      </View>

      {/* 2. Market Insights */}
      <View style={styles.insightsRow}>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Average Bid</Text>
          <Text style={styles.insightValue}>$45.00</Text>
        </View>
        <View style={[styles.insightCard, styles.activeInsight]}>
          <Text style={[styles.insightLabel, { color: '#7C3AED' }]}>Top Bid</Text>
          <Text style={[styles.insightValue, { color: '#7C3AED' }]}>$62.00</Text>
        </View>
      </View>

      {/* 3. Modern Bid Stepper */}
      <View style={styles.bidPickerContainer}>
        <TouchableOpacity onPress={handleDecrement} style={styles.stepBtn}>
          <MaterialCommunityIcons name="minus" size={28} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <Text style={styles.currencySymbol}>$</Text>
          <TextInput
            style={styles.bidInput}
            value={bidAmount.toString()}
            keyboardType="numeric"
            onChangeText={(val) => setBidAmount(Number(val))}
          />
        </View>

        <TouchableOpacity onPress={handleIncrement} style={styles.stepBtn}>
          <MaterialCommunityIcons name="plus" size={28} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* 4. Action Buttons */}
      <View style={styles.footer}>
        <Button 
          mode="contained" 
          onPress={() => console.log('Bid Placed:', bidAmount)}
          style={styles.confirmBtn}
          labelStyle={styles.confirmBtnLabel}
        >
          Confirm Bid
        </Button>
        <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
          <Text style={styles.cancelText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    backgroundColor: '#FFF',
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 2 },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  timerText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  
  insightsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 30,
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeInsight: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },
  insightLabel: { fontSize: 11, color: '#6B7280', fontWeight: '600', textTransform: 'uppercase' },
  insightValue: { fontSize: 18, fontWeight: '800', color: '#1F2937', marginTop: 4 },

  bidPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 24,
    padding: 8,
    marginBottom: 30,
  },
  stepBtn: {
    width: 50,
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  currencySymbol: { fontSize: 24, fontWeight: '700', color: '#1F2937', marginRight: 4 },
  bidInput: { fontSize: 36, fontWeight: '800', color: '#1F2937', textAlign: 'center', minWidth: 80 },

  footer: { gap: 12 },
  confirmBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    borderRadius: 16,
  },
  confirmBtnLabel: { fontSize: 16, fontWeight: '700', paddingVertical: 4 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { color: '#9CA3AF', fontWeight: '600' },
});