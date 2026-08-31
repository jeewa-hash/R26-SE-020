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

// Replace with your actual machine IP if testing on a real device
const API_BASE_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:6000'
  : 'http://localhost:6000';

export default function FeedbackScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const {
    bookingId,
    providerName = 'Provider',
    serviceTitle = 'Service',
    providerId,
    serviceId,
  } = route.params || {};

  // ---- State ----
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [recommendation, setRecommendation] = useState(null); // true / false / null
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(false);

  // For existing feedback check & provider average
  const [existingFeedback, setExistingFeedback] = useState(false);
  const [providerAvgRating, setProviderAvgRating] = useState(null);
  const [fetchingData, setFetchingData] = useState(true);

  // ---- Fetch provider average rating & check existing feedback ----
  useEffect(() => {
    const fetchData = async () => {
      if (!bookingId || !providerId) {
        setFetchingData(false);
        return;
      }

      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          setFetchingData(false);
          return;
        }

        // 1. Check if feedback already exists for this booking
        const checkRes = await fetch(`${API_BASE_URL}/feedback/booking/${bookingId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const checkData = await checkRes.json();
        if (checkData.success && checkData.hasReviewed) {
          setExistingFeedback(true);
          setFetchingData(false);
          return; // No need to fetch provider rating if already reviewed
        }

        // 2. Fetch provider's average rating (optional)
        const avgRes = await fetch(`${API_BASE_URL}/feedback/provider/${providerId}`, {
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

    fetchData();
  }, [bookingId, providerId]);

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
          bookingId,
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

  // ---- If still fetching, show loader ----
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
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Review</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>

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
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Service & Provider Info */}
        <View style={[styles.serviceCard, isDarkMode && styles.serviceCardDark]}>
          <Text style={[styles.serviceTitle, isDarkMode && styles.textDark]}>
            {serviceTitle}
          </Text>
          <View style={styles.providerRow}>
            <Text style={[styles.providerName, isDarkMode && styles.textMutedDark]}>
              {providerName}
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