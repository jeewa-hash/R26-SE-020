import { showRequestSent } from '../utils/seekerFeedback';
import PageHeader from '../components/PageHeader';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_SERVICE_URL, IP_ADDRESS, ML_SERVICE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import RequestQuotationModal from './IT22129376/components/RequestQuotationModal';

const { width } = Dimensions.get('window');
const QUOTATION_API_URL = `${API_BASE_URL}/request-quotations`;

// ─────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────
const P = {
  indigo: '#4F46E5',
  indigoDeep: '#4338CA',
  indigoSoft: '#EEF2FF',
  indigoSoftDark: '#1E1B4B',
  indigoLight: '#A5B4FC',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#ECFDF5',
  emeraldSoftDark: '#064E3B',
  emeraldLight: '#34D399',
  amber: '#F59E0B',
  amberDark: '#92400E',
  amberLight: '#FCD34D',
  amberVeryLight: '#FDE68A',
  amberSoft: '#FEF3C7',
  amberSoftDark: '#78350F',
  rose: '#EF4444',
  roseDark: '#991B1B',
  roseSoft: '#FEF2F2',
  roseSoftDark: '#7F1D1D',
  roseLight: '#FCA5A5',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

export default function ProviderProfileScreen({ route, navigation }) {
  const {
    providerItem,
    finalDecision,
    isRequested: initialIsRequested = false,
    onQuotationRequested,
  } = route.params || {};
  const { user } = useAuth();
  const { isDarkMode } = useTheme();

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
          `https://r26-admin-service.onrender.com/api/inquiries/check-bookable/${providerId}`
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
    return `${AUTH_SERVICE_URL}/${normalized.replace(/^\/+/, '')}`;
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

  // ─────────────────────────────────────────────────────────────
  // REAL rating — no hardcoded fallback
  // ─────────────────────────────────────────────────────────────
  const getProviderRating = (p) => {
    if (!p) return { value: null, count: 0 };
    const direct = p.rating ?? p.averageRating ?? p.avgRating ?? p.ratingAverage;
    const count =
      p.reviewCount ?? p.totalReviews ?? p.reviewsCount ?? p.totalRatings ?? 0;

    if (direct == null && Array.isArray(p.reviews) && p.reviews.length > 0) {
      const nums = p.reviews
        .map((r) => Number(r?.rating ?? r?.stars ?? r?.score))
        .filter((n) => Number.isFinite(n));
      if (nums.length > 0) {
        const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
        return { value: avg, count: nums.length };
      }
    }

    const num = Number(direct);
    if (!Number.isFinite(num) || num <= 0) {
      return { value: null, count: Number(count) || 0 };
    }
    return { value: num, count: Number(count) || 0 };
  };

  const renderRating = () => {
    const { value, count } = getProviderRating(provider);
    if (value == null) return null;

    const rounded = Math.round(value * 2) / 2;
    const full = Math.floor(rounded);
    const half = rounded - full >= 0.5;

    return (
      <View style={styles.ratingRow}>
        {[0, 1, 2, 3, 4].map((i) => {
          const name =
            i < full ? 'star' : i === full && half ? 'star-half' : 'star-outline';
          return <Ionicons key={i} name={name} size={16} color={P.amber} />;
        })}
        <Text style={[styles.ratingValue, isDarkMode && { color: P.slate200 }]}>
          {value.toFixed(1)}
        </Text>
        {count > 0 && (
          <Text style={[styles.ratingCount, isDarkMode && { color: P.slate400 }]}>
            ({count})
          </Text>
        )}
      </View>
    );
  };

  const handleChat = () => {
    Alert.alert('Chat', `Start a conversation with ${providerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start Chat', onPress: () => alert(`Chat with ${providerName} started!`) },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? P.slate900 : P.slate50}
      />

      <ScrollView
        style={[styles.container, isDarkMode && { backgroundColor: P.slate900 }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <PageHeader title="Provider Profile" />

        {/* ── Hero profile card ── */}
        <View style={[styles.heroCard, isDarkMode && styles.heroCardDark]}>
          <LinearGradient
            colors={isDarkMode ? [P.indigoSoftDark, '#312E81'] : [P.indigo, P.indigoDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.heroDeco1} />
            <View style={styles.heroDeco2} />
          </LinearGradient>

          <View style={styles.avatarWrap}>
            <View
              style={[
                styles.avatarRing,
                isDarkMode && { backgroundColor: P.slate800, borderColor: P.slate700 },
              ]}
            >
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.avatar} />
              ) : (
                <View
                  style={[
                    styles.defaultAvatar,
                    isDarkMode && { backgroundColor: P.indigoSoftDark },
                  ]}
                >
                  <Ionicons
                    name="person"
                    size={46}
                    color={isDarkMode ? P.indigoLight : P.indigo}
                  />
                </View>
              )}
            </View>
          </View>

          <View style={styles.heroContent}>
            <Text
              style={[styles.providerName, isDarkMode && { color: P.white }]}
              numberOfLines={2}
            >
              {providerName}
            </Text>

            <View
              style={[
                styles.verifiedPill,
                {
                  backgroundColor: isVerified
                    ? (isDarkMode ? P.emeraldSoftDark : P.emeraldSoft)
                    : (isDarkMode ? P.roseSoftDark : P.roseSoft),
                  borderColor: isVerified ? P.emerald : P.rose,
                },
              ]}
            >
              <Ionicons
                name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                size={14}
                color={isVerified ? P.emerald : P.rose}
              />
              <Text
                style={[
                  styles.verifiedPillText,
                  {
                    color: isVerified
                      ? (isDarkMode ? P.emeraldLight : P.emeraldDark)
                      : (isDarkMode ? P.roseLight : P.roseDark),
                  },
                ]}
              >
                {isVerified ? 'Verified Provider' : 'Unverified Provider'}
              </Text>
            </View>

            {renderRating()}
          </View>

          {/* Info strip */}
          <View
            style={[
              styles.infoStrip,
              isDarkMode && { borderColor: P.slate700, backgroundColor: P.slate800 },
            ]}
          >
            <View style={styles.infoCol}>
              <View
                style={[styles.infoIcon, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
              >
                <Ionicons
                  name="briefcase"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.infoLabel, isDarkMode && { color: P.slate400 }]}>
                Category
              </Text>
              <Text
                style={[styles.infoValue, isDarkMode && { color: P.white }]}
                numberOfLines={1}
              >
                {category}
              </Text>
            </View>

            <View
              style={[styles.infoDivider, isDarkMode && { backgroundColor: P.slate700 }]}
            />

            <View style={styles.infoCol}>
              <View
                style={[styles.infoIcon, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
              >
                <Ionicons
                  name="location"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.infoLabel, isDarkMode && { color: P.slate400 }]}>
                Location
              </Text>
              <Text
                style={[styles.infoValue, isDarkMode && { color: P.white }]}
                numberOfLines={1}
              >
                {district}
              </Text>
            </View>

            <View
              style={[styles.infoDivider, isDarkMode && { backgroundColor: P.slate700 }]}
            />

            <View style={styles.infoCol}>
              <View
                style={[styles.infoIcon, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
              >
                <Ionicons
                  name="images"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.infoLabel, isDarkMode && { color: P.slate400 }]}>
                Portfolio
              </Text>
              <Text style={[styles.infoValue, isDarkMode && { color: P.white }]}>
                {totalImages > 0
                  ? `${totalImages} photo${totalImages > 1 ? 's' : ''}`
                  : 'None'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Restriction alert ── */}
        {restrictionInfo.isRestricted && (
          <View
            style={[
              styles.restrictionBanner,
              isDarkMode && { backgroundColor: P.amberSoftDark, borderColor: P.amber },
            ]}
          >
            <View style={styles.restrictionHeader}>
              <View
                style={[
                  styles.restrictionIconBadge,
                  isDarkMode && { backgroundColor: 'rgba(245,158,11,0.25)' },
                ]}
              >
                <Ionicons name="alert-circle" size={22} color={P.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[styles.restrictionTitle, isDarkMode && { color: P.amberLight }]}
                >
                  Provider Temporarily Unavailable
                </Text>
                <Text
                  style={[styles.restrictionSub, isDarkMode && { color: P.amber }]}
                >
                  Penalty score: {restrictionInfo.penaltyRatio}
                </Text>
              </View>
            </View>
            <Text
              style={[styles.restrictionText, isDarkMode && { color: P.amberVeryLight }]}
            >
              This provider is restricted from accepting new quotations and bookings due to
              penalty points limit reached or pending verification.{'\n\n'}
              Please choose another active, verified professional for your requirement.
            </Text>
          </View>
        )}

        {/* ── Contact Information ── */}
        <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
          <View style={styles.sectionHeader}>
            <View
              style={[
                styles.sectionIconBadge,
                isDarkMode && { backgroundColor: P.indigoSoftDark },
              ]}
            >
              <Ionicons
                name="call"
                size={16}
                color={isDarkMode ? P.indigoLight : P.indigo}
              />
            </View>
            <Text style={[styles.sectionTitle, isDarkMode && { color: P.white }]}>
              Contact Information
            </Text>
          </View>

          <View
            style={[
              styles.contactRow,
              isDarkMode && { backgroundColor: P.slate900, borderColor: P.slate700 },
            ]}
          >
            <View
              style={[
                styles.contactIconWrap,
                isDarkMode && { backgroundColor: P.indigoSoftDark },
              ]}
            >
              <Ionicons
                name="mail"
                size={16}
                color={isDarkMode ? P.indigoLight : P.slate600}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactLabel, isDarkMode && { color: P.slate400 }]}>
                Email
              </Text>
              <Text
                style={[styles.contactValue, isDarkMode && { color: P.slate200 }]}
                numberOfLines={1}
              >
                {email}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Match details ── */}
        {Object.keys(match).length > 0 && (
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBadge,
                  isDarkMode && { backgroundColor: P.indigoSoftDark },
                ]}
              >
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.sectionTitle, isDarkMode && { color: P.white }]}>
                Match Details
              </Text>
            </View>

            <View style={styles.tagContainer}>
              {match.category_match && (
                <View
                  style={[
                    styles.matchChip,
                    isDarkMode && { backgroundColor: P.emeraldSoftDark },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isDarkMode ? P.emeraldLight : P.emerald}
                  />
                  <Text
                    style={[
                      styles.matchChipText,
                      isDarkMode && { color: P.emeraldLight },
                    ]}
                  >
                    Category match
                  </Text>
                </View>
              )}
              {match.district_match && (
                <View
                  style={[
                    styles.matchChip,
                    isDarkMode && { backgroundColor: P.emeraldSoftDark },
                  ]}
                >
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isDarkMode ? P.emeraldLight : P.emerald}
                  />
                  <Text
                    style={[
                      styles.matchChipText,
                      isDarkMode && { color: P.emeraldLight },
                    ]}
                  >
                    Location match
                  </Text>
                </View>
              )}
              {match.priority && (
                <View
                  style={[
                    styles.priorityChip,
                    isDarkMode && { backgroundColor: P.indigoSoftDark },
                  ]}
                >
                  <Ionicons
                    name="flash"
                    size={12}
                    color={isDarkMode ? P.indigoLight : P.indigo}
                  />
                  <Text
                    style={[
                      styles.priorityChipText,
                      isDarkMode && { color: P.indigoLight },
                    ]}
                  >
                    {match.priority} priority
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ── Portfolio Categories ── */}
        {categories.length > 0 && (
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBadge,
                  isDarkMode && { backgroundColor: P.indigoSoftDark },
                ]}
              >
                <Ionicons
                  name="albums"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.sectionTitle, isDarkMode && { color: P.white }]}>
                Portfolio Categories
              </Text>
            </View>
            <View style={styles.tagContainer}>
              {categories.map((cat, idx) => (
                <View
                  key={idx}
                  style={[styles.tag, isDarkMode && { backgroundColor: P.slate700 }]}
                >
                  <Text style={[styles.tagText, isDarkMode && { color: P.slate200 }]}>
                    {cat}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Specializations ── */}
        {specificLabels.length > 0 && (
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBadge,
                  isDarkMode && { backgroundColor: P.indigoSoftDark },
                ]}
              >
                <Ionicons
                  name="ribbon"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.sectionTitle, isDarkMode && { color: P.white }]}>
                Specializations
              </Text>
            </View>
            <View style={styles.tagContainer}>
              {specificLabels.map((label, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.tag,
                    styles.specialTag,
                    isDarkMode && { backgroundColor: P.indigoSoftDark },
                  ]}
                >
                  <Text
                    style={[styles.specialTagText, isDarkMode && { color: P.indigoLight }]}
                  >
                    {label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* ── Portfolio images ── */}
        {totalImages > 0 && (
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.sectionHeader}>
              <View
                style={[
                  styles.sectionIconBadge,
                  isDarkMode && { backgroundColor: P.indigoSoftDark },
                ]}
              >
                <Ionicons
                  name="images"
                  size={16}
                  color={isDarkMode ? P.indigoLight : P.indigo}
                />
              </View>
              <Text style={[styles.sectionTitle, isDarkMode && { color: P.white }]}>
                Portfolio ({totalImages} image{totalImages > 1 ? 's' : ''})
              </Text>
            </View>

            {portfolioImages.length > 0 ? (
              <View style={styles.imageGrid}>
                {portfolioImages.map((img, idx) => (
                  <Image
                    key={idx}
                    source={{
                      uri: img.startsWith('http')
                        ? img
                        : `${ML_SERVICE_URL}/${img.replace(/^\/+/, '')}`,
                    }}
                    style={[
                      styles.portfolioImage,
                      isDarkMode && { backgroundColor: P.slate700 },
                    ]}
                  />
                ))}
              </View>
            ) : (
              <View
                style={[
                  styles.placeholderImages,
                  isDarkMode && { backgroundColor: P.slate900, borderColor: P.slate700 },
                ]}
              >
                <Ionicons
                  name="images-outline"
                  size={36}
                  color={isDarkMode ? P.slate600 : P.slate400}
                />
                <Text
                  style={[styles.placeholderText, isDarkMode && { color: P.slate500 }]}
                >
                  Images not available
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ── Action buttons ── */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.chatButtonWrap}
            onPress={handleChat}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={
                isDarkMode ? [P.indigoLight, P.indigo] : [P.indigo, P.indigoDeep]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.chatButtonGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={20} color={P.white} />
              <Text style={styles.chatButtonText}>Chat</Text>
            </LinearGradient>
          </TouchableOpacity>

          {restrictionInfo.isRestricted ? (
            <TouchableOpacity
              style={[styles.quoteButtonDisabled, isDarkMode && { backgroundColor: P.slate700 }]}
              onPress={() =>
                Alert.alert(
                  'Provider Unavailable',
                  `This provider cannot accept new quotation requests at this time due to penalty score (${restrictionInfo.penaltyRatio || '3/3'}). Please choose another professional.`
                )
              }
              activeOpacity={0.7}
            >
              <Ionicons
                name="ban-outline"
                size={20}
                color={isDarkMode ? P.slate400 : P.slate500}
              />
              <Text
                style={[
                  styles.quoteButtonTextDisabled,
                  isDarkMode && { color: P.slate400 },
                ]}
              >
                Unavailable
              </Text>
            </TouchableOpacity>
          ) : isRequested ? (
            <TouchableOpacity
              style={[
                styles.quoteButtonRequested,
                isDarkMode && {
                  backgroundColor: P.emeraldSoftDark,
                  borderColor: P.emerald,
                },
              ]}
              disabled
              accessibilityState={{ disabled: true }}
            >
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={isDarkMode ? P.emeraldLight : P.emerald}
              />
              <Text
                style={[
                  styles.quoteButtonTextRequested,
                  isDarkMode && { color: P.emeraldLight },
                ]}
              >
                Requested
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.quoteButton,
                isDarkMode && {
                  backgroundColor: P.indigoSoftDark,
                  borderColor: P.indigo,
                },
              ]}
              onPress={() => setQuotationModalVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons
                name="document-text"
                size={20}
                color={isDarkMode ? P.indigoLight : P.indigo}
              />
              <Text
                style={[
                  styles.quoteButtonText,
                  isDarkMode && { color: P.indigoLight },
                ]}
              >
                Get Quote
              </Text>
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
        onAlreadyRequested={() => { setIsRequested(true); setQuotationModalVisible(false); onQuotationRequested?.(providerId); }}
        onSuccess={() => {
          setQuotationModalVisible(false);
          setIsRequested(true);
          onQuotationRequested?.(providerId);
          showRequestSent(navigation);
        }}
      />
    </SafeAreaView>
  );
}

/* ============================================================
   STYLES
============================================================ */
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: P.slate50 },
  safeAreaDark: { backgroundColor: P.slate900 },

  container: { flex: 1, backgroundColor: P.slate50 },
  scrollContent: { padding: 16, paddingBottom: 32 },

  // ── Hero ──
  heroCard: {
    backgroundColor: P.white,
    borderRadius: 22,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
    }),
  },
  heroCardDark: { backgroundColor: P.slate800, borderColor: P.slate700 },
  heroBanner: { height: 110, overflow: 'hidden', position: 'relative' },
  heroDeco1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: -90,
    right: -50,
  },
  heroDeco2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: -60,
    left: -20,
  },

  avatarWrap: { alignItems: 'center', marginTop: -52 },
  avatarRing: {
    padding: 5,
    borderRadius: 62,
    backgroundColor: P.white,
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
    }),
  },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  defaultAvatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: P.indigoSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },

  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 10,
  },
  providerName: {
    fontSize: 22,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  verifiedPillText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingValue: { fontSize: 13, fontWeight: '800', color: P.slate800, marginLeft: 6 },
  ratingCount: { fontSize: 12, fontWeight: '600', color: P.slate500 },

  // Info strip
  infoStrip: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderColor: P.slate100,
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: P.slate50,
  },
  infoCol: { flex: 1, alignItems: 'center', gap: 4 },
  infoIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  infoLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: P.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  infoValue: {
    fontSize: 12.5,
    fontWeight: '800',
    color: P.slate900,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  infoDivider: { width: 1, backgroundColor: P.slate200, marginVertical: 6 },

  // ── Restriction banner ──
  restrictionBanner: {
    backgroundColor: P.amberSoft,
    borderColor: P.amber,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  restrictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  restrictionIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(245,158,11,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restrictionTitle: {
    color: P.amberDark,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  restrictionSub: {
    color: P.amberDark,
    fontSize: 12.5,
    fontWeight: '600',
    marginTop: 2,
  },
  restrictionText: {
    color: P.amberDark,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  // ── Section cards ──
  sectionCard: {
    backgroundColor: P.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  sectionCardDark: { backgroundColor: P.slate800, borderColor: P.slate700 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  sectionIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.2,
  },

  // Contact
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: P.slate50,
    borderWidth: 1,
    borderColor: P.slate100,
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: P.slate500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  contactValue: { fontSize: 14, fontWeight: '700', color: P.slate800 },

  // Tags
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  matchChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.emeraldSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  matchChipText: { fontSize: 12, fontWeight: '700', color: P.emeraldDark },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.indigoSoft,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
  },
  priorityChipText: { fontSize: 12, fontWeight: '800', color: P.indigo },
  tag: {
    backgroundColor: P.slate100,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tagText: { fontSize: 12.5, fontWeight: '600', color: P.slate600 },
  specialTag: { backgroundColor: P.indigoSoft },
  specialTagText: { fontSize: 12.5, fontWeight: '700', color: P.indigo },

  // Portfolio grid
  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portfolioImage: {
    width: (width - 64) / 3,
    height: (width - 64) / 3,
    borderRadius: 12,
    backgroundColor: P.slate100,
    resizeMode: 'cover',
  },
  placeholderImages: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 8,
    borderRadius: 12,
    backgroundColor: P.slate50,
    borderWidth: 1,
    borderColor: P.slate100,
    borderStyle: 'dashed',
  },
  placeholderText: { fontSize: 13, color: P.slate400, fontWeight: '600' },

  // Actions
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  chatButtonWrap: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: P.indigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    gap: 8,
  },
  chatButtonText: { fontSize: 15, fontWeight: '800', color: P.white },

  quoteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.indigoSoft,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.indigo,
    gap: 8,
  },
  quoteButtonText: { fontSize: 15, fontWeight: '800', color: P.indigo },

  quoteButtonRequested: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.emeraldSoft,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: P.emerald,
    gap: 8,
  },
  quoteButtonTextRequested: {
    fontSize: 15,
    fontWeight: '800',
    color: P.emeraldDark,
  },

  quoteButtonDisabled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: P.slate200,
    paddingVertical: 15,
    borderRadius: 14,
    gap: 8,
  },
  quoteButtonTextDisabled: {
    fontSize: 15,
    fontWeight: '800',
    color: P.slate500,
  },
});