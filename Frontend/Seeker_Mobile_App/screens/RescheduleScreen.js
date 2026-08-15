import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';

export default function RescheduleScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const booking = route.params?.booking || { title: "Service Booking", provider: "Service Provider" };
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) setTime(selectedTime);
  };

  const handleReschedule = () => {
    Alert.alert(
      "Reschedule Request",
      `Would you like to reschedule ${booking.title} to ${date.toLocaleDateString()} at ${time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: () => {
          Alert.alert("Success", "Reschedule request sent to provider");
          navigation.goBack();
        }}
      ]
    );
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (time) => {
    return time.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reschedule Booking</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Booking Info Card */}
        <LinearGradient
          colors={isDarkMode ? ['#16213e', '#1a1a2e'] : ['#ffffff', '#f8f9fa']}
          style={styles.bookingCard}
        >
          <View style={styles.bookingIcon}>
            <Ionicons name="calendar-outline" size={24} color="#667eea" />
          </View>
          <View style={styles.bookingInfo}>
            <Text style={[styles.bookingTitle, isDarkMode && styles.textDark]}>{booking.title}</Text>
            <View style={styles.providerRow}>
              <Ionicons name="person-outline" size={12} color="#6B7280" />
              <Text style={[styles.bookingProvider, isDarkMode && styles.textMutedDark]}>{booking.provider}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Current Schedule Info */}
        <View style={[styles.currentSchedule, isDarkMode && styles.currentScheduleDark]}>
          <Text style={[styles.currentLabel, isDarkMode && styles.textMutedDark]}>Current Schedule</Text>
          <View style={styles.currentInfo}>
            <View style={styles.currentInfoItem}>
              <Ionicons name="calendar-outline" size={16} color="#667eea" />
              <Text style={[styles.currentInfoText, isDarkMode && styles.textDark]}>
                {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            </View>
            <View style={styles.currentInfoItem}>
              <Ionicons name="time-outline" size={16} color="#667eea" />
              <Text style={[styles.currentInfoText, isDarkMode && styles.textDark]}>2:00 PM</Text>
            </View>
          </View>
        </View>

        {/* Date Picker Card */}
        <TouchableOpacity style={[styles.pickerCard, isDarkMode && styles.pickerCardDark]} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <LinearGradient
            colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#ffffff', '#f8f9fa']}
            style={styles.pickerGradient}
          >
            <View style={styles.pickerIconWrapper}>
              <Ionicons name="calendar" size={24} color="#667eea" />
            </View>
            <View style={styles.pickerInfo}>
              <Text style={[styles.pickerLabel, isDarkMode && styles.textMutedDark]}>Select New Date</Text>
              <Text style={[styles.pickerValue, isDarkMode && styles.textDark]}>{formatDate(date)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Time Picker Card */}
        <TouchableOpacity style={[styles.pickerCard, isDarkMode && styles.pickerCardDark]} onPress={() => setShowTimePicker(true)} activeOpacity={0.7}>
          <LinearGradient
            colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#ffffff', '#f8f9fa']}
            style={styles.pickerGradient}
          >
            <View style={styles.pickerIconWrapper}>
              <Ionicons name="time" size={24} color="#667eea" />
            </View>
            <View style={styles.pickerInfo}>
              <Text style={[styles.pickerLabel, isDarkMode && styles.textMutedDark]}>Select New Time</Text>
              <Text style={[styles.pickerValue, isDarkMode && styles.textDark]}>{formatTime(time)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Selected Summary */}
        <View style={[styles.summaryCard, isDarkMode && styles.summaryCardDark]}>
          <Text style={[styles.summaryTitle, isDarkMode && styles.textDark]}>New Schedule</Text>
          <View style={styles.summaryInfo}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="calendar" size={18} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.summaryLabel, isDarkMode && styles.textMutedDark]}>Date</Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.textDark]}>{formatDate(date)}</Text>
              </View>
            </View>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIcon}>
                <Ionicons name="time" size={18} color="#667eea" />
              </View>
              <View>
                <Text style={[styles.summaryLabel, isDarkMode && styles.textMutedDark]}>Time</Text>
                <Text style={[styles.summaryValue, isDarkMode && styles.textDark]}>{formatTime(time)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Note */}
        <View style={[styles.noteCard, isDarkMode && styles.noteCardDark]}>
          <Ionicons name="information-circle" size={20} color="#F59E0B" />
          <Text style={[styles.noteText, isDarkMode && styles.noteTextDark]}>
            The provider will be notified and must confirm the new time. You'll receive a notification once confirmed.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.rescheduleButton} onPress={handleReschedule} activeOpacity={0.9}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.rescheduleGradient}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
            <Text style={styles.rescheduleButtonText}>Request Reschedule</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker 
          value={date} 
          mode="date" 
          display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}
      {showTimePicker && (
        <DateTimePicker 
          value={time} 
          mode="time" 
          display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
          onChange={onTimeChange}
        />
      )}
      
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bookingIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingProvider: {
    fontSize: 13,
    color: '#6B7280',
  },
  currentSchedule: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  currentScheduleDark: {
    backgroundColor: '#16213e',
  },
  currentLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 8,
  },
  currentInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  currentInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentInfoText: {
    fontSize: 13,
    color: '#1F2937',
    fontWeight: '500',
  },
  pickerCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pickerCardDark: {
    backgroundColor: '#16213e',
  },
  pickerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
  },
  pickerIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  pickerInfo: {
    flex: 1,
  },
  pickerLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  pickerValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  summaryCardDark: {
    backgroundColor: '#16213e',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  summaryInfo: {
    gap: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    marginBottom: 24,
  },
  noteCardDark: {
    backgroundColor: '#78350F',
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
  noteTextDark: {
    color: '#FCD34D',
  },
  rescheduleButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  rescheduleGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  rescheduleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});