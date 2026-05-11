import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles, COLORS } from './coordination/styles';
import { createProviderRequest } from '../services/providerRequestApi';
import { DEMO_PROVIDER_ID } from '../config';
import { getUserIdFromJwt } from '../utils/jwtHelpers';

const isoDateString = (date) => date.toISOString().slice(0, 10);

export default function RequestServiceScreen({ route, navigation }) {
  const { post } = route.params || {};
  const [requestedDate, setRequestedDate] = useState(isoDateString(new Date()));
  const [requestedStartTime, setRequestedStartTime] = useState('09:00');
  const [estimatedDurationHours, setEstimatedDurationHours] = useState('2');
  const [providerId, setProviderId] = useState(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    const loadProviderId = async () => {
      let id = await AsyncStorage.getItem('userId');
      if (!id) {
        const token = await AsyncStorage.getItem('userToken');
        id = getUserIdFromJwt(token);
        if (id) {
          await AsyncStorage.setItem('userId', String(id));
        }
      }
      setProviderId(id);
    };

    loadProviderId();
  }, []);

  if (!post) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Text style={styles.sectionTitle}>No post selected</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSubmitRequest = async () => {
    if (!requestedDate || !requestedStartTime) {
      Alert.alert('Validation', 'Please enter a requested date and start time.');
      return;
    }

    setLoading(true);

    try {
      const payload = {
        postId: post.id || post._id,
        seekerId: post.seekerId,
        providerId: providerId || DEMO_PROVIDER_ID,
        requestedDate,
        requestedStartTime,
        estimatedDurationHours: Number(estimatedDurationHours) || 2,
        serviceCategory: post.category || 'General',
        serviceSubcategory: post.category || 'General',
        taskName: post.title,
        complexityLevel: 'Medium',
        propertySize: 'Medium',
        urgency: post.urgency || 'medium',
        location: post.location || {},
      };

      const result = await createProviderRequest(payload);
      Alert.alert('Request Sent', result.message || 'Provider request created successfully.');
      navigation.goBack();
    } catch (error) {
      console.log(error?.response?.data || error.message);
      Alert.alert('Request Failed', error?.response?.data?.message || 'Could not create the provider request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <View>
              <Text style={styles.headerTitle}>Request This Job</Text>
              <Text style={styles.headerSubtitle}>Start from the seeker post and submit a service request.</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Post Summary</Text>
          <Text style={{ fontSize: 18, fontWeight: '900', color: COLORS.text }}>{post.title}</Text>
          <Text style={[styles.mutedText, { marginTop: 8 }]}>{post.description}</Text>
          <Text style={[styles.mutedText, { marginTop: 10 }]}>Category: {post.category || 'General'}</Text>
          <Text style={[styles.mutedText, { marginTop: 4 }]}>Urgency: {post.urgency || 'medium'}</Text>
          <Text style={[styles.mutedText, { marginTop: 4 }]}>Location: {post.location?.address || post.location?.district || 'Not specified'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Schedule Request</Text>

          <Text style={styles.infoLabel}>Requested Date</Text>
          <TextInput
            style={styles.textInput}
            value={requestedDate}
            onChangeText={setRequestedDate}
            placeholder="YYYY-MM-DD"
            keyboardType={Platform.OS === 'ios' ? 'default' : 'numeric'}
          />

          <Text style={[styles.infoLabel, { marginTop: 14 }]}>Requested Start Time</Text>
          <TextInput
            style={styles.textInput}
            value={requestedStartTime}
            onChangeText={setRequestedStartTime}
            placeholder="HH:MM"
          />

          <Text style={[styles.infoLabel, { marginTop: 14 }]}>Estimated Duration (hours)</Text>
          <TextInput
            style={styles.textInput}
            value={estimatedDurationHours}
            onChangeText={setEstimatedDurationHours}
            placeholder="2"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmitRequest}
          disabled={loading}
        >
          <Ionicons name="send-outline" size={18} color="#fff" />
          <Text style={styles.primaryButtonText}>{loading ? 'Submitting...' : 'Send Provider Request'}</Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
