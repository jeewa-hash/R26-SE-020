// screens/RequestQuotationDetailsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROVIDER_SERVICE_URL as PROVIDER_SERVICE_ROOT, SEEKER_SERVICE_URL } from '../config';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

const PROVIDER_API = `${PROVIDER_SERVICE_ROOT}/api/provider/quotations`;
const SEEKER_API = SEEKER_SERVICE_URL;
const PROVIDER_SERVICE_URL_BASE = `${PROVIDER_SERVICE_ROOT}/portfolio/all-providers`;

export default function RequestQuotationDetailsScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const { isDarkMode } = useTheme();

  const [request, setRequest] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [providersMap, setProvidersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────────────────────
  // Fetch all providers and build map
  // ─────────────────────────────────────────────────────────────
  const fetchProviders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(PROVIDER_SERVICE_URL_BASE, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.providers) {
          const map = {};
          data.providers.forEach((item) => {
            const provider = item.provider || {};
            if (provider.id) {
              map[provider.id] = {
                provider,
                portfolio: item.portfolio || {},
              };
            }
          });
          setProvidersMap(map);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch providers:', err);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Fetch request details
  // ─────────────────────────────────────────────────────────────
  const fetchRequestDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;
      const response = await fetch(`${SEEKER_API}/request-quotations/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setRequest(data.request);
      }
    } catch (err) {
      console.warn('Failed to fetch request details:', err);
    }
  }, [requestId]);

  // ─────────────────────────────────────────────────────────────
  // Fetch quotations
  // ─────────────────────────────────────────────────────────────
  const fetchQuotations = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setError('Please log in to view quotations.');
        setLoading(false);
        return;
      }
      const response = await fetch(`${PROVIDER_API}/seeker/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error(`Failed: ${response.status}`);
      const data = await response.json();
      if (data.success && data.data) {
        setQuotations(data.data.filter((q) => q.providerRequestId === requestId));
      } else {
        setQuotations([]);
      }
    } catch (err) {
      console.error('QUOTATIONS FETCH ERROR:', err);
      setError('Could not load quotations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([fetchProviders(), fetchRequestDetails(), fetchQuotations()]);
      setLoading(false);
    };
    if (requestId) {
      fetchAll();
    } else {
      setError('Request ID is missing.');
      setLoading(false);
    }
  }, [requestId]);

  const onRefresh = () => {
    setRefreshing(true);
    Promise.all([fetchProviders(), fetchRequestDetails(), fetchQuotations()]).finally(() =>
      setRefreshing(false)
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Accept quotation
  // ─────────────────────────────────────────────────────────────
  const handleAccept = (quote) => {
    Alert.alert(
      'Accept Quotation',
      `Accept quotation of LKR ${quote.price}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(`${PROVIDER_API}/${quote._id}/accept`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });
              const data = await res.json();
              if (data.success) {
                Alert.alert('Success', 'Quotation accepted!');
                fetchQuotations();
              } else {
                Alert.alert('Error', data.message || 'Failed to accept.');
              }
            } catch {
              Alert.alert('Error', 'Network error.');
            }
          },
        },
      ]
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Status config
  // ─────────────────────────────────────────────────────────────
  const getStatusConfig = (status) => {
    switch (status) {
      case 'SENT':
        return {
          bg: isDarkMode ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
          color: '#D97706',
          icon: 'time-outline',
          label: 'Pending',
        };
      case 'ACCEPTED':
        return {
          bg: isDarkMode ? 'rgba(16,185,129,0.15)' : '#D1FAE5',
          color: '#059669',
          icon: 'checkmark-circle',
          label: 'Accepted',
        };
      case 'REJECTED':
        return {
          bg: isDarkMode ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
          color: '#DC2626',
          icon: 'close-circle',
          label: 'Rejected',
        };
      default:
        return {
          bg: isDarkMode ? '#242f4d' : '#F3F4F6',
          color: '#6B7280',
          icon: 'help-circle-outline',
          label: 'Unknown',
        };
    }
  };

  // Navigate to provider profile
  const navigateToProviderProfile = (providerId) => {
    const providerData = providersMap[providerId];
    if (!providerData) {
      Alert.alert('Error', 'Provider information not found.');
      return;
    }
    navigation.navigate('ProviderProfile', {
      providerItem: {
        provider: providerData.provider,
        portfolio: providerData.portfolio,
        match: { category_match: true, district_match: true, priority: 'HIGH' },
      },
      finalDecision: null,
    });
  };

  // ─────────────────────────────────────────────────────────────
  // Loading state
  // ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.headerBtn, isDarkMode && styles.headerBtnDark]}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quotation Details</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={[styles.loadingContainer, isDarkMode && styles.containerDark]}>
          <ActivityIndicator size="large" color={isDarkMode ? '#818cf8' : '#667eea'} />
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading details...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      {/* ── Header ── */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.headerBtn, isDarkMode && styles.headerBtnDark]}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quotation Details</Text>
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.headerBtn, isDarkMode && styles.headerBtnDark]}
        >
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[isDarkMode ? '#818cf8' : '#667eea']}
          />
        }
      >
        {error ? (
          /* ── Error ── */
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
            <Text style={[styles.errorText, isDarkMode && styles.textMutedDark]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── Request Details Card ── */}
            {request && (
              <View style={[styles.requestCard, isDarkMode && styles.requestCardDark]}>
                <View style={styles.requestHeader}>
                  <View style={[styles.requestIconContainer, isDarkMode && styles.requestIconContainerDark]}>
                    <Ionicons name="construct-outline" size={24} color={isDarkMode ? '#818cf8' : '#667eea'} />
                  </View>
                  <View style={styles.requestHeaderText}>
                    <Text style={[styles.requestCategory, isDarkMode && styles.textMutedDark]}>
                      {request.detectedCategory}
                    </Text>
                    <Text style={[styles.requestObject, isDarkMode && styles.textDark]}>
                      {request.detectedObject}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.requestDescription, isDarkMode && styles.requestDescriptionDark]}>
                  {request.briefDescription || 'No description provided.'}
                </Text>

                <View style={styles.requestMetaContainer}>
                  <View style={[styles.metaItem, isDarkMode && styles.metaItemDark]}>
                    <Ionicons name="flash-outline" size={15} color="#F59E0B" />
                    <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                      {request.urgencyLevel || 'Normal'}
                    </Text>
                  </View>
                  <View style={[styles.metaItem, isDarkMode && styles.metaItemDark]}>
                    <Ionicons name="location-outline" size={15} color={isDarkMode ? '#94A3B8' : '#6B7280'} />
                    <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                      {request.serviceLocation || 'N/A'}
                    </Text>
                  </View>
                  <View style={[styles.metaItem, isDarkMode && styles.metaItemDark]}>
                    <Ionicons name="calendar-outline" size={15} color={isDarkMode ? '#94A3B8' : '#6B7280'} />
                    <Text style={[styles.metaText, isDarkMode && styles.metaTextDark]}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {/* Step breakdown */}
                {request.stepBreakdown && request.stepBreakdown.length > 0 && (
                  <View style={[styles.stepBreakdown, isDarkMode && styles.stepBreakdownDark]}>
                    <Text style={[styles.stepTitle, isDarkMode && styles.textDark]}>
                      Service Details
                    </Text>
                    {request.stepBreakdown.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={[styles.stepBadge, isDarkMode && styles.stepBadgeDark]}>
                          <Text style={[styles.stepBadgeText, isDarkMode && styles.stepBadgeTextDark]}>
                            {step.step}
                          </Text>
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={[styles.stepLabel, isDarkMode && styles.textMutedDark]}>
                            {step.label}
                          </Text>
                          <Text style={[styles.stepAnswer, isDarkMode && styles.textDark]}>
                            {step.answer}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ── Quotations Section Header ── */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
                Quotations
              </Text>
              <View style={[styles.sectionCountBadge, isDarkMode && styles.sectionCountBadgeDark]}>
                <Text style={[styles.sectionCount, isDarkMode && styles.sectionCountDark]}>
                  {quotations.length} received
                </Text>
              </View>
            </View>

            {/* ── Empty State ── */}
            {quotations.length === 0 ? (
              <View style={styles.emptyQuotesContainer}>
                <View style={[styles.emptyIconBubble, isDarkMode && styles.emptyIconBubbleDark]}>
                  <Ionicons
                    name="document-text-outline"
                    size={36}
                    color={isDarkMode ? '#475569' : '#9CA3AF'}
                  />
                </View>
                <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
                  No Quotations Yet
                </Text>
                <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
                  No provider has sent a quotation for this request yet.
                </Text>
              </View>
            ) : (
              /* ── Quotation Cards ── */
              quotations.map((quote) => {
                const status = getStatusConfig(quote.status);
                const providerData = providersMap[quote.providerId] || {};
                const provider = providerData.provider || {};
                const providerName = provider.name || quote.providerName || 'Provider';

                return (
                  <View key={quote._id} style={[styles.quoteCard, isDarkMode && styles.quoteCardDark]}>
                    {/* Quote header — provider info + status badge */}
                    <View style={styles.quoteHeader}>
                      <TouchableOpacity
                        style={styles.providerInfo}
                        onPress={() => navigateToProviderProfile(quote.providerId)}
                        activeOpacity={0.7}
                      >
                        <LinearGradient
                          colors={['#667eea', '#764ba2']}
                          style={styles.providerAvatar}
                        >
                          <Text style={styles.providerInitial}>
                            {providerName.charAt(0).toUpperCase()}
                          </Text>
                        </LinearGradient>
                        <View>
                          <Text style={[styles.providerName, isDarkMode && styles.textDark]}>
                            {providerName}
                          </Text>
                          {provider.email ? (
                            <Text style={[styles.providerEmail, isDarkMode && styles.textMutedDark]}>
                              {provider.email}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>

                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    {/* ── Divider ── */}
                    <View style={[styles.cardDivider, isDarkMode && styles.cardDividerDark]} />

                    {/* Quote details */}
                    <View style={styles.quoteDetails}>
                      {/* Price */}
                      <View style={[styles.priceBox, isDarkMode && styles.priceBoxDark]}>
                        <Text style={[styles.priceLabel, isDarkMode && styles.textMutedDark]}>
                          Quoted Price
                        </Text>
                        <Text style={[styles.priceValue, isDarkMode && styles.priceValueDark]}>
                          LKR {quote.price}
                        </Text>
                      </View>

                      {/* Duration */}
                      <View style={[styles.detailRow, isDarkMode && styles.detailRowDark]}>
                        <Ionicons
                          name="time-outline"
                          size={17}
                          color={isDarkMode ? '#818cf8' : '#667eea'}
                        />
                        <Text style={[styles.detailText, isDarkMode && styles.textMutedDark]}>
                          {quote.durationText || '1 day'}
                        </Text>
                      </View>

                      {/* Notes */}
                      {quote.notes ? (
                        <View style={[styles.notesBox, isDarkMode && styles.notesBoxDark]}>
                          <Ionicons
                            name="document-text-outline"
                            size={15}
                            color={isDarkMode ? '#94A3B8' : '#9CA3AF'}
                          />
                          <Text style={[styles.notesText, isDarkMode && styles.textMutedDark]}>
                            {quote.notes}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Accept button (only for SENT/pending quotes) */}
                    {quote.status === 'SENT' && (
                      <TouchableOpacity
                        style={styles.acceptButton}
                        onPress={() => handleAccept(quote)}
                      >
                        <LinearGradient
                          colors={['#10B981', '#059669']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.acceptGradient}
                        >
                          <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                          <Text style={styles.acceptButtonText}>Accept Quotation</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Layout ──
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  containerDark: {
    backgroundColor: '#0f1121',
  },

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },

  // ── Scroll content ──
  content: {
    padding: 16,
    paddingBottom: 48,
  },

  // ── Loading ──
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // ── Error / Center ──
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Request card ──
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  requestCardDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  requestIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  requestIconContainerDark: {
    backgroundColor: '#1e1b4b',
  },
  requestHeaderText: {
    flex: 1,
  },
  requestCategory: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  requestObject: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 2,
  },
  requestDescription: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: 14,
  },
  requestDescriptionDark: {
    color: '#94A3B8',
  },
  requestMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 5,
  },
  metaItemDark: {
    backgroundColor: '#242f4d',
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  metaTextDark: {
    color: '#94A3B8',
  },

  // ── Step breakdown ──
  stepBreakdown: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  stepBreakdownDark: {
    borderTopColor: '#2d3561',
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(102,126,234,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepBadgeDark: {
    backgroundColor: 'rgba(129,140,248,0.15)',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667eea',
  },
  stepBadgeTextDark: {
    color: '#818cf8',
  },
  stepContent: {
    flex: 1,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  stepAnswer: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCountBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  sectionCountBadgeDark: {
    backgroundColor: '#1e1b4b',
  },
  sectionCount: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  sectionCountDark: {
    color: '#818cf8',
  },

  // ── Empty state ──
  emptyQuotesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIconBubble: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIconBubbleDark: {
    backgroundColor: '#1e2a45',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 20,
  },

  // ── Quote card ──
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 4,
  },
  quoteCardDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.35,
  },
  quoteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  providerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInitial: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  providerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  providerEmail: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
    flexShrink: 0,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Card divider ──
  cardDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginBottom: 14,
  },
  cardDividerDark: {
    backgroundColor: '#2d3561',
  },

  // ── Quote details ──
  quoteDetails: {
    marginBottom: 14,
    gap: 10,
  },
  priceBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  priceBoxDark: {
    backgroundColor: '#0f172a',
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#667eea',
  },
  priceValueDark: {
    color: '#818cf8',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  detailRowDark: {
    backgroundColor: '#242f4d',
  },
  detailText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  notesBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
  },
  notesBoxDark: {
    backgroundColor: '#1e2a45',
  },
  notesText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    lineHeight: 19,
  },

  // ── Accept button ──
  acceptButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Shared text overrides ──
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});