import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, StatusBar, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:6000'
  : 'http://localhost:6000';

const COORDINATION_API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:5010'
  : 'http://localhost:5010';

export default function HistoryScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [reviewsSubmitted, setReviewsSubmitted] = useState({});
  const [loading, setLoading] = useState(true);
  const [completedServices, setCompletedServices] = useState([]);
  const [pointsEarnedMap, setPointsEarnedMap] = useState({}); // bookingId -> points
  const [totalPointsEarned, setTotalPointsEarned] = useState(0);

  // Check if service has been reviewed
  const checkServiceReviewStatus = async (bookingId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/feedback/booking/${bookingId}`);
      const data = await response.json();
      return data.hasReviewed || false;
    } catch (error) {
      console.error('Error checking review status:', error);
      return false;
    }
  };

  // Load reward transactions and map points to booking IDs
  const loadRewardPoints = async (token) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/rewards/history?page=1&limit=500`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load reward history');

      const transactions = data.transactions || [];
      const pointsMap = {};
      let total = 0;
      transactions.forEach(tx => {
        if (tx.type === 'EARN' && tx.referenceId) {
          pointsMap[tx.referenceId] = tx.amount;
          total += tx.amount;
        }
      });
      setPointsEarnedMap(pointsMap);
      setTotalPointsEarned(total);
    } catch (error) {
      console.error('Error loading reward points:', error);
      // non-critical, we can still show bookings without points
    }
  };

  // Load review status for all services
  useEffect(() => {
    loadReviewStatuses();
  }, []);

  const loadReviewStatuses = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      // Fetch completed bookings
      const response = await fetch(`${COORDINATION_API_BASE_URL}/bookings/seeker/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to load booking history');

      const completed = (data.data || [])
        .filter((booking) => booking.bookingStatus === 'COMPLETED')
        .map((booking) => ({
          id: booking._id,
          title: 'Completed Service',
          provider: 'Service Provider',
          providerId: booking.providerId,
          providerImage: 'https://randomuser.me/api/portraits/lego/1.jpg',
          date: booking.scheduledDate,
          time: booking.endTime,
          price: `$${booking.finalAmount || 0}`,
          rating: 0,
          category: 'Service',
        }));
      setCompletedServices(completed);

      // Fetch reward points
      await loadRewardPoints(token);

      // Fetch review statuses
      const statuses = {};
      for (const service of completed) {
        statuses[service.id] = await checkServiceReviewStatus(service.id);
      }
      setReviewsSubmitted(statuses);
    } catch (error) {
      console.error('Error loading booking history:', error);
      Alert.alert('Error', error.message || 'Unable to load booking history.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    let stars = [];
    for (let i = 1; i <= rating; i++) {
      stars.push(<Ionicons key={i} name="star" size={14} color="#FBBF24" />);
    }
    for (let i = rating; i < 5; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FBBF24" />);
    }
    return stars;
  };

  const handleWriteReview = (service) => {
    navigation.navigate('FeedbackScreen', { 
      service: service,
      providerName: service.provider,
      providerId: service.providerId,
      serviceTitle: service.title,
      serviceId: service.id,
      bookingId: service.id,
    });
  };

  const handleRehire = (service) => {
    Alert.alert(
      "Rehire Service",
      `Would you like to hire ${service.provider} again?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Yes", onPress: () => {
          navigation.navigate('BiddingScreen', { 
            prefill: { title: service.title, category: service.category }
          });
        }}
      ]
    );
  };

  // Calculate stats
  const totalSpent = completedServices.reduce((sum, service) => {
    return sum + parseInt(service.price.replace('$', ''));
  }, 0);
  const averageRating = completedServices.length > 0 
    ? (completedServices.reduce((sum, service) => sum + service.rating, 0) / completedServices.length).toFixed(1)
    : '0';

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar 
          barStyle={isDarkMode ? "light-content" : "dark-content"} 
          backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
        />
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
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>Loading history...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
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
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards (added total points earned) */}
      <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: isDarkMode ? '#2d3561' : '#667eea15' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#667eea" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>{completedServices.length}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Completed</Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: isDarkMode ? '#2d3561' : '#10B98115' }]}>
            <Ionicons name="cash-outline" size={20} color="#10B981" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>${totalSpent}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Total Spent</Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: isDarkMode ? '#2d3561' : '#FBBF2415' }]}>
            <Ionicons name="star" size={20} color="#FBBF24" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>{averageRating}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Avg Rating</Text>
        </View>
        {/* NEW: Total Points Earned */}
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: isDarkMode ? '#2d3561' : '#8B5CF615' }]}>
            <Ionicons name="trophy-outline" size={20} color="#8B5CF6" />
          </View>
          <Text style={[styles.statNumber, isDarkMode && styles.textDark]}>{totalPointsEarned}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Total Points</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Past Services</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* History List */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {completedServices.map((service) => {
          const points = pointsEarnedMap[service.id] || 0;
          return (
            <View key={service.id} style={[styles.historyCard, isDarkMode && styles.historyCardDark]}>
              <LinearGradient
                colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#ffffff', '#f8f9fa']}
                style={styles.cardGradient}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.categoryContainer}>
                    <View style={[styles.categoryIcon, { backgroundColor: isDarkMode ? '#2d3561' : '#667eea15' }]}>
                      <Ionicons name="briefcase-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={[styles.serviceCategory, isDarkMode && styles.textDark]}>{service.category}</Text>
                  </View>
                  <Text style={styles.servicePrice}>{service.price}</Text>
                </View>

                {/* Title & Provider */}
                <Text style={[styles.serviceTitle, isDarkMode && styles.textDark]}>{service.title}</Text>
                <Text style={[styles.serviceProvider, isDarkMode && styles.textMutedDark]}>{service.provider}</Text>

                {/* Date & Time */}
                <View style={styles.dateContainer}>
                  <View style={styles.dateItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>{service.date}</Text>
                  </View>
                  <View style={styles.dateItem}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={[styles.dateText, isDarkMode && styles.textMutedDark]}>{service.time}</Text>
                  </View>
                </View>

                {/* Points Earned (new) */}
                <View style={styles.pointsContainer}>
                  <Ionicons name="star" size={14} color="#FBBF24" />
                  <Text style={[styles.pointsText, isDarkMode && styles.textMutedDark]}>
                    Earned: {points} points
                  </Text>
                </View>

                {/* Rating */}
                <View style={[styles.ratingContainer, isDarkMode && styles.ratingContainerDark]}>
                  <View style={styles.starsContainer}>{renderStars(service.rating)}</View>
                  <Text style={[styles.ratingText, isDarkMode && styles.textMutedDark]}>{service.rating}/5</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  {!reviewsSubmitted[service.id] ? (
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
                  <TouchableOpacity 
                    style={styles.rehireButton}
                    onPress={() => handleRehire(service)}
                  >
                    <Ionicons name="refresh-outline" size={18} color="#fff" />
                    <Text style={styles.rehireButtonText}>Rehire</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          );
        })}

        {/* Empty State */}
        {completedServices.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, isDarkMode && styles.emptyIconDark]}>
              <Ionicons name="calendar-outline" size={50} color="#D1D5DB" />
            </View>
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>No Service History</Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>Your completed services will appear here</Text>
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
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
    flexWrap: 'wrap',
  },
  statsContainerDark: {
    backgroundColor: '#16213e',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    minWidth: 50,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
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
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
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
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
    fontWeight: '600',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667eea',
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  serviceProvider: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  dateContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
  },
  pointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  pointsText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FBBF24',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  ratingContainerDark: {
    borderTopColor: '#2d3561',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 11,
    color: '#6B7280',
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
    fontWeight: '500',
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
    fontWeight: '500',
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
    fontWeight: '500',
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
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
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