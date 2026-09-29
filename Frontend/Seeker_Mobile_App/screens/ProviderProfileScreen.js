// screens/ProviderProfileScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG, IP_ADDRESS } from '../config';
import { useAuth } from '../context/AuthContext';
import RequestQuotationModal from './IT22129376/components/RequestQuotationModal';

const { width } = Dimensions.get('window');
const QUOTATION_API_URL = `http://${IP_ADDRESS}:6000/request-quotations`;

export default function ProviderProfileScreen({ route, navigation }) {
  const {
    providerItem,
    finalDecision,
    isRequested: initialIsRequested = false,
    onQuotationRequested,
  } = route.params || {};
  const { user } = useAuth();

  const provider = providerItem?.provider || {};
  const providerId = provider.id || provider._id;
  const portfolio = providerItem?.portfolio || {};
  const match = providerItem?.match || {};

  const [isRequested, setIsRequested] = useState(Boolean(initialIsRequested));
  const [quotationModalVisible, setQuotationModalVisible] = useState(false);
  const [seekerId, setSeekerId] = useState(user?.id || user?._id || null);
  const [restrictionInfo, setRestrictionInfo] = useState({
    isRestricted: false,
    penaltyScore: 0,
    penaltyRatio: '0/3',
  });

  useEffect(() => {
    if (user?.id || user?._id) setSeekerId(user.id || user._id);
    else AsyncStorage.getItem('userId').then(setSeekerId).catch(() => {});
  }, [user]);

  useEffect(() => {
    const fetchProviderStatus = async () => {
      if (!providerId) return;

      try {
        const response = await fetch(
          `http://${IP_ADDRESS}:5001/api/inquiries/check-bookable/${providerId}`
        );
        if (!response.ok) return;

        const data = await response.json();
        const penaltyScore =
          typeof data.penaltyScore === 'number'
            ? data.penaltyScore
            : data.activeMissedBookingsCount || 0;

        setRestrictionInfo({
          isRestricted:
            Boolean(data.isRestricted || data.isBlocked) ||
            penaltyScore >= 3 ||
            provider.isVerified === false,
          penaltyScore,
          penaltyRatio: data.penaltyRatio || `${penaltyScore}/3`,
        });
      } catch (error) {
        console.log('Error checking provider restriction status:', error.message);
      }
    };

    fetchProviderStatus();
  }, [providerId, provider.isVerified]);

  // Check if this provider has already been requested for this seeker & session
  useEffect(() => {
    const checkExistingRequest = async () => {
      if (!providerId) return;

      let seekerId = user?.id;
      if (!seekerId) {
        try {
          seekerId = await AsyncStorage.getItem('userId');
        } catch (e) {
          console.log('Error getting seeker ID:', e);
        }
      }
      if (!seekerId) return;

      const sessionId = finalDecision?.summary?.session_id || null;

      try {
        const token = await AsyncStorage.getItem('userToken');
        const response = await fetch(`${QUOTATION_API_URL}/seeker/${seekerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.requests)) {
          const matchRequest = data.requests.some(
            (r) =>
              String(r.providerId?._id || r.providerId) === String(providerId) &&
              (!sessionId || r.sessionId === sessionId)
          );
          if (matchRequest) {
            setIsRequested(true);
          }
        }
      } catch (err) {
        console.log('Error checking provider quotation request:', err);
      }
    };

    checkExistingRequest();
  }, [providerId, user, finalDecision]);

  const getProfileImage = (profileImage) => {
    if (!profileImage) return null;
    const normalized = profileImage.replace(/\\/g, '/');
    if (normalized.startsWith('http')) return normalized;
    return `${CONFIG.API_BASE_URL}/${normalized}`;
  };

  const imageUrl = getProfileImage(provider.profileImage);
  const providerName = provider.name || 'Service Provider';
  const category = provider.category || 'Not specified';
  const district = provider.district || 'Not specified';
  const email = provider.email || 'Not available';
  const isVerified = provider.isVerified || false;
  const totalImages = portfolio.total_images || 0;
  const categories = portfolio.categories || [];
  const specificLabels = portfolio.specific_labels || [];
  const portfolioImages = portfolio.images || [];

  /*
   * ==========================================================
   * REQUEST QUOTATION
   * ==========================================================
   */

  const handleChat = () => {
    Alert.alert('Chat', `Start a conversation with ${providerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Chat', onPress: () => alert(`Chat with ${providerName} started!`) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            {imageUrl ? (
              <Image source={{ uri: imageUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.defaultAvatar}>
                <Ionicons name="person" size={50} color="#6366F1" />
              </View>
            )}
            <View style={styles.verificationBadge}>
              <Ionicons
                name={isVerified ? 'checkmark-circle' : 'close-circle'}
                size={24}
                color={isVerified ? '#10B981' : '#EF4444'}
              />
              <Text style={[styles.verificationText, { color: isVerified ? '#065F46' : '#991B1B' }]}>
                {isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>

          <Text style={styles.providerName}>{providerName}</Text>
          <View style={styles.categoryRow}>
            <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
            <Text style={styles.categoryText}>{category}</Text>
          </View>
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={16} color="#6B7280" />
            <Text style={styles.locationText}>{district}</Text>
          </View>
        </View>

        {/* Penalty / Account Restriction Alert Banner */}
        {restrictionInfo.isRestricted && (
          <View style={styles.restrictionBanner}>
            <View style={styles.restrictionBannerHeader}>
              <Ionicons name="alert-circle" size={22} color="#DC2626" />
              <Text style={styles.restrictionBannerTitle}>
                Provider Temporarily Unavailable ({restrictionInfo.penaltyRatio})
              </Text>
            </View>
            <Text style={styles.restrictionBannerText}>
              This service provider is currently restricted from accepting new quotations and bookings due to penalty points limit reached ({restrictionInfo.penaltyRatio}) or pending account verification.
              {'\n\n'}
              Please select another active verified professional for your requirement.
            </Text>
          </View>
        )}

        {/* Contact */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={20} color="#6366F1" />
            <Text style={styles.contactText}>{email}</Text>
          </View>
        </View>

        {/* Match details */}
        {Object.keys(match).length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Match Details</Text>
            <View style={styles.matchChips}>
              {match.category_match && (
                <View style={styles.matchChip}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.matchChipText}>Category match</Text>
                </View>
              )}
              {match.district_match && (
                <View style={styles.matchChip}>
                  <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                  <Text style={styles.matchChipText}>Location match</Text>
                </View>
              )}
              {match.priority && (
                <View style={[styles.matchChip, styles.priorityChip]}>
                  <Text style={styles.priorityChipText}>Priority: {match.priority}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Portfolio categories */}
        {categories.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Portfolio Categories</Text>
            <View style={styles.tagContainer}>
              {categories.map((cat, idx) => (
                <View key={idx} style={styles.tag}>
                  <Text style={styles.tagText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Specializations */}
        {specificLabels.length > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Specializations</Text>
            <View style={styles.tagContainer}>
              {specificLabels.map((label, idx) => (
                <View key={idx} style={[styles.tag, styles.specialTag]}>
                  <Text style={styles.specialTagText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Portfolio images */}
        {totalImages > 0 && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>
              Portfolio ({totalImages} image{totalImages > 1 ? 's' : ''})
            </Text>
            {portfolioImages.length > 0 ? (
              <View style={styles.imageGrid}>
                {portfolioImages.map((img, idx) => (
                  <Image
                    key={idx}
                    source={{ uri: `${CONFIG.API_BASE_URL}/${img}` }}
                    style={styles.portfolioImage}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.placeholderImages}>
                <Ionicons name="images-outline" size={40} color="#9CA3AF" />
                <Text style={styles.placeholderText}>Images not available</Text>
              </View>
            )}
          </View>
        )}

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.chatButtonLarge} onPress={handleChat}>
            <Ionicons name="chatbubble-outline" size={20} color="#fff" />
            <Text style={styles.chatButtonTextLarge}>Chat</Text>
          </TouchableOpacity>

          {restrictionInfo.isRestricted ? (
            <TouchableOpacity
              style={styles.quoteButtonLargeDisabled}
              onPress={() =>
                Alert.alert(
                  'Provider Unavailable',
                  `This service provider cannot accept new quotation requests at this time due to penalty score (${restrictionInfo.penaltyRatio || '3/3'}). Please choose another professional.`
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons name="ban-outline" size={20} color="#94A3B8" />
              <Text style={styles.quoteButtonTextLargeDisabled}>Unavailable</Text>
            </TouchableOpacity>
          ) : isRequested ? (
            <TouchableOpacity
              style={styles.quoteButtonLargeRequested}
              onPress={() =>
                Alert.alert(
                  'Quotation Requested',
                  `You have already sent a quotation request to ${providerName}. Only 1 quotation request is allowed per provider for this service requirement.`
                )
              }
            >
              <Ionicons name="checkmark-circle" size={20} color="#10B981" />
              <Text style={styles.quoteButtonTextLargeRequested}>Requested</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.quoteButtonLarge}
              onPress={() => setQuotationModalVisible(true)}
            >
              <Ionicons name="document-text-outline" size={20} color="#6366F1" />
              <Text style={styles.quoteButtonTextLarge}>Get Quote</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      <RequestQuotationModal
        visible={quotationModalVisible}
        provider={provider}
        seekerId={seekerId}
        sessionData={finalDecision?.summary || {}}
        diagnosisData={finalDecision || {}}
        defaultLocation={finalDecision?.summary?.provider_matching?.criteria?.service_location || ''}
        defaultUrgency={finalDecision?.summary?.urgency_level || 'Normal'}
        onClose={() => setQuotationModalVisible(false)}
        onSuccess={() => {
          setQuotationModalVisible(false);
          setIsRequested(true);
          onQuotationRequested?.(providerId);
          Alert.alert(
            'Request sent',
            'Quotation request sent successfully. You can track provider responses in My Jobs.'
          );
        }}
      />
    </SafeAreaView>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#6366F1',
  },
  defaultAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: 0,
    right: -10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },
  providerName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 12,
  },
  matchChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  matchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  matchChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginLeft: 4,
  },
  priorityChip: {
    backgroundColor: '#EEF2FF',
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6366F1',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tagText: {
    fontSize: 12,
    color: '#4B5563',
  },
  specialTag: {
    backgroundColor: '#EEF2FF',
  },
  specialTagText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6366F1',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  portfolioImage: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  placeholderImages: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  placeholderText: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  chatButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366F1',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
  },
  chatButtonTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  quoteButtonLarge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6366F1',
    gap: 8,
  },
  quoteButtonTextLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366F1',
  },
  quoteButtonLargeRequested: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ECFDF5',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#10B981',
    gap: 8,
  },
  quoteButtonTextLargeRequested: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  disabledButton: {
    opacity: 0.6,
  },
});
