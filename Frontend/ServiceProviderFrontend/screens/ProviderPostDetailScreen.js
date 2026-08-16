import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { postsAPI, providerRequestsAPI } from '../services/api';
import { getStoredUserId } from '../utils/jwtHelpers';

export default function ProviderPostDetailScreen({ navigation, route }) {
  const { post } = route.params;
  const [loading, setLoading] = useState(false);
  const [providerId, setProviderId] = useState(null);
  const [requestData, setRequestData] = useState({
    requestedDate: new Date(),
    requestedStartTime: new Date(),
    estimatedDurationHours: '',
    message: '',
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const id = await getStoredUserId();
      if (!id) {
        Alert.alert('Error', 'Provider ID not found. Please login again.');
        navigation.navigate('Login');
        return;
      }
      setProviderId(id);
    } catch (error) {
      console.error('Error initializing screen:', error);
      Alert.alert('Error', 'Failed to load screen');
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setRequestData(prev => ({ ...prev, requestedDate: selectedDate }));
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      setRequestData(prev => ({ ...prev, requestedStartTime: selectedTime }));
    }
  };

  const handleSubmitRequest = async () => {
    if (!requestData.estimatedDurationHours || !requestData.message) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (!providerId) {
      Alert.alert('Error', 'Provider ID not found');
      return;
    }

    setLoading(true);
    try {
      const requestPayload = {
        postId: post.id,
        providerId: providerId,
        seekerId: post.seekerId,
        serviceCategory: post.category,
        requestedDate: requestData.requestedDate.toISOString().split('T')[0],
        requestedStartTime: requestData.requestedStartTime.toTimeString().split(' ')[0],
        estimatedDurationHours: parseFloat(requestData.estimatedDurationHours),
        message: requestData.message,
      };

      await providerRequestsAPI.createRequest(requestPayload);

      Alert.alert(
        'Success',
        'Your request has been submitted! The client will review it and may accept to create a booking.',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
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

  const getUrgencyStyle = (urgency) => {
    switch(urgency?.toLowerCase()) {
      case 'urgent':
        return { bg: '#FEE2E2', color: '#DC2626', text: '🔴 URGENT' };
      case 'high':
        return { bg: '#FEF3C7', color: '#F59E0B', text: '🟡 HIGH' };
      case 'normal':
        return { bg: '#D1FAE5', color: '#10B981', text: '🟢 NORMAL' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: '⚪ NORMAL' };
    }
  };

  const urgencyStyle = getUrgencyStyle(post.urgency);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Request</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        {/* Post Details */}
        <View style={styles.postCard}>
          <View style={styles.postHeader}>
            <Text style={styles.postTitle}>{post.title}</Text>
            <View style={[styles.urgencyBadge, { backgroundColor: urgencyStyle.bg }]}>
              <Text style={[styles.urgencyText, { color: urgencyStyle.color }]}>
                {urgencyStyle.text}
              </Text>
            </View>
          </View>

          <Text style={styles.postDescription}>{post.description}</Text>

          <View style={styles.postMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{post.category}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{post.location?.address || 'Location not specified'}</Text>
            </View>
          </View>
        </View>

        {/* Request Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Submit Your Proposal</Text>

          {/* Date Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Preferred Date</Text>
            <TouchableOpacity
              style={styles.datePicker}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6B7280" />
              <Text style={styles.dateText}>
                {formatDate(requestData.requestedDate)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Time Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.datePicker}
              onPress={() => setShowTimePicker(true)}
            >
              <Ionicons name="time-outline" size={20} color="#6B7280" />
              <Text style={styles.dateText}>
                {formatTime(requestData.requestedStartTime)}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Estimated Duration (hours)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 2.5"
              keyboardType="numeric"
              value={requestData.estimatedDurationHours}
              onChangeText={(text) => setRequestData(prev => ({ ...prev, estimatedDurationHours: text }))}
            />
          </View>

          {/* Message */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Your Message to Client</Text>
            <TextInput
              style={[styles.textInput, styles.messageInput]}
              placeholder="Describe your service approach, experience, and why you're the right provider..."
              multiline
              numberOfLines={4}
              value={requestData.message}
              onChangeText={(text) => setRequestData(prev => ({ ...prev, message: text }))}
            />
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitRequest}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="send-outline" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={requestData.requestedDate}
          mode="date"
          display="default"
          onChange={onDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={requestData.requestedStartTime}
          mode="time"
          display="default"
          onChange={onTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    flex: 1,
    marginRight: 12,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  postDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  postMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  datePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#F9FAFB',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
    marginLeft: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F9FAFB',
  },
  messageInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginLeft: 8,
  },
});