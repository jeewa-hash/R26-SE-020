import React, { useState, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import { Text, Avatar, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ThemeContext } from '../context/ThemeContext';

export default function BidModal({ job, onDismiss }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [bidAmount, setBidAmount] = useState(job?.minPrice || 50);
  
  const handleIncrement = () => setBidAmount(prev => prev + 5);
  const handleDecrement = () => setBidAmount(prev => prev > 5 ? prev - 5 : prev);

  const C = isDark
    ? {
        modalBg: '#1c1c1e',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#2c2c2e',
        cardBg: '#2a2a2a',
        stepBg: '#3a3a3c',
        stepIcon: '#F2F2F7',
      }
    : {
        modalBg: '#FFFFFF',
        text: '#1F2937',
        textSub: '#6B7280',
        border: '#E5E7EB',
        cardBg: '#F9FAFB',
        stepBg: '#FFFFFF',
        stepIcon: '#1F2937',
      };

  return (
    <View style={[styles.modalContent, { backgroundColor: C.modalBg }]}>
      {/* 1. Header with Countdown */}
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { color: C.text }]}>Place Your Bid</Text>
          <Text style={[styles.subtitle, { color: C.textSub }]}>{job?.title || 'Garden Landscaping'}</Text>
        </View>
        <View style={styles.timerBadge}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#EF4444" />
          <Text style={styles.timerText}>04:59</Text>
        </View>
      </View>

      {/* 2. Market Insights */}
      <View style={styles.insightsRow}>
        <View style={[styles.insightCard, { backgroundColor: C.cardBg, borderColor: C.border }]}>
          <Text style={[styles.insightLabel, { color: C.textSub }]}>Average Bid</Text>
          <Text style={[styles.insightValue, { color: C.text }]}>$45.00</Text>
        </View>
        <View style={[styles.insightCard, isDark ? { backgroundColor: '#2e1065', borderColor: '#7c3aed' } : styles.activeInsight]}>
          <Text style={[styles.insightLabel, { color: '#7C3AED' }]}>Top Bid</Text>
          <Text style={[styles.insightValue, { color: '#7C3AED' }]}>$62.00</Text>
        </View>
      </View>

      {/* 3. Modern Bid Stepper */}
      <View style={[styles.bidPickerContainer, { backgroundColor: isDark ? '#2a2a2a' : '#F3F4F6' }]}>
        <TouchableOpacity onPress={handleDecrement} style={[styles.stepBtn, { backgroundColor: C.stepBg }]}>
          <MaterialCommunityIcons name="minus" size={28} color={C.stepIcon} />
        </TouchableOpacity>
        
        <View style={styles.inputWrapper}>
          <Text style={[styles.currencySymbol, { color: C.text }]}>$</Text>
          <TextInput
            style={[styles.bidInput, { color: C.text }]}
            value={bidAmount.toString()}
            keyboardType="numeric"
            onChangeText={(val) => setBidAmount(Number(val) || 0)}
          />
        </View>

        <TouchableOpacity onPress={handleIncrement} style={[styles.stepBtn, { backgroundColor: C.stepBg }]}>
          <MaterialCommunityIcons name="plus" size={28} color={C.stepIcon} />
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
          <Text style={[styles.cancelText, { color: C.textSub }]}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContent: {
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
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 2 },
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
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  activeInsight: {
    backgroundColor: '#F5F3FF',
    borderColor: '#C4B5FD',
  },
  insightLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase' },
  insightValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },

  bidPickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    padding: 8,
    marginBottom: 30,
  },
  stepBtn: {
    width: 50,
    height: 50,
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
  currencySymbol: { fontSize: 24, fontWeight: '700', marginRight: 4 },
  bidInput: { fontSize: 36, fontWeight: '800', textAlign: 'center', minWidth: 80 },

  footer: { gap: 12 },
  confirmBtn: {
    backgroundColor: '#7C3AED',
    paddingVertical: 8,
    borderRadius: 16,
  },
  confirmBtnLabel: { fontSize: 16, fontWeight: '700', paddingVertical: 4 },
  cancelBtn: { paddingVertical: 10, alignItems: 'center' },
  cancelText: { fontWeight: '600' },
});