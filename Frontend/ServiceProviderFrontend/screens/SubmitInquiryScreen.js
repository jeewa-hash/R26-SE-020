import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Image, ScrollView, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';
import axios from 'axios';

const API_URL = `http://${IP_ADDRESS}:4003`;

export default function SubmitInquiryScreen({ navigation }) {
  const [reason, setReason] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Dummy data for missed services (based on user image)
  const missedServices = [
    { id: '1', date: '2024-04-28', time: '08:00 AM', location: 'Gampaha' },
    { id: '2', date: '2024-04-29', time: '11:00 AM', location: 'Kiribathgoda' },
    { id: '3', date: '2024-04-30', time: '04:00 PM', location: 'Kadawatha' },
  ];

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
      Alert.alert('Error', 'Please provide a reason for the missed services.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      
      // In a real scenario, you'd use FormData to upload the image
      // For now, we'll simulate the submission
      setTimeout(() => {
        Alert.alert('Success', 'Your inquiry has been submitted for review.', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        setLoading(false);
      }, 1500);

    } catch (error) {
      console.error('Submission error:', error);
      Alert.alert('Error', 'Failed to submit inquiry. Please try again.');
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
            {missedServices.map((service) => (
              <View key={service.id} style={styles.serviceRow}>
                <View style={styles.serviceDot} />
                <View style={styles.serviceTextContainer}>
                  <Text style={styles.serviceDate}>{service.date}</Text>
                  <Text style={styles.serviceInfo}>{service.time} - {service.location}</Text>
                </View>
              </View>
            ))}
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
              placeholder="E.g., Vehicle breakdown during travel to the location."
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
                <Text style={styles.uploadSubtext}>JPG, PNG up to 5MB</Text>
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
  uploadSubtext: { fontSize: 12, color: '#9ca3af' },
  previewContainer: { width: '100%', height: 200, position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeBadge: { position: 'absolute', right: 12, bottom: 12, backgroundColor: '#6366f1', width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  submitButton: { backgroundColor: '#6366f1', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, borderRadius: 16, gap: 10, elevation: 4, shadowColor: '#6366f1', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  disabledButton: { backgroundColor: '#a5b4fc' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
