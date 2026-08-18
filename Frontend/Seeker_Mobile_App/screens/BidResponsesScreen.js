import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

export default function BidResponsesScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { bid } = route.params || {};

  const [selectedResponse, setSelectedResponse] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedResponse, setExpandedResponse] = useState(null);

  // Sample responses data
  const [responses, setResponses] = useState([
    {
      id: 1,
      providerName: "John's Plumbing",
      providerImage: "https://randomuser.me/api/portraits/men/1.jpg",
      rating: 4.9,
      reviews: 128,
      experience: "8 years",
      quotedPrice: "$180",
      estimatedDuration: "2-3 hours",
      message: "I can do this job tomorrow morning. I have 8+ years of experience.",
      responseTime: "2 hours ago",
      status: "pending",
      availability: "Tomorrow, 9:00 AM",
      completedJobs: 156,
      verified: true,
    },
    {
      id: 2,
      providerName: "Quick Fix",
      providerImage: "https://randomuser.me/api/portraits/men/2.jpg",
      rating: 4.7,
      reviews: 89,
      experience: "5 years",
      quotedPrice: "$150",
      estimatedDuration: "1-2 hours",
      message: "Available today evening. Best price guarantee.",
      responseTime: "3 hours ago",
      status: "pending",
      availability: "Today, 5:00 PM",
      completedJobs: 89,
      verified: true,
    },
    {
      id: 3,
      providerName: "Elite Services",
      providerImage: "https://randomuser.me/api/portraits/women/3.jpg",
      rating: 5.0,
      reviews: 245,
      experience: "12 years",
      quotedPrice: "$220",
      estimatedDuration: "2 hours",
      message: "Premium quality service with 6 months warranty.",
      responseTime: "5 hours ago",
      status: "pending",
      availability: "Tomorrow, 10:00 AM",
      completedJobs: 320,
      verified: true,
    },
  ]);

  const [acceptedResponse, setAcceptedResponse] = useState(null);

  const handleAcceptResponse = (response) => {
    setSelectedResponse(response);
    setShowAcceptModal(true);
  };

  const confirmAccept = () => {
    setAcceptedResponse(selectedResponse);
    setResponses(responses.map(r => 
      r.id === selectedResponse.id 
        ? { ...r, status: 'accepted' }
        : r.id !== selectedResponse.id ? { ...r, status: 'rejected' } : r
    ));
    setShowAcceptModal(false);
    Alert.alert(
      "🎉 Bid Accepted!",
      `${selectedResponse.providerName} will contact you shortly.`,
      [{ text: "OK", onPress: () => navigation.goBack() }]
    );
  };

  const handleRejectResponse = (response) => {
    setSelectedResponse(response);
    setShowRejectModal(true);
  };

  const confirmReject = () => {
    setResponses(responses.map(r => 
      r.id === selectedResponse.id 
        ? { ...r, status: 'rejected' }
        : r
    ));
    setShowRejectModal(false);
    setRejectReason('');
    Alert.alert("", `Bid from ${selectedResponse.providerName} declined`);
  };

  const handleChatWithProvider = (response) => {
    navigation.navigate("ChatScreen", { 
      providerName: response.providerName,
      providerId: response.id,
    });
  };

  const toggleExpand = (id) => {
    setExpandedResponse(expandedResponse === id ? null : id);
  };

  const renderStars = (rating) => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={14}
          color="#FBBF24"
        />
      );
    }
    return stars;
  };

  const activeResponses = responses.filter(r => r.status === 'pending');
  const acceptedResponsesList = responses.filter(r => r.status === 'accepted');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bid Responses</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Simple Bid Info */}
      <View style={styles.bidInfoCard}>
        <Text style={styles.bidInfoTitle} numberOfLines={1}>
          {bid?.title || bid?.service || "Service Request"}
        </Text>
        <View style={styles.bidInfoRow}>
          <View style={styles.bidInfoTag}>
            <Ionicons name="cash-outline" size={14} color="#667eea" />
            <Text style={styles.bidInfoTagText}>{bid?.budget || "Budget not set"}</Text>
          </View>
          <View style={styles.bidInfoTag}>
            <Ionicons name="location-outline" size={14} color="#667eea" />
            <Text style={styles.bidInfoTagText}>{bid?.location || "Anywhere"}</Text>
          </View>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{responses.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#F59E0B' }]}>{activeResponses.length}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statNumber, { color: '#10B981' }]}>{acceptedResponsesList.length}</Text>
          <Text style={styles.statLabel}>Accepted</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Active Responses */}
        {activeResponses.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>📋 Available Bids ({activeResponses.length})</Text>
            {activeResponses.map((response) => (
              <View key={response.id} style={styles.responseCard}>
                {/* Provider Header */}
                <View style={styles.providerRow}>
                  <Image source={{ uri: response.providerImage }} style={styles.providerAvatar} />
                  <View style={styles.providerDetails}>
                    <View style={styles.providerNameRow}>
                      <Text style={styles.providerName}>{response.providerName}</Text>
                      {response.verified && (
                        <View style={styles.verifiedBadge}>
                          <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                          <Text style={styles.verifiedText}>Verified</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.ratingRow}>
                      {renderStars(response.rating)}
                      <Text style={styles.ratingValue}>{response.rating}</Text>
                      <Text style={styles.reviewCount}>({response.reviews} reviews)</Text>
                    </View>
                  </View>
                  <View style={styles.priceTag}>
                    <Text style={styles.priceLabel}>Quote</Text>
                    <Text style={styles.priceValue}>{response.quotedPrice}</Text>
                  </View>
                </View>

                {/* Quote Details */}
                <View style={styles.quoteRow}>
                  <View style={styles.quoteChip}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.quoteChipText}>{response.estimatedDuration}</Text>
                  </View>
                  <View style={styles.quoteChip}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.quoteChipText}>{response.availability}</Text>
                  </View>
                  <View style={styles.quoteChip}>
                    <Ionicons name="briefcase-outline" size={14} color="#6B7280" />
                    <Text style={styles.quoteChipText}>{response.completedJobs}+ jobs</Text>
                  </View>
                </View>

                {/* Message - Expandable */}
                <TouchableOpacity onPress={() => toggleExpand(response.id)} activeOpacity={0.7}>
                  <View style={styles.messageContainer}>
                    <Ionicons name="chatbubble-outline" size={16} color="#667eea" />
                    <Text style={styles.messageText} numberOfLines={expandedResponse === response.id ? undefined : 2}>
                      {response.message}
                    </Text>
                    <Ionicons 
                      name={expandedResponse === response.id ? "chevron-up" : "chevron-down"} 
                      size={16} 
                      color="#9CA3AF" 
                    />
                  </View>
                </TouchableOpacity>

                <Text style={styles.responseTimeText}>🕐 Responded {response.responseTime}</Text>

                {/* Action Buttons */}
                <View style={styles.actionRow}>
                  <TouchableOpacity 
                    style={styles.chatAction}
                    onPress={() => handleChatWithProvider(response)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#667eea" />
                    <Text style={styles.chatActionText}>Chat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.declineAction}
                    onPress={() => handleRejectResponse(response)}
                  >
                    <Text style={styles.declineActionText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.acceptAction}
                    onPress={() => handleAcceptResponse(response)}
                  >
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.acceptGradient}
                    >
                      <Text style={styles.acceptActionText}>Accept</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Accepted Responses */}
        {acceptedResponsesList.length > 0 && (
          <View style={styles.acceptedSection}>
            <Text style={styles.sectionTitle}>✅ Accepted</Text>
            {acceptedResponsesList.map((response) => (
              <View key={response.id} style={styles.acceptedCard}>
                <Image source={{ uri: response.providerImage }} style={styles.acceptedAvatar} />
                <View style={styles.acceptedInfo}>
                  <Text style={styles.acceptedName}>{response.providerName}</Text>
                  <Text style={styles.acceptedPrice}>Accepted at {response.quotedPrice}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.contactAction}
                  onPress={() => handleChatWithProvider(response)}
                >
                  <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {activeResponses.length === 0 && acceptedResponsesList.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={80} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No responses yet</Text>
            <Text style={styles.emptyText}>Providers will bid on your request soon</Text>
          </View>
        )}
      </ScrollView>

      {/* Accept Modal */}
      <Modal visible={showAcceptModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalSuccessIcon}>
              <Ionicons name="checkmark-circle" size={50} color="#10B981" />
            </View>
            <Text style={styles.modalTitle}>Accept this bid?</Text>
            <Text style={styles.modalDesc}>
              You're about to accept {selectedResponse?.quotedPrice} from {selectedResponse?.providerName}
            </Text>
            <View style={styles.modalWarningBox}>
              <Ionicons name="information-circle" size={18} color="#F59E0B" />
              <Text style={styles.modalWarningText}>Other bids will be automatically declined</Text>
            </View>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAcceptModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={confirmAccept}>
                <Text style={styles.modalConfirmText}>Yes, Accept</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Modal */}
      <Modal visible={showRejectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalDeclineIcon}>
              <Ionicons name="close-circle" size={50} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>Decline this bid?</Text>
            <Text style={styles.modalDesc}>Decline {selectedResponse?.providerName}'s bid?</Text>
            <TextInput
              style={styles.reasonInput}
              placeholder="Optional: Tell us why (helps providers improve)"
              placeholderTextColor="#9CA3AF"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowRejectModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalDecline} onPress={confirmReject}>
                <Text style={styles.modalDeclineText}>Yes, Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  bidInfoCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  bidInfoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  bidInfoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bidInfoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  bidInfoTagText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  responseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  providerRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  providerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  verifiedText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#10B981',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1F2937',
    marginLeft: 2,
  },
  reviewCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  priceTag: {
    alignItems: 'flex-end',
  },
  priceLabel: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#667eea',
  },
  quoteRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  quoteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  quoteChipText: {
    fontSize: 11,
    color: '#6B7280',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
  },
  responseTimeText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 14,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  chatAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  chatActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  declineAction: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  declineActionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  acceptAction: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  acceptGradient: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  acceptActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  acceptedSection: {
    marginTop: 8,
    marginBottom: 24,
  },
  acceptedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  acceptedAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  acceptedInfo: {
    flex: 1,
  },
  acceptedName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  acceptedPrice: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  contactAction: {
    backgroundColor: '#667eea',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '85%',
    alignItems: 'center',
  },
  modalSuccessIcon: {
    marginBottom: 16,
  },
  modalDeclineIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  modalWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  modalConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#10B981',
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  modalDecline: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#EF4444',
    alignItems: 'center',
  },
  modalDeclineText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  reasonInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#1F2937',
    minHeight: 80,
    textAlignVertical: 'top',
    width: '100%',
    marginBottom: 20,
  },
});