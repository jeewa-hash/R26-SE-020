import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const ADMIN_API_URL = `http://${IP_ADDRESS}:5001`;

export default function SubmitInquiryScreen({ navigation, route }) {
  const [missedServices, setMissedServices] = useState(route.params?.missedServices || []);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reason, setReason] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [penaltyInfo, setPenaltyInfo] = useState({ score: 0, ratio: '0/3', status: 'Not Required' });
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'RESUBMITTED' | 'PENDING' | 'REJECTED'

  useEffect(() => {
    loadMissedServices();
    const interval = setInterval(loadMissedServices, 2500);
    return () => clearInterval(interval);
  }, []);

  const loadMissedServices = async () => {
    try {
      const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';

      const response = await fetch(`${ADMIN_API_URL}/api/inquiries/missed-bookings/${userId}`);
      const data = await response.json();
      if (response.ok && data.missedBookings) {
        setMissedServices(data.missedBookings);
        setPenaltyInfo({
          score: data.penaltyScore || data.missedBookings.length,
          ratio: data.penaltyRatio || `${data.missedBookings.length}/3`,
          status: data.inquiryStatus || (data.missedBookings.length >= 3 ? 'Required' : 'Optional'),
        });
      }
    } catch (err) {
      console.log('Error fetching missed services:', err);
    }
  };

  const countAll = missedServices.length;
  const countResubmitted = missedServices.filter(
    (s) => s.inquiryStatus === 'RESUBMITTED' || s.inquiryStatus === 'RESUBMITED'
  ).length;
  const countPending = missedServices.filter((s) => s.inquiryStatus === 'PENDING').length;
  const countRejected = missedServices.filter((s) => s.inquiryStatus === 'REJECTED').length;

  const FILTER_TABS = [
    { id: 'ALL', label: 'All', count: countAll, icon: 'layers-outline' },
    { id: 'RESUBMITTED', label: 'Re-submitted', count: countResubmitted, color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', icon: 'refresh-circle-outline' },
    { id: 'PENDING', label: 'Pending', count: countPending, color: '#b45309', bg: '#fefce8', border: '#fef08a', icon: 'hourglass-outline' },
    { id: 'REJECTED', label: 'Rejected', count: countRejected, color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: 'alert-circle-outline' },
  ];

  const filteredServices = missedServices.filter((service) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'RESUBMITTED') {
      return service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED';
    }
    if (statusFilter === 'PENDING') {
      return service.inquiryStatus === 'PENDING';
    }
    if (statusFilter === 'REJECTED') {
      return service.inquiryStatus === 'REJECTED';
    }
    return true;
  });

  const handleSelectBooking = (booking) => {
    if (
      booking.inquiryStatus === 'PENDING' ||
      booking.inquiryStatus === 'RESUBMITTED' ||
      booking.inquiryStatus === 'RESUBMITED'
    ) {
      Alert.alert(
        'Inquiry Under Review',
        'An inquiry for this service is currently pending Admin review. (Estimated: 1-3 working days).'
      );
      return;
    }
    if (booking.inquiryStatus === 'APPROVED') {
      Alert.alert('Approved', 'This missed service has already been reviewed and approved by the Admin.');
      return;
    }

    setSelectedBooking(booking);
    setReason('');
    setImage(null);
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

  const handleSubmitIndividualInquiry = async () => {
    if (!selectedBooking) {
      Alert.alert('Select Booking', 'Please select a missed service to submit an inquiry for.');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Missing Reason', 'Please provide a valid explanation for missing this appointment.');
      return;
    }

    setLoading(true);
    try {
      const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';
      const isResubmission = selectedBooking.inquiryStatus === 'REJECTED';

      const formData = new FormData();
      formData.append('providerId', userId);
      formData.append('bookingId', selectedBooking.bookingId);
      formData.append('bookingDetails', JSON.stringify(selectedBooking));
      formData.append('reason', reason.trim());
      formData.append('isResubmission', isResubmission ? 'true' : 'false');

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
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        Alert.alert(
          isResubmission ? 'Inquiry Re-submitted' : 'Inquiry Submitted',
          isResubmission
            ? `Your inquiry has been re-submitted with status ReSubmited and is pending Admin review.`
            : `Your inquiry for the booking on ${selectedBooking.date} has been submitted for Admin review. (Processing: 1-3 working days).`,
          [{ text: 'OK' }]
        );
        setSelectedBooking(null);
        setReason('');
        setImage(null);
        await loadMissedServices();
      } else {
        Alert.alert('Notice', data.message || 'Failed to submit inquiry. Please try again.');
      }
    } catch (error) {
      console.error('Individual inquiry submission error:', error);
      Alert.alert('Error', 'Failed to connect to inquiry service. Please check network connection.');
    } finally {
      setLoading(false);
    }
  };

  const getInquiryBadgeStyle = (status) => {
    switch (status) {
      case 'APPROVED':
        return { bg: '#d1fae5', text: '#065f46', label: 'APPROVED' };
      case 'RESUBMITTED':
      case 'RESUBMITED':
        return { bg: '#ede9fe', text: '#7c3aed', label: 'RE-SUBMITTED (PENDING)' };
      case 'PENDING':
        return { bg: '#fef3c7', text: '#92400e', label: 'PENDING REVIEW' };
      case 'REJECTED':
        return { bg: '#fee2e2', text: '#991b1b', label: 'REJECTED (RE-SUBMIT)' };
      default:
        return { bg: '#f3f4f6', text: '#4b5563', label: 'NOT SUBMITTED' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header Bar with Penalty Score */}
        <View style={styles.topScoreBanner}>
          <View>
            <Text style={styles.topScoreLabel}>ACTIVE PENALTY SCORE</Text>
            <Text style={styles.topScoreValue}>{penaltyInfo.ratio}</Text>
          </View>
          <View
            style={[
              styles.inquiryRequiredBadge,
              penaltyInfo.score >= 3 ? styles.badgeDanger : penaltyInfo.score === 2 ? styles.badgeWarning : styles.badgeNormal,
            ]}
          >
            <Text
              style={[
                styles.inquiryRequiredBadgeText,
                penaltyInfo.score >= 3 ? styles.badgeTextDanger : penaltyInfo.score === 2 ? styles.badgeTextWarning : styles.badgeTextNormal,
              ]}
            >
              INQUIRY: {penaltyInfo.status.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Section Notice */}
        <View style={styles.instructionCard}>
          <Ionicons name="information-circle" size={20} color="#4f46e5" />
          <Text style={styles.instructionText}>
            Select any missed or cancelled service below to submit or re-submit an explanation and proof to the Admin.
          </Text>
        </View>

        {/* Missed Services List */}
        <View style={styles.sectionHeader}>
          <MaterialIcons name="event-busy" size={20} color="#4b5563" />
          <Text style={styles.sectionTitle}>MISSED & CANCELLED SERVICES ({missedServices.length})</Text>
        </View>

        {/* Filter Pills Bar */}
        <View style={styles.filterBarContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = statusFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[
                    styles.filterTabPill,
                    isActive &&
                      (tab.color
                        ? { backgroundColor: tab.bg, borderColor: tab.border, borderWidth: 1.5 }
                        : styles.filterTabPillActiveDefault),
                  ]}
                  onPress={() => setStatusFilter(tab.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={tab.icon}
                    size={14}
                    color={isActive ? (tab.color || '#ffffff') : '#6b7280'}
                  />
                  <Text
                    style={[
                      styles.filterTabLabel,
                      isActive &&
                        (tab.color ? { color: tab.color, fontWeight: '700' } : styles.filterTabLabelActiveDefault),
                    ]}
                  >
                    {tab.label}
                  </Text>
                  <View
                    style={[
                      styles.filterCountBadge,
                      isActive &&
                        (tab.color ? { backgroundColor: tab.color } : styles.filterCountBadgeActiveDefault),
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterCountBadgeText,
                        isActive &&
                          (tab.color ? { color: '#ffffff' } : styles.filterCountBadgeTextActiveDefault),
                      ]}
                    >
                      {tab.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.cardsList}>
          {filteredServices.length > 0 ? (
            filteredServices.map((service, idx) => {
              const badge = getInquiryBadgeStyle(service.inquiryStatus);
              const isSelected = selectedBooking?.bookingId === service.bookingId;
              const isRejected = service.inquiryStatus === 'REJECTED';

              return (
                <View
                  key={service.bookingId || idx}
                  style={[
                    styles.bookingCard,
                    isSelected && styles.selectedBookingCard,
                    service.inquiryStatus === 'PENDING' && styles.pendingBookingCard,
                    isRejected && styles.rejectedBookingCard,
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.dateRow}>
                      <MaterialIcons name="calendar-today" size={16} color="#4f46e5" />
                      <Text style={styles.cardDate}>{service.date}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                    </View>
                  </View>

                  <View style={styles.cardInfoRow}>
                    <Ionicons name="time-outline" size={14} color="#6b7280" />
                    <Text style={styles.cardTimeText}>{service.time}</Text>
                  </View>

                  <View style={styles.cardInfoRow}>
                    <Ionicons name="location-outline" size={14} color="#6b7280" />
                    <Text style={styles.cardLocationText}>{service.location}</Text>
                  </View>

                  {service.reason ? (
                    <View style={styles.reasonTag}>
                      <Text style={styles.reasonTagText}>⚠️ Reason: {service.reason}</Text>
                    </View>
                  ) : null}

                  {/* Rejected Re-submission hint */}
                  {isRejected && service.inquiryReason ? (
                    <View style={styles.rejectionNoticeBox}>
                      <Ionicons name="alert-circle" size={16} color="#dc2626" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rejectionNoticeTitle}>Previous Inquiry Rejected</Text>
                        <Text style={styles.rejectionNoticeSub}>
                          Admin note: "{service.inquiryReason}". You can tap below to re-submit with new proof.
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Pending Notice if already submitted or re-submitted */}
                  {service.inquiryStatus === 'PENDING' || service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED' ? (
                    <View style={[styles.pendingNoticeBox, (service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED') && { backgroundColor: '#f5f3ff', borderColor: '#ddd6fe' }]}>
                      <Ionicons 
                        name="hourglass-outline" 
                        size={16} 
                        color={service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED' ? '#7c3aed' : '#b45309'} 
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.pendingNoticeTitle, (service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED') && { color: '#7c3aed' }]}>
                          {service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED' ? 'Re-submitted Inquiry (Under Review)' : 'Inquiry Under Review (Pending)'}
                        </Text>
                        <Text style={[styles.pendingNoticeSub, (service.inquiryStatus === 'RESUBMITTED' || service.inquiryStatus === 'RESUBMITED') && { color: '#6d28d9' }]}>
                          Admin review usually takes 1 - 3 working days.
                        </Text>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.actionCardBtn,
                        isSelected && styles.actionCardBtnSelected,
                        isRejected && styles.actionCardBtnRejected,
                      ]}
                      onPress={() => handleSelectBooking(service)}
                    >
                      <MaterialIcons
                        name={isSelected ? 'check-circle' : isRejected ? 'replay' : 'create'}
                        size={16}
                        color={isSelected ? '#fff' : isRejected ? '#dc2626' : '#4f46e5'}
                      />
                      <Text
                        style={[
                          styles.actionCardBtnText,
                          isSelected && styles.actionCardBtnTextSelected,
                          isRejected && !isSelected && styles.actionCardBtnTextRejected,
                        ]}
                      >
                        {isSelected
                          ? 'Selected for Submission'
                          : isRejected
                          ? 'Re-submit Inquiry (New Proof)'
                          : 'Select to submit Inquiry'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="filter-list-off" size={38} color="#94a3b8" />
              <Text style={styles.emptyStateTitle}>
                {statusFilter === 'ALL' ? 'All Clear!' : `No ${statusFilter.toLowerCase()} inquiries`}
              </Text>
              <Text style={styles.emptyStateSubtitle}>
                {statusFilter === 'ALL'
                  ? 'No unaddressed missed or cancelled services requiring inquiry.'
                  : `There are currently no bookings with status "${statusFilter}".`}
              </Text>
            </View>
          )}
        </View>

        {/* Selected Booking Inquiry Form */}
        {selectedBooking ? (
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <MaterialIcons name="rate-review" size={22} color="#4f46e5" />
              <View style={{ flex: 1 }}>
                <Text style={styles.formHeaderTitle}>
                  {selectedBooking.inquiryStatus === 'REJECTED' ? 'Re-submit Inquiry' : 'Submit Inquiry for Service'}
                </Text>
                <Text style={styles.formHeaderSub}>
                  {selectedBooking.date} • {selectedBooking.time}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedBooking(null)}>
                <Ionicons name="close-circle" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {selectedBooking.inquiryStatus === 'REJECTED' && (
              <View style={styles.resubmitWarningBox}>
                <Ionicons name="information-circle" size={18} color="#991b1b" />
                <Text style={styles.resubmitWarningText}>
                  Please provide a more detailed explanation and attach clear photos/documents to support your re-submission.
                </Text>
              </View>
            )}

            <Text style={styles.inputLabel}>
              {selectedBooking.inquiryStatus === 'REJECTED'
                ? 'UPDATED EXPLANATION (DETAILED)'
                : 'EXPLAIN REASON FOR CANCELLATION / MISSED SERVICE'}
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Provide a detailed explanation (e.g. transport breakdown, sudden medical emergency)..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>UPLOAD EVIDENCE / ATTACHMENT (OPTIONAL)</Text>
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
                    <MaterialIcons name="add-a-photo" size={24} color="#4f46e5" />
                  </View>
                  <Text style={styles.uploadText}>Attach Proof / Photo</Text>
                  <Text style={styles.uploadSubtext}>Medical slip, garage bill, or photo evidence</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitButton, loading && styles.disabledButton]}
              onPress={handleSubmitIndividualInquiry}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitText}>Submit Inquiry for this Booking</Text>
                  <MaterialIcons name="send" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={{ height: 50 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  container: { flex: 1, padding: 16 },
  topScoreBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  topScoreLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 },
  topScoreValue: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginTop: 2 },
  inquiryRequiredBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  inquiryRequiredBadgeText: { fontSize: 11, fontWeight: '800' },
  badgeDanger: { backgroundColor: '#fee2e2' },
  badgeTextDanger: { color: '#dc2626' },
  badgeWarning: { backgroundColor: '#fef3c7' },
  badgeTextWarning: { color: '#d97706' },
  badgeNormal: { backgroundColor: '#f1f5f9' },
  badgeTextNormal: { color: '#475569' },
  instructionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#e0e7ff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionText: { flex: 1, fontSize: 12, color: '#3730a3', lineHeight: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginLeft: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#475569', letterSpacing: 0.5 },
  cardsList: { gap: 12, marginBottom: 20 },
  bookingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  selectedBookingCard: { borderColor: '#4f46e5', backgroundColor: '#faf5ff' },
  pendingBookingCard: { borderColor: '#fde68a', backgroundColor: '#fffdf5' },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardDate: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6 },
  statusBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  cardTimeText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  cardLocationText: { fontSize: 13, color: '#64748b' },
  reasonTag: {
    backgroundColor: '#fef2f2',
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  reasonTagText: { fontSize: 11, color: '#b91c1c', fontWeight: '600' },
  actionCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  actionCardBtnSelected: { backgroundColor: '#4f46e5', borderColor: '#4f46e5' },
  actionCardBtnText: { fontSize: 12, fontWeight: '700', color: '#4f46e5' },
  actionCardBtnTextSelected: { color: '#ffffff' },
  pendingNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  pendingNoticeTitle: { fontSize: 12, fontWeight: '700', color: '#92400e' },
  pendingNoticeSub: { fontSize: 11, color: '#b45309', marginTop: 1 },
  emptyState: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  emptyStateSubtitle: { fontSize: 12, color: '#64748b', textAlign: 'center', marginTop: 4 },
  formContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#c7d2fe',
    elevation: 3,
    shadowColor: '#4f46e5',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  formHeaderTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  formHeaderSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  inputLabel: { fontSize: 11, fontWeight: '800', color: '#475569', marginBottom: 6, letterSpacing: 0.5 },
  textArea: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    padding: 12,
    fontSize: 14,
    color: '#0f172a',
    minHeight: 90,
    marginBottom: 16,
  },
  uploadCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    overflow: 'hidden',
    marginBottom: 20,
  },
  uploadPlaceholder: { padding: 20, alignItems: 'center' },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  uploadSubtext: { fontSize: 11, color: '#94a3b8', textAlign: 'center', marginTop: 2 },
  previewContainer: { width: '100%', height: 160, position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeBadge: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    backgroundColor: '#4f46e5',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 8,
    elevation: 3,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  disabledButton: { backgroundColor: '#a5b4fc' },
  submitText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  rejectedBookingCard: {
    borderColor: '#fecaca',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    backgroundColor: '#fffbfb',
  },
  rejectionNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  rejectionNoticeTitle: { fontSize: 12, fontWeight: '800', color: '#991b1b' },
  rejectionNoticeSub: { fontSize: 11, color: '#b91c1c', marginTop: 2, lineHeight: 15 },
  actionCardBtnRejected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  actionCardBtnTextRejected: {
    color: '#dc2626',
    fontWeight: '800',
  },
  resubmitWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff1f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  resubmitWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#9f1239',
    lineHeight: 16,
    fontWeight: '600',
  },
  filterBarContainer: {
    marginBottom: 14,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  filterTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  filterTabPillActiveDefault: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  filterTabLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabLabelActiveDefault: {
    color: '#ffffff',
    fontWeight: '700',
  },
  filterCountBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
  },
  filterCountBadgeActiveDefault: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  filterCountBadgeTextActiveDefault: {
    color: '#ffffff',
  },
});
