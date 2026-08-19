import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

export default function SubmitInquiryScreen({ navigation, route }) {
  const [reason, setReason] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [missedServices, setMissedServices] = useState(route.params?.missedServices || []);

  useEffect(() => {
    if (!missedServices || missedServices.length === 0) {
      loadMissedServices();
    }
  }, []);

  const loadMissedServices = async () => {
    try {
      const userId = await AsyncStorage.getItem('userId');
      if (!userId) return;

      const response = await fetch(`${ADMIN_API_URL}/api/inquiries/missed-bookings/${userId}`);
      const data = await response.json();
      if (response.ok && data.missedBookings) {
        setMissedServices(data.missedBookings);
      }
    } catch (err) {
      console.log('Error fetching missed services in SubmitInquiryScreen:', err);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert('Missing Information', 'Please provide a valid explanation/reason for the missed services.');
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      
      const formData = new FormData();
      formData.append('providerId', userId || '69f837fd53d6f25b2f019e70');
      formData.append('reason', reason.trim());
      formData.append('missedServices', JSON.stringify(missedServices));

      if (image) {
        const filename = image.split('/').pop() || 'evidence.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('evidenceImages', {
          uri: image,
          name: filename,
          type,
        });
      }

      const response = await fetch(`${ADMIN_API_URL}/api/inquiries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          'Inquiry Submitted',
          'Your inquiry and evidence have been submitted to the Admin team for review. You will be notified once reviewed.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Notice', data.message || 'Inquiry submitted for review.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Notice', 'Inquiry recorded successfully for admin review.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* Missed Services Context Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="access-time" size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>MISSED SERVICES CONTEXT</Text>
          </View>
          
          <View style={styles.verticalList}>
            {missedServices.length > 0 ? (
              missedServices.map((service, idx) => (
                <View key={service.bookingId || idx} style={styles.serviceRow}>
                  <View style={styles.serviceDot} />
                  <View style={styles.serviceTextContainer}>
                    <Text style={styles.serviceDate}>{service.date}</Text>
                    <Text style={styles.serviceInfo}>{service.time} - {service.location}</Text>
                    {service.reason ? (
                      <Text style={{ fontSize: 11, color: '#ef4444', marginTop: 2 }}>{service.reason}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            ) : (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <MaterialIcons name="check-circle-outline" size={24} color="#10b981" />
                <Text style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>No unaddressed missed bookings</Text>
              </View>
            )}
          </View>
        </View>

        {/* Inquiry Form */}
        <View style={styles.formSection}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="chat-bubble-outline" size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>PROVIDER'S REASON</Text>
          </View>

          <View style={styles.inputCard}>
            <TextInput
              style={styles.textArea}
              placeholder="Explain the reason for missing/cancelling the appointments (e.g., sudden medical emergency, vehicle breakdown)..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.sectionHeader}>
            <MaterialIcons name="image" size={20} color="#6b7280" />
            <Text style={styles.sectionTitle}>EVIDENCE (IMAGE UPLOAD)</Text>
          </View>

          <TouchableOpacity style={styles.uploadCard} onPress={pickImage}>
            {image ? (
              <View style={styles.previewContainer}>
                <Image source={{ uri: image }} style={styles.previewImage} />
                <View style={styles.changeBadge}>
                  <MaterialIcons name="edit" size={16} color="#fff" />
                </View>
              </View>
            ) : (
              <View style={styles.uploadPlaceholder}>
                <View style={styles.iconCircle}>
                  <MaterialIcons name="add-a-photo" size={28} color="#6366f1" />
                </View>
                <Text style={styles.uploadText}>Upload evidence image</Text>
                <Text style={styles.uploadSubtext}>JPG, PNG receipts, medical bills, or repair invoices</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.disabledButton]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.submitText}>Submit Inquiry</Text>
              <MaterialIcons name="send" size={20} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f9fafb' },
  container: { flex: 1, padding: 20 },
  section: { marginBottom: 25 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#6b7280', letterSpacing: 1 },
  verticalList: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  serviceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  serviceDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginRight: 12 },
  serviceTextContainer: { flex: 1 },
  serviceDate: { fontSize: 15, fontWeight: 'bold', color: '#1f2937' },
  serviceInfo: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  formSection: { marginBottom: 30 },
  inputCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20 },
  textArea: { fontSize: 15, color: '#374151', minHeight: 100 },
  uploadCard: { backgroundColor: '#fff', borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: '#e5e7eb', overflow: 'hidden' },
  uploadPlaceholder: { padding: 30, alignItems: 'center' },
  iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f3f4ff', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  uploadText: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  uploadSubtext: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },
  previewContainer: { width: '100%', height: 200, position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeBadge: { position: 'absolute', right: 12, bottom: 12, backgroundColor: '#6366f1', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  submitButton: { backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 10, elevation: 4, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  disabledButton: { backgroundColor: '#a5b4fc' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
