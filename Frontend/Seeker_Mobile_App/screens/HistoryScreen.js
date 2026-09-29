import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  Alert,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -------------------- API Base URLs --------------------
const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:6000' : 'http://localhost:6000';

const COORDINATION_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5010' : 'http://localhost:5010';

export default function HistoryScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  // ---------- State ----------
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completedServices, setCompletedServices] = useState([]);
  const [pointsEarnedMap, setPointsEarnedMap] = useState({}); // bookingId -> points
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);
  const [feedbackMap, setFeedbackMap] = useState({}); // bookingId -> feedback

  // ---------- Helper: render stars ----------
  const renderStars = (rating) => {
    const stars = [];
    const numRating = Math.round(Number(rating) || 0);
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= numRating ? 'star' : 'star-outline'}
          size={14}
          color={i <= numRating ? '#FBBF24' : '#D1D5DB'}
        />
      );
    }
    return stars;
  };

  // ---------- Load reward points ----------
  const loadRewardPoints = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rewards/history?page=1&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) return;

      const transactions = data.transactions || [];
      const pointsMap = {};
      let total = 0;
      transactions.forEach((tx) => {
        if (tx.type === 'EARN' && tx.referenceId) {
          pointsMap[tx.referenceId] = tx.amount;
          total += tx.amount;
        }
      });
      setPointsEarnedMap(pointsMap);
      setTotalPointsEarned(total);
    } catch (error) {
      console.warn('Error loading reward points:', error);
    }
  };

  // ---------- Load user feedback ----------
  const loadUserFeedback = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.data)) {
        const map = {};
        data.data.forEach((fb) => {
          if (fb.bookingId) {
            map[fb.bookingId] = fb;
          }
        });
        setFeedbackMap(map);
      }
    } catch (error) {
      console.warn('Error loading user feedback:', error);
    }
  };

  // ---------- Main data fetch ----------
  const loadHistory = async (isPullToRefresh = false) => {
    if (!isPullToRefresh) setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // 1. Fetch completed bookings from ServiceCoordinationService
      const response = await fetch(`${COORDINATION_API_BASE_URL}/bookings/seeker/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load booking history');

      const rawBookings = data.data || [];
      const completed = rawBookings
        .filter((booking) => booking.bookingStatus === 'COMPLETED')
        .map((booking) => {
          // --- Provider Details from snapshot ---
          const providerName =
            booking.providerSnapshot?.name ||
            booking.providerSnapshot?.businessName ||
            booking.providerName ||
            'Service Provider';

          const businessName =
            booking.providerSnapshot?.businessName &&
            booking.providerSnapshot?.businessName !== providerName
              ? booking.providerSnapshot.businessName
              : null;

          const providerImage = booking.providerSnapshot?.profileImage || null;
          const providerDistrict =
            booking.providerSnapshot?.district || booking.location?.district || '';

          // --- Service / Post Details ---
          const category =
            booking.postId?.category ||
            booking.serviceCategory ||
            booking.category ||
            'General Service';

          const title =
            booking.postId?.title ||
            booking.serviceSubcategory ||
            booking.serviceSubCategory ||
            booking.subcategory ||
            `${category} Job`;

          const description =
            booking.postId?.description ||
            booking.description ||
            (booking.location?.address ? `Service Location: ${booking.location.address}` : null);

          // --- Location ---
          const location =
            booking.location?.address ||
            [booking.location?.city, booking.location?.district].filter(Boolean).join(', ') ||
            providerDistrict ||
            'Location on file';

          // --- Format Time ---
          const time =
            booking.startTime && booking.endTime
              ? `${booking.startTime} - ${booking.endTime}`
              : booking.endTime || booking.startTime || 'Completed';

          return {
            id: booking._id,
            bookingId: booking._id,
            title,
            category,
            description,
            provider: providerName,
            businessName,
            providerImage,
            providerDistrict,
            providerId: booking.providerId,
            location,
            date: booking.scheduledDate || 'Completed',
            time,
            duration: booking.estimatedDurationHours
              ? `${booking.estimatedDurationHours} hr(s)`
              : null,
            price: `Rs. ${booking.finalAmount || booking.amount || 0}`,
            rawAmount: Number(booking.finalAmount || booking.amount || 0),
          };
        });

      setCompletedServices(completed);

      // 2. Load rewards & feedback in parallel
      await Promise.all([loadRewardPoints(token), loadUserFeedback(token)]);
    } catch (error) {
      console.error('Error loading booking history:', error);
      Alert.alert('Error', error.message || 'Unable to load booking history.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHistory(true);
  }, []);

  // ---------- Navigate to write review ----------
  const handleWriteReview = (service) => {
    navigation.navigate('FeedbackScreen', {
      service: {
        id: service.id,
        title: service.title,
        provider: service.provider,
        date: service.date,
        image: service.providerImage,
      },
      bookingId: service.id,
      providerName: service.provider,
      providerId: service.providerId,
      serviceTitle: service.title,
      serviceId: service.id,
    });
  };

  // ---------- Rehire action ----------
  const handleRehire = (service) => {
    Alert.alert(
      'Rehire Service',
      `Would you like to hire ${service.provider} again for ${service.title}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => {
            navigation.navigate('BiddingScreen', {
              prefill: { title: service.title, category: service.category },
            });
          },
        },
      ]
    );
  };

  // ---------- Compute stats ----------
  const totalSpent = completedServices.reduce((sum, service) => sum + service.rawAmount, 0);

  // Compute average rating from reviews the user actually left
  const userRatings = Object.values(feedbackMap)
    .map((fb) => Number(fb?.rating))
    .filter((r) => !isNaN(r) && r > 0);

  const averageRating =
    userRatings.length > 0
      ? (userRatings.reduce((sum, r) => sum + r, 0) / userRatings.length).toFixed(1)
      : '5.0';

  // ---------- Loading state ----------
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service History</Text>
          <TouchableOpacity style={styles.pointsNavButton}>
            <Ionicons name="star" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading service history...
          </Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  // ---------- Main render ----------
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service History</Text>
        <TouchableOpacity
          style={styles.pointsNavButton}
          onPress={() => navigation.navigate('StarPoints')}
        >
          <Ionicons name="star" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards - More prominent and clear */}
      <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: isDarkMode ? '#2d3561' : '#667eea15' }]}>
            <Ionicons name="checkmark-done-circle" size={22} color="#667eea" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>{completedServices.length}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Completed</Text>
        </View>

        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />

        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: isDarkMode ? '#2d3561' : '#10B98115' }]}>
            <Ionicons name="cash-outline" size={22} color="#10B981" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>Rs. {totalSpent}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Total Spent</Text>
        </View>

        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />

    

        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />

        <View style={styles.statCard}>
          <View style={[styles.statIconWrapper, { backgroundColor: isDarkMode ? '#2d3561' : '#8B5CF615' }]}>
            <Ionicons name="trophy-outline" size={22} color="#8B5CF6" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>{totalPointsEarned}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Total Points</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Completed Jobs</Text>
        <TouchableOpacity onPress={() => navigation.navigate('StarPoints')}>
          <Text style={styles.seeAllText}>View Points</Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor={isDarkMode ? '#667eea' : '#667eea'}
          />
        }
      >
        {completedServices.map((service) => {
          const points = pointsEarnedMap[service.id] || 0;
          const feedback = feedbackMap[service.id];
          const hasReviewed = !!feedback;

          return (
            <View key={service.id} style={[styles.historyCard, isDarkMode && styles.historyCardDark]}>
              <LinearGradient
                colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#ffffff', '#f8f9fa']}
                style={styles.cardGradient}
              >
                {/* Top Row: Category & Price */}
                <View style={styles.cardHeader}>
                  <View style={styles.categoryContainer}>
                    <View
                      style={[
                        styles.categoryIcon,
                        { backgroundColor: isDarkMode ? '#2d3561' : '#667eea15' },
                      ]}
                    >
                      <Ionicons name="construct-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={[styles.serviceCategory, isDarkMode && styles.textDark]}>
                      {service.category}
                    </Text>
                    {service.duration && (
                      <View style={[styles.durationBadge, isDarkMode && styles.durationBadgeDark]}>
                        <Ionicons name="time-outline" size={12} color="#6B7280" />
                        <Text style={styles.durationText}>{service.duration}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.servicePrice}>{service.price}</Text>
                </View>

                {/* Service Title */}
                <Text style={[styles.serviceTitle, isDarkMode && styles.textDark]} numberOfLines={1}>
                  {service.title}
                </Text>

                {/* Service Description (snippet) */}
                {service.description && (
                  <Text
                    style={[styles.serviceDescription, isDarkMode && styles.textMutedDark]}
                    numberOfLines={2}
                  >
                    {service.description}
                  </Text>
                )}

                {/* Provider Info */}
                <View style={[styles.providerContainer, isDarkMode && styles.providerContainerDark]}>
                  {service.providerImage ? (
                    <Image source={{ uri: service.providerImage }} style={styles.providerAvatar} />
                  ) : (
                    <View style={styles.providerAvatarPlaceholder}>
                      <Ionicons name="person" size={18} color="#667eea" />
                    </View>
                  )}
                  <View style={styles.providerInfo}>
                    <Text style={[styles.serviceProvider, isDarkMode && styles.textDark]}>
                      {service.provider}
                    </Text>
                    {service.businessName && (
                      <Text style={[styles.providerBusiness, isDarkMode && styles.textMutedDark]}>
                        {service.businessName}
                      </Text>
                    )}
                  </View>
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-done" size={14} color="#10B981" />
                    <Text style={styles.completedBadgeText}>Done</Text>
                  </View>
                </View>

                {/* Date & Time */}
                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                      {service.date}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={[styles.metaText, isDarkMode && styles.textMutedDark]}>
                      {service.time}
                    </Text>
                  </View>
                </View>

                {/* Location */}
                {service.location && (
                  <View style={styles.locationContainer}>
                    <Ionicons name="location-outline" size={14} color="#6B7280" />
                    <Text
                      style={[styles.locationText, isDarkMode && styles.textMutedDark]}
                      numberOfLines={1}
                    >
                      {service.location}
                    </Text>
                  </View>
                )}

                {/* Points Earned */}
                {points > 0 && (
                  <View style={styles.pointsContainer}>
                    <Ionicons name="star" size={14} color="#FBBF24" />
                    <Text style={[styles.pointsText, isDarkMode && styles.textMutedDark]}>
                      +{points} points earned
                    </Text>
                  </View>
                )}

                {/* User Feedback Section */}
                {hasReviewed ? (
                  <View
                    style={[
                      styles.userFeedbackContainer,
                      isDarkMode && styles.userFeedbackContainerDark,
                    ]}
                  >
                    <View style={styles.userRating}>
                      <View style={styles.starsRow}>{renderStars(feedback.rating)}</View>
                      <Text style={[styles.userRatingText, isDarkMode && styles.textMutedDark]}>
                        {feedback.rating}/5
                      </Text>
                    </View>
                    {feedback.reviewText && (
                      <Text
                        style={[styles.userReview, isDarkMode && styles.textMutedDark]}
                        numberOfLines={2}
                      >
                        “{feedback.reviewText}”
                      </Text>
                    )}
                  </View>
                ) : (
                  <Text style={[styles.noReviewText, isDarkMode && styles.textMutedDark]}>
                    No review yet
                  </Text>
                )}

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {!hasReviewed ? (
                    <TouchableOpacity
                      style={[styles.reviewButton, isDarkMode && styles.reviewButtonDark]}
                      onPress={() => handleWriteReview(service)}
                    >
                      <Ionicons name="star-outline" size={18} color="#FBBF24" />
                      <Text style={styles.reviewButtonText}>Write Review</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.reviewedBadge, isDarkMode && styles.reviewedBadgeDark]}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.reviewedText}>Reviewed</Text>
                    </View>
                  )}
                
                </View>
              </LinearGradient>
            </View>
          );
        })}

        {completedServices.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, isDarkMode && styles.emptyIconDark]}>
              <Ionicons name="calendar-outline" size={50} color="#D1D5DB" />
            </View>
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
              No Completed Services
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              When your booked jobs are completed, they will appear here with reviews and details.
            </Text>
            <TouchableOpacity
              style={styles.exploreButton}
              onPress={() => navigation.navigate('Home')}
            >
              <LinearGradient
                colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
                style={styles.exploreGradient}
              >
                <Text style={styles.exploreButtonText}>Explore Services</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
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
  pointsNavButton: {
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
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statsContainerDark: {
    backgroundColor: '#16213e',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    minWidth: 50,
  },
  statIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  statDividerDark: {
    backgroundColor: '#2d3561',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  historyCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  historyCardDark: {
    backgroundColor: '#16213e',
  },
  cardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  serviceCategory: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  durationBadgeDark: {
    backgroundColor: '#2d3561',
  },
  durationText: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  servicePrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10B981',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  providerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
    marginBottom: 10,
  },
  providerContainerDark: {
    backgroundColor: '#242b4d',
  },
  providerAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 10,
  },
  providerAvatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#667eea20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  providerInfo: {
    flex: 1,
  },
  serviceProvider: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  providerBusiness: {
    fontSize: 12,
    color: '#6B7280',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
  },
  metaContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#6B7280',
    flex: 1,
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FBBF24',
  },
  userFeedbackContainer: {
    marginTop: 6,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  userFeedbackContainerDark: {
    borderTopColor: '#2d3561',
  },
  userRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  userRatingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  userReview: {
    fontSize: 13,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  noReviewText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  reviewButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FBBF24',
    backgroundColor: '#fff',
  },
  reviewButtonDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#FBBF24',
  },
  reviewButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FBBF24',
  },
  reviewedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#D1FAE5',
  },
  reviewedBadgeDark: {
    backgroundColor: '#064e3b',
  },
  reviewedText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },
  rehireButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#667eea',
  },
  rehireButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconDark: {
    backgroundColor: '#16213e',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  exploreGradient: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  exploreButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});