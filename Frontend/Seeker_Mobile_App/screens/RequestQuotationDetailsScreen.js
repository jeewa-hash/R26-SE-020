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
import { IP_ADDRESS } from '../config';

const { width } = Dimensions.get('window');

const PROVIDER_API = `http://${IP_ADDRESS}:3002/api/provider/quotations`;
const SEEKER_API = `http://${IP_ADDRESS}:6000`;
const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:5000/portfolio/all-providers`;

export default function RequestQuotationDetailsScreen({ route, navigation }) {
  const { requestId } = route.params || {};
  const [request, setRequest] = useState(null);
  const [quotations, setQuotations] = useState([]);
  const [providersMap, setProvidersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all providers and build a map (store both provider and portfolio)
  const fetchProviders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(PROVIDER_SERVICE_URL, {
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
                provider: provider,
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

  // Fetch request details
  const fetchRequestDetails = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${SEEKER_API}/request-quotations/${requestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRequest(data.request);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch request details:', err);
    }
  }, [requestId]);

  // Fetch quotations
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

      if (!response.ok) {
        throw new Error(`Failed to fetch quotations: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.data) {
        const filtered = data.data.filter(
          (q) => q.providerRequestId === requestId
        );
        setQuotations(filtered);
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

  // Fetch all data
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
            } catch (err) {
              Alert.alert('Error', 'Network error.');
            }
          },
        },
      ]
    );
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'SENT':
        return { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending' };
      case 'ACCEPTED':
        return { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle', label: 'Accepted' };
      case 'REJECTED':
        return { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Rejected' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', icon: 'help-circle-outline', label: 'Unknown' };
    }
  };

  // 🔥 Navigate to provider profile (same as BookingsScreen)
  const navigateToProviderProfile = (providerId) => {
    const providerData = providersMap[providerId];
    if (!providerData) {
      Alert.alert('Error', 'Provider information not found.');
      return;
    }

    const providerItem = {
      provider: providerData.provider,
      portfolio: providerData.portfolio,
      match: {
        category_match: true,
        district_match: true,
        priority: 'HIGH',
      },
    };

    navigation.navigate('ProviderProfile', {
      providerItem: providerItem,
      finalDecision: null, // no summary available
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quotation Details</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Quotation Details</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.center}>
            <Ionicons name="alert-circle-outline" size={60} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Request Details Card */}
            {request && (
              <View style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.requestIconContainer}>
                    <Ionicons name="construct-outline" size={24} color="#667eea" />
                  </View>
                  <View style={styles.requestHeaderText}>
                    <Text style={styles.requestCategory}>
                      {request.detectedCategory}
                    </Text>
                    <Text style={styles.requestObject}>
                      {request.detectedObject}
                    </Text>
                  </View>
                </View>

                <Text style={styles.requestDescription}>
                  {request.briefDescription || 'No description provided.'}
                </Text>

                <View style={styles.requestMetaContainer}>
                  <View style={styles.metaItem}>
                    <Ionicons name="flash-outline" size={16} color="#F59E0B" />
                    <Text style={styles.metaText}>
                      {request.urgencyLevel || 'Normal'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {request.serviceLocation || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={16} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {new Date(request.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>

                {request.stepBreakdown && request.stepBreakdown.length > 0 && (
                  <View style={styles.stepBreakdown}>
                    <Text style={styles.stepTitle}>Service Details</Text>
                    {request.stepBreakdown.map((step, idx) => (
                      <View key={idx} style={styles.stepRow}>
                        <View style={styles.stepBadge}>
                          <Text style={styles.stepBadgeText}>{step.step}</Text>
                        </View>
                        <View style={styles.stepContent}>
                          <Text style={styles.stepLabel}>{step.label}</Text>
                          <Text style={styles.stepAnswer}>{step.answer}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Quotations Section */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quotations</Text>
              <Text style={styles.sectionCount}>{quotations.length} received</Text>
            </View>

            {quotations.length === 0 ? (
              <View style={styles.emptyQuotesContainer}>
                <Ionicons name="document-text-outline" size={60} color="#D1D5DB" />
                <Text style={styles.emptyTitle}>No Quotations Yet</Text>
                <Text style={styles.emptyText}>
                  No provider has sent a quotation for this request yet.
                </Text>
              </View>
            ) : (
              quotations.map((quote) => {
                const status = getStatusConfig(quote.status);
                const providerData = providersMap[quote.providerId] || {};
                const provider = providerData.provider || {};
                const providerName = provider.name || quote.providerName || 'Provider';

                return (
                  <View key={quote._id} style={styles.quoteCard}>
                    <View style={styles.quoteHeader}>
                      {/* 🔥 Clickable provider info */}
                      <TouchableOpacity
                        style={styles.providerInfo}
                        onPress={() => navigateToProviderProfile(quote.providerId)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.providerAvatar}>
                          <Text style={styles.providerInitial}>
                            {providerName.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.providerName}>
                            {providerName}
                          </Text>
                          <Text style={styles.providerEmail}>
                            {provider.email || ''}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                        <Ionicons name={status.icon} size={14} color={status.color} />
                        <Text style={[styles.statusText, { color: status.color }]}>
                          {status.label}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.quoteDetails}>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceLabel}>Price</Text>
                        <Text style={styles.priceValue}>LKR {quote.price}</Text>
                      </View>
                      <View style={styles.durationRow}>
                        <Ionicons name="time-outline" size={18} color="#6B7280" />
                        <Text style={styles.durationText}>
                          {quote.durationText || '1 day'}
                        </Text>
                      </View>
                      {quote.notes && (
                        <View style={styles.notesRow}>
                          <Ionicons name="document-text-outline" size={18} color="#6B7280" />
                          <Text style={styles.notesText}>{quote.notes}</Text>
                        </View>
                      )}
                    </View>

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
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginLeft: 12,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
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
    borderRadius: 10,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  requestHeaderText: {
    flex: 1,
  },
  requestCategory: {
    fontSize: 12,
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
  requestMetaContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
  },
  stepBreakdown: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#667eea',
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
    marginTop: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCount: {
    fontSize: 13,
    color: '#6B7280',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  emptyQuotesContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 30,
  },
  quoteCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInitial: {
    fontSize: 16,
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
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  quoteDetails: {
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  priceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 13,
    color: '#4B5563',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
    lineHeight: 18,
  },
  acceptButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  acceptGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  acceptButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});