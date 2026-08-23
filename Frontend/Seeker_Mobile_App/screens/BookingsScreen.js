// screens/BookingsScreen.js

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = `http://${IP_ADDRESS}:6000`;
const PROVIDER_SERVICE_URL = `http://${IP_ADDRESS}:5000/portfolio/all-providers`;

export default function BookingsScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [providersMap, setProvidersMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Stats
  const [totalBookings, setTotalBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [upcomingBookings, setUpcomingBookings] = useState(0);

  // Fetch all providers
  const fetchProviders = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(PROVIDER_SERVICE_URL, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) {
        console.warn('Failed to fetch providers');
        return {};
      }
      const data = await response.json();
      if (data.success && data.providers) {
        const map = {};
        data.providers.forEach((item) => {
          const provider = item.provider || {};
          if (provider.id) {
            map[provider.id] = {
              ...provider,
              portfolio: item.portfolio || {},
            };
          }
        });
        return map;
      }
      return {};
    } catch (err) {
      console.warn('Error fetching providers:', err);
      return {};
    }
  }, []);

  // Fetch bookings from API
  const fetchBookings = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('userToken');
      const userId = await AsyncStorage.getItem('userId');

      if (!token || !userId) {
        setError('Please log in to view your bookings.');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/request-quotations/seeker/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch bookings: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.requests) {
        const sorted = data.requests.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
        setBookings(sorted);

        const total = sorted.length;
        const completed = sorted.filter((b) => b.status === 'confirmed').length;
        const upcoming = sorted.filter((b) => b.status === 'pending').length;

        setTotalBookings(total);
        setCompletedBookings(completed);
        setUpcomingBookings(upcoming);

        // Fetch providers after getting bookings
        const providerMap = await fetchProviders();
        setProvidersMap(providerMap);
      } else {
        setError(data.message || 'Failed to load bookings.');
      }
    } catch (err) {
      console.error('BOOKINGS FETCH ERROR:', err);
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchProviders]);

  // Initial load
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // Helper: format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  };

  // Helper: format time
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get status style
  const getStatusStyle = (status) => {
    switch (status) {
      case 'confirmed':
        return { bg: '#D1FAE5', color: '#10B981', icon: 'checkmark-circle', text: 'Confirmed' };
      case 'pending':
        return { bg: '#FEF3C7', color: '#F59E0B', icon: 'time-outline', text: 'Pending' };
      case 'cancelled':
        return { bg: '#FEE2E2', color: '#EF4444', icon: 'close-circle', text: 'Cancelled' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', icon: 'help-circle-outline', text: status };
    }
  };

  // Build title from request data
  const getBookingTitle = (request) => {
    const category = request.detectedCategory || 'Service';
    const object = request.detectedObject || '';
    return object ? `${category} - ${object}` : category;
  };

  // Get provider details from map
  const getProvider = (providerId) => {
    return providersMap[providerId] || null;
  };

  // Get provider name
  const getProviderName = (providerId) => {
    const provider = getProvider(providerId);
    return provider?.name || `Provider #${providerId?.slice(-4) || 'Unknown'}`;
  };

  // Get provider profile image
  const getProviderImage = (providerId) => {
    const provider = getProvider(providerId);
    if (provider?.profileImage) {
      const normalized = provider.profileImage.replace(/\\/g, '/');
      if (normalized.startsWith('http')) return normalized;
      return `http://${IP_ADDRESS}:5000/${normalized}`;
    }
    const hash = providerId ? parseInt(providerId.slice(-2), 16) || 1 : 1;
    return `https://i.pravatar.cc/150?img=${hash % 70 + 1}`;
  };

  // ==========================================================
  // NAVIGATION HANDLERS (FIXED)
  // ==========================================================

  const handleMessage = (booking) => {
    navigation.navigate('ChatScreen', {
      providerId: booking.providerId,
      bookingId: booking._id,
      title: getBookingTitle(booking),
    });
  };

  const handleReschedule = (booking) => {
    navigation.navigate('RescheduleScreen', { booking });
  };

  // 🔥 FIXED: Navigate to ProviderProfile (not ProviderProfileScreen)
  const handleViewDetails = (booking) => {
    const provider = getProvider(booking.providerId);
    if (!provider) {
      Alert.alert('Error', 'Provider information not found.');
      return;
    }

    // Build providerItem exactly like ProvidersScreen does
    const providerItem = {
      provider: provider,
      portfolio: provider.portfolio || {},
      match: {
        category_match: true,
        district_match: true,
        priority: 'HIGH',
      },
    };

    navigation.navigate('ProviderProfile', {
      providerItem: providerItem,
      finalDecision: null, // no summary available here
    });
  };

  // Navigate to quotations for this request
  const handleViewQuotes = (booking) => {
    navigation.navigate('RequestQuotationDetails', {
      requestId: booking._id,
      request: booking,
      providerId: booking.providerId,
    });
  };

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />

      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{totalBookings}</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{completedBookings}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{upcomingBookings}</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Requests</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#667eea" />
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No bookings yet</Text>
            <Text style={styles.emptyText}>
              Your bookings will appear here once you request a service.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const status = getStatusStyle(booking.status);
            const title = getBookingTitle(booking);
            const providerName = getProviderName(booking.providerId);
            const providerImage = getProviderImage(booking.providerId);
            const date = formatDate(booking.createdAt);
            const time = formatTime(booking.createdAt);

            return (
              <TouchableOpacity
                key={booking._id}
                style={styles.bookingCard}
                activeOpacity={0.9}
                onPress={() => handleViewDetails(booking)}
              >
                <LinearGradient
                  colors={['#ffffff', '#f8f9fa']}
                  style={styles.cardGradient}
                >
                  <View style={styles.cardHeader}>
                    <Image source={{ uri: providerImage }} style={styles.bookingImage} />
                    <View style={styles.bookingInfo}>
                      <Text style={styles.bookingTitle}>{title}</Text>
                      <View style={styles.providerRow}>
                        <Ionicons name="person-outline" size={14} color="#6B7280" />
                        <Text style={styles.bookingProvider}>{providerName}</Text>
                      </View>
                      <View style={styles.providerRow}>
                        <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                        <Text style={styles.bookingProvider}>{date} at {time}</Text>
                      </View>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Ionicons name={status.icon} size={14} color={status.color} />
                      <Text style={[styles.statusText, { color: status.color }]}>
                        {status.text}
                      </Text>
                    </View>
                  </View>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.messageBtn]}
                      onPress={() => handleMessage(booking)}
                    >
                      <Ionicons name="chatbubble-outline" size={18} color="#667eea" />
                      <Text style={styles.messageBtnText}>Message</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.rescheduleBtn]}
                      onPress={() => handleReschedule(booking)}
                    >
                      <Ionicons name="calendar-outline" size={18} color="#fff" />
                      <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionBtn, styles.viewQuoteBtn]}
                      onPress={() => handleViewQuotes(booking)}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#8B5CF6" />
                      <Text style={styles.viewQuoteBtnText}>View Quote</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <BottomNav />
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  bookingCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bookingImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#667eea',
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  bookingProvider: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 5,
  },
  messageBtn: {
    backgroundColor: '#F3F4F6',
  },
  messageBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#667eea',
  },
  rescheduleBtn: {
    backgroundColor: '#667eea',
  },
  rescheduleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  viewQuoteBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  viewQuoteBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 10,
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
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
});