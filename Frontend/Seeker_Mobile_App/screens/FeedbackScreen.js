import PageHeader from '../components/PageHeader';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS, API_BASE_URL, ML_SERVICE_URL, COORDINATION_SERVICE_URL } from '../config';

const COORDINATION_API_BASE_URL = COORDINATION_SERVICE_URL;

export default function FeedbackScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  
  // ---- State ----
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [recommendation, setRecommendation] = useState(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  const [existingFeedback, setExistingFeedback] = useState(false);
  const [providerAvgRating, setProviderAvgRating] = useState(null);
  const [fetchingData, setFetchingData] = useState(false);

  // ---- Initialize or fetch jobs ----
  useEffect(() => {
    if (route.params?.bookingId) {
      setSelectedBooking({
        bookingId: route.params.bookingId,
        providerName: route.params.providerName || 'Provider',
        serviceTitle: route.params.serviceTitle || 'Service',
        providerId: route.params.providerId,
        serviceId: route.params.serviceId,
      });
    } else {
      const fetchCompletedJobs = async () => {
        setLoadingJobs(true);
        try {
          const token = await AsyncStorage.getItem('userToken');
          if (!token) return;
          const response = await fetch(`${COORDINATION_API_BASE_URL}/bookings/seeker/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          if (data.success && data.data) {
            const completed = data.data.filter(b => b.bookingStatus === 'COMPLETED');

            // Try to fetch actual names from Provider Service
            try {
               const providerUrl = `${ML_SERVICE_URL}/portfolio/all-providers`;
               const provRes = await fetch(providerUrl);
               const provData = await provRes.json();
               if (provData.success) {
                  const allProviders = provData.data || provData.providers || [];
                  const pMap = {};
                  allProviders.forEach(p => {
                      const pid = p.provider?.id || p.provider?._id || p._id || p.id;
                      if (pid) pMap[pid] = p.provider?.name || p.provider?.fullName || p.provider?.businessName || p.name || p.fullName;
                  });
                  completed.forEach(c => {
                      if (pMap[c.providerId]) c.actualFetchedName = pMap[c.providerId];
                  });
               }
            } catch (e) {
               console.warn("Could not fetch real provider names", e);
            }

            setCompletedJobs(completed);
          }
        } catch (error) {
          console.warn('Error fetching completed jobs:', error);
        } finally {
          setLoadingJobs(false);
        }
      };
      fetchCompletedJobs();
    }
  }, [route.params]);

  // ---- Fetch provider average rating & check existing feedback ----
  useEffect(() => {
    const fetchData = async () => {
      if (!selectedBooking?.bookingId || !selectedBooking?.providerId) {
        setFetchingData(false);
        return;
      }
      
      setFetchingData(true);
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setFetchingData(false);
          return;
        }

        // 1. Check if feedback already exists for this booking
        const checkRes = await fetch(`${API_BASE_URL}/feedback/booking/${selectedBooking.bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        if (checkData.success && checkData.hasReviewed) {
          setExistingFeedback(true);
          setFetchingData(false);
          return;
        } else {
          setExistingFeedback(false);
        }

        // 2. Fetch provider's average rating
        const avgRes = await fetch(`${API_BASE_URL}/feedback/provider/${selectedBooking.providerId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const avgData = await avgRes.json();
        if (avgData.success && avgData.count > 0) {
          const total = avgData.data.reduce((sum, f) => sum + f.rating, 0);
          const avg = (total / avgData.count).toFixed(1);
          setProviderAvgRating(avg);
        }
      } catch (error) {
        console.warn('Error fetching feedback data:', error);
      } finally {
        setFetchingData(false);
      }
    };

    if (selectedBooking) {
      fetchData();
    }
  }, [selectedBooking]);

  // ---- Submit feedback ----
  const handleSubmit = async () => {
    // Validations
    if (rating === 0) {
      Alert.alert('Missing Rating', 'Please select a rating (1-5 stars).');
      return;
    }
    if (reviewText.trim().length < 10) {
      Alert.alert('Review Too Short', 'Please write at least 10 characters.');
      return;
    }
    if (reviewText.trim().length > 500) {
      Alert.alert('Review Too Long', 'Please keep your review under 500 characters.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'Please log in again.');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookingId: selectedBooking.bookingId,
          rating,
          reviewText: reviewText.trim(),
          recommendation,
          isAnonymous,
          images: [], // you can add image upload later
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit feedback.');
      }

      Alert.alert(
        'Thank You!',
        'Your review has been submitted successfully.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not submit feedback.');
    } finally {
      setLoading(false);
    }
  };

  // ---- Render stars ----
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity key={i} onPress={() => setRating(i)}>
          <Ionicons
            name={i <= rating ? 'star' : 'star-outline'}
            size={36}
            color={i <= rating ? '#FBBF24' : '#D1D5DB'}
            style={styles.star}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  // ---- If not selected booking yet, show list of completed jobs ----
  if (!selectedBooking) {
    if (loadingJobs) {
      return (
        <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={[styles.loaderText, isDarkMode && styles.textDark]}>
              Loading completed jobs...
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />
        <PageHeader title={<>Select Job to Review</>} onBack={() => navigation.goBack()} />

        <ScrollView contentContainerStyle={styles.content}>
          {completedJobs.length === 0 ? (
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Ionicons name="document-text-outline" size={60} color="#D1D5DB" />
              <Text style={{ marginTop: 10, color: '#6B7280' }}>No completed jobs to review.</Text>
            </View>
          ) : (
            completedJobs.map(job => {
              let pName = job.providerSnapshot?.name;
              if (pName === 'Service Provider' || !pName) {
                pName = job.providerSnapshot?.businessName || job.providerName || job.providerSnapshot?.fullName || 'Service Provider';
              }
              const displayProviderName = job.actualFetchedName || job.providerSnapshot?.businessName || pName;
              
              return (
              <TouchableOpacity
                key={job._id}
                style={[styles.serviceCard, isDarkMode && styles.serviceCardDark, { marginBottom: 12 }]}
                onPress={() => setSelectedBooking({
                  bookingId: job._id,
                  providerName: displayProviderName,
                  serviceTitle: job.serviceSubcategory || job.serviceCategory || 'Service',
                  providerId: job.providerId,
                  serviceId: job._id,
                })}
              >
                <Text style={[styles.serviceTitle, isDarkMode && styles.textDark]}>
                  {job.serviceSubcategory || job.serviceCategory || 'Service'}
                </Text>
                <Text style={[styles.providerName, isDarkMode && styles.textMutedDark]}>
                  Provider: {displayProviderName}
                </Text>
                <Text style={[styles.charCount, isDarkMode && styles.textMutedDark, { textAlign: 'left', marginTop: 4 }]}>
                  {job.scheduledDate} {job.displayStartTime}
                </Text>
              </TouchableOpacity>
            )})
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---- If still fetching feedback status, show loader ----
  if (fetchingData) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={[styles.loaderText, isDarkMode && styles.textDark]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---- If already reviewed, show message ----
  if (existingFeedback) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <PageHeader title={<>Review</>} onBack={() => navigation.goBack()} />

        <View style={styles.alreadyReviewedContainer}>
          <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          <Text style={[styles.alreadyReviewedTitle, isDarkMode && styles.textDark]}>
            You already reviewed this booking
          </Text>
          <Text style={[styles.alreadyReviewedSub, isDarkMode && styles.textMutedDark]}>
            Thank you for your feedback!
          </Text>
          <TouchableOpacity
            style={styles.goBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.goBackText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ---- Main form ----
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      {/* Header */}
      <PageHeader title={<>Write a Review</>} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Service & Provider Info */}
        <View style={[styles.serviceCard, isDarkMode && styles.serviceCardDark]}>
          <Text style={[styles.serviceTitle, isDarkMode && styles.textDark]}>
            {selectedBooking.serviceTitle}
          </Text>
          <View style={styles.providerRow}>
            <Text style={[styles.providerName, isDarkMode && styles.textMutedDark]}>
              {selectedBooking.providerName}
            </Text>
            {providerAvgRating && (
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={16} color="#FBBF24" />
                <Text style={styles.ratingBadgeText}>{providerAvgRating}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Rating */}
        <View style={styles.ratingContainer}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Your Rating</Text>
          <View style={styles.starsContainer}>{renderStars()}</View>
          <Text style={[styles.ratingText, isDarkMode && styles.textMutedDark]}>
            {rating > 0 ? `${rating} star${rating > 1 ? 's' : ''}` : 'Tap a star to rate'}
          </Text>
        </View>

        {/* Review Text */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Your Review</Text>
          <TextInput
            style={[styles.textArea, isDarkMode && styles.textAreaDark]}
            placeholder="Share your experience (min 10 characters)"
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            value={reviewText}
            onChangeText={setReviewText}
          />
          <Text style={[styles.charCount, isDarkMode && styles.textMutedDark]}>
            {reviewText.length}/500
          </Text>
        </View>

        {/* Recommendation */}
        <View style={styles.inputGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>
            Would you recommend this provider?
          </Text>
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[
                styles.optionButton,
                recommendation === true && styles.optionSelected,
                isDarkMode && styles.optionButtonDark,
              ]}
              onPress={() => setRecommendation(true)}
            >
              <Text style={[styles.optionText, recommendation === true && styles.optionTextSelected]}>
                Yes
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                recommendation === false && styles.optionSelected,
                isDarkMode && styles.optionButtonDark,
              ]}
              onPress={() => setRecommendation(false)}
            >
              <Text style={[styles.optionText, recommendation === false && styles.optionTextSelected]}>
                No
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.optionButton,
                recommendation === null && styles.optionSelected,
                isDarkMode && styles.optionButtonDark,
              ]}
              onPress={() => setRecommendation(null)}
            >
              <Text style={[styles.optionText, recommendation === null && styles.optionTextSelected]}>
                Skip
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Anonymous toggle */}
        <TouchableOpacity
          style={styles.anonymousToggle}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <Ionicons
            name={isAnonymous ? 'checkbox' : 'square-outline'}
            size={24}
            color="#667eea"
          />
          <Text style={[styles.anonymousText, isDarkMode && styles.textDark]}>
            Post anonymously
          </Text>
        </TouchableOpacity>

        {/* Submit button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.submitText}>Submit Review</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---- Styles ----
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
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  serviceCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceCardDark: {
    backgroundColor: '#16213e',
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerName: {
    fontSize: 14,
    color: '#6B7280',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FBBF2410',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  ratingBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FBBF24',
    marginLeft: 4,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 8,
  },
  star: {
    marginHorizontal: 4,
  },
  ratingText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 24,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 120,
  },
  textAreaDark: {
    borderColor: '#2d3561',
    backgroundColor: '#16213e',
    color: '#fff',
  },
  charCount: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
  },
  optionButtonDark: {
    borderColor: '#2d3561',
    backgroundColor: '#16213e',
  },
  optionSelected: {
    borderColor: '#667eea',
    backgroundColor: '#667eea10',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  optionTextSelected: {
    color: '#667eea',
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  anonymousText: {
    fontSize: 16,
    color: '#1F2937',
  },
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
  // Already reviewed screen
  alreadyReviewedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  alreadyReviewedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    textAlign: 'center',
  },
  alreadyReviewedSub: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  goBackButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 32,
    backgroundColor: '#667eea',
    borderRadius: 12,
  },
  goBackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
});
