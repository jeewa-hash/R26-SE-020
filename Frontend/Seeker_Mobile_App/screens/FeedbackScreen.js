import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';
import { SEEKER_SERVICE_URL } from '../config';

const API_BASE_URL = SEEKER_SERVICE_URL;

export default function FeedbackScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const route = useRoute();
  const { service, providerName, serviceTitle, providerId, serviceId } = route.params || {
    service: {
      title: "Electrical Wiring",
      provider: "Apex Electrical",
      date: "Mar 15, 2024",
      image: "https://randomuser.me/api/portraits/men/1.jpg",
      id: "1"
    },
    providerName: "Apex Electrical",
    serviceTitle: "Electrical Wiring",
    providerId: "provider_123",
    serviceId: "service_123",
  };

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);

  const renderStars = () => {
    let stars = [];
    const currentRating = hoverRating || rating;
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <TouchableOpacity
          key={i}
          onPress={() => setRating(i)}
          onMouseEnter={() => setHoverRating(i)}
          onMouseLeave={() => setHoverRating(0)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={i <= currentRating ? "star" : "star-outline"}
            size={44}
            color={i <= currentRating ? "#FBBF24" : (isDarkMode ? "#4B5563" : "#D1D5DB")}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = () => {
    if (rating === 5) return "Excellent! 🌟";
    if (rating === 4) return "Good! 👍";
    if (rating === 3) return "Average 👌";
    if (rating === 2) return "Could be better 😕";
    if (rating === 1) return "Poor 😞";
    return "Tap to rate your experience";
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please grant permission to access your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  const uploadImages = async () => {
    const uploadedUrls = [];
    for (const imageUri of selectedImages) {
      const formData = new FormData();
      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'review_image.jpg',
      });
      
      try {
        const response = await fetch(`${API_BASE_URL}/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        const data = await response.json();
        if (data.url) {
          uploadedUrls.push(data.url);
        }
      } catch (error) {
        console.error('Image upload error:', error);
      }
    }
    return uploadedUrls;
  };

  const handleSubmitReview = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating for your experience");
      return;
    }
    
    if (reviewText.trim().length < 10) {
      Alert.alert("Review Too Short", "Please write at least 10 characters for your review");
      return;
    }
    
    setLoading(true);
    
    try {
      // Upload images first if any
      let imageUrls = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadImages();
      }
      
      // Submit review to backend
      const reviewData = {
        serviceId: serviceId || service?.id,
        providerId: providerId,
        providerName: providerName,
        serviceTitle: serviceTitle || service?.title,
        rating: rating,
        reviewText: reviewText.trim(),
        recommendation: recommendation,
        isAnonymous: isAnonymous,
        images: imageUrls,
        createdAt: new Date().toISOString(),
      };
      
      const response = await fetch(`${API_BASE_URL}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        Alert.alert(
          "Review Submitted!",
          "Thank you for your feedback. Your review has been posted.",
          [
            { 
              text: "OK",
              onPress: () => navigation.goBack()
            }
          ]
        );
      } else {
        Alert.alert("Error", data.error || "Failed to submit review. Please try again.");
      }
    } catch (error) {
      console.error('Submit review error:', error);
      Alert.alert("Error", "Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const getServiceData = () => {
    if (service && service.title) return service;
    return {
      title: serviceTitle || "Service",
      provider: providerName || "Provider",
      date: service?.date || "Recently",
      image: service?.image || "https://randomuser.me/api/portraits/men/1.jpg",
      id: service?.id || serviceId,
    };
  };

  const serviceData = getServiceData();

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
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* Service Info Card */}
        <LinearGradient
          colors={isDarkMode ? ['#16213e', '#1a1a2e'] : ['#ffffff', '#f8f9fa']}
          style={styles.serviceCard}
        >
          <Image source={{ uri: serviceData.image }} style={styles.serviceImage} />
          <View style={styles.serviceInfo}>
            <Text style={[styles.serviceTitle, isDarkMode && styles.textDark]}>{serviceData.title}</Text>
            <Text style={[styles.serviceProvider, isDarkMode && styles.textMutedDark]}>{serviceData.provider}</Text>
            <View style={styles.serviceDateContainer}>
              <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
              <Text style={[styles.serviceDate, isDarkMode && styles.textMutedDark]}>Completed on {serviceData.date}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Rating Section */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="star-outline" size={20} color="#FBBF24" />
            </View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Rate Your Experience</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDarkMode && styles.textMutedDark]}>How was your service with {serviceData.provider}?</Text>
          
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          
          <Text style={[styles.ratingText, isDarkMode && styles.textMutedDark]}>{getRatingText()}</Text>
        </View>

        {/* Review Text Section */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="create-outline" size={20} color="#667eea" />
            </View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Write Your Review</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDarkMode && styles.textMutedDark]}>Share your experience with others</Text>
          
          <TextInput
            style={[styles.reviewInput, isDarkMode && styles.inputDark]}
            multiline
            numberOfLines={6}
            placeholder="What did you like about this service? What could be improved?"
            placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
            value={reviewText}
            onChangeText={setReviewText}
            textAlignVertical="top"
          />
          
          <View style={styles.charContainer}>
            <Ionicons name="text-outline" size={14} color="#9CA3AF" />
            <Text style={[styles.charCount, isDarkMode && styles.textMutedDark]}>
              {reviewText.length}/500 characters
            </Text>
          </View>
        </View>

        {/* Quick Suggestions */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="bulb-outline" size={20} color="#F59E0B" />
            </View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Quick Suggestions</Text>
          </View>
          
          <View style={styles.suggestionsContainer}>
            <TouchableOpacity 
              style={[styles.suggestionChip, isDarkMode && styles.suggestionChipDark]}
              onPress={() => setReviewText(reviewText + " The service was professional and on time. ")}
            >
              <Text style={[styles.suggestionText, isDarkMode && styles.textDark]}>✅ Professional & on time</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.suggestionChip, isDarkMode && styles.suggestionChipDark]}
              onPress={() => setReviewText(reviewText + " Great communication and fair pricing. ")}
            >
              <Text style={[styles.suggestionText, isDarkMode && styles.textDark]}>💬 Great communication</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.suggestionChip, isDarkMode && styles.suggestionChipDark]}
              onPress={() => setReviewText(reviewText + " High quality work, would recommend! ")}
            >
              <Text style={[styles.suggestionText, isDarkMode && styles.textDark]}>⭐ High quality work</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.suggestionChip, isDarkMode && styles.suggestionChipDark]}
              onPress={() => setReviewText(reviewText + " Could improve response time. ")}
            >
              <Text style={[styles.suggestionText, isDarkMode && styles.textDark]}>⏱️ Improve response time</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Would You Recommend */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="people-outline" size={20} color="#10B981" />
            </View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Would You Recommend?</Text>
          </View>
          
          <View style={styles.recommendContainer}>
            <TouchableOpacity 
              style={[
                styles.recommendOption,
                recommendation === true && styles.recommendOptionActiveYes,
                isDarkMode && styles.recommendOptionDark
              ]}
              onPress={() => setRecommendation(true)}
            >
              <Ionicons 
                name="thumbs-up" 
                size={24} 
                color={recommendation === true ? "#fff" : "#10B981"} 
              />
              <Text style={[
                styles.recommendText,
                recommendation === true && styles.recommendTextActive,
                isDarkMode && styles.textDark
              ]}>Yes, I recommend</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.recommendOption,
                recommendation === false && styles.recommendOptionActiveNo,
                isDarkMode && styles.recommendOptionDark
              ]}
              onPress={() => setRecommendation(false)}
            >
              <Ionicons 
                name="thumbs-down" 
                size={24} 
                color={recommendation === false ? "#fff" : "#EF4444"} 
              />
              <Text style={[
                styles.recommendText,
                recommendation === false && styles.recommendTextActive,
                isDarkMode && styles.textDark
              ]}>No, I don't recommend</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Photo Upload Section */}
        <View style={[styles.section, isDarkMode && styles.sectionDark]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="camera-outline" size={20} color="#667eea" />
            </View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Add Photos (Optional)</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDarkMode && styles.textMutedDark]}>Share photos of the completed work</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            <TouchableOpacity style={[styles.addPhotoButton, isDarkMode && styles.addPhotoButtonDark]} onPress={pickImage}>
              <Ionicons name="camera" size={32} color="#667eea" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
            
            {selectedImages.map((uri, index) => (
              <View key={index} style={styles.photoPreview}>
                <Image source={{ uri }} style={styles.previewImage} />
                <TouchableOpacity 
                  style={styles.removePhotoBtn}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Anonymous Option */}
        <TouchableOpacity 
          style={[styles.anonymousContainer, isDarkMode && styles.anonymousContainerDark]}
          onPress={() => setIsAnonymous(!isAnonymous)}
          activeOpacity={0.7}
        >
          <View style={styles.checkbox}>
            {isAnonymous && <Ionicons name="checkmark" size={14} color="#667eea" />}
          </View>
          <View style={styles.anonymousContent}>
            <Text style={[styles.anonymousText, isDarkMode && styles.textDark]}>Post anonymously</Text>
            <Text style={[styles.anonymousSubtext, isDarkMode && styles.textMutedDark]}>Your name won't be shown publicly</Text>
          </View>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview} disabled={loading}>
          <LinearGradient
            colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Review</Text>
                <Ionicons name="send" size={20} color="#fff" />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Preview Section */}
        {reviewText.length > 10 && rating > 0 && !loading && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewTitle, isDarkMode && styles.textMutedDark]}>Preview your review</Text>
            <LinearGradient
              colors={isDarkMode ? ['#16213e', '#1a1a2e'] : ['#ffffff', '#f8f9fa']}
              style={styles.previewCard}
            >
              <View style={styles.previewHeader}>
                <Image 
                  source={{ uri: "https://i.pravatar.cc/150?img=7" }} 
                  style={styles.previewAvatar} 
                />
                <View>
                  <Text style={[styles.previewName, isDarkMode && styles.textDark]}>
                    {isAnonymous ? "Anonymous User" : "Tashmi Perera"}
                  </Text>
                  <View style={styles.previewStars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons 
                        key={i}
                        name={i < rating ? "star" : "star-outline"}
                        size={12}
                        color="#FBBF24"
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={[styles.previewText, isDarkMode && styles.textMutedDark]}>{reviewText}</Text>
              {recommendation !== null && (
                <View style={styles.previewRecommend}>
                  <Ionicons 
                    name={recommendation ? "thumbs-up" : "thumbs-down"} 
                    size={14} 
                    color={recommendation ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={[styles.previewRecommendText, isDarkMode && styles.textMutedDark]}>
                    {recommendation ? "Recommends this provider" : "Does not recommend this provider"}
                  </Text>
                </View>
              )}
            </LinearGradient>
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
  content: {
    paddingBottom: 100,
  },
  serviceCard: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 14,
  },
  serviceInfo: {
    flex: 1,
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
    marginBottom: 6,
  },
  serviceDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionDark: {
    backgroundColor: '#16213e',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 20,
    marginLeft: 42,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 20,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
  },
  reviewInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 140,
    lineHeight: 20,
  },
  inputDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
    color: '#fff',
  },
  charContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 10,
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  suggestionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  suggestionChipDark: {
    backgroundColor: '#1a1a2e',
  },
  suggestionText: {
    fontSize: 12,
    color: '#6B7280',
  },
  recommendContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  recommendOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  recommendOptionDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
  },
  recommendOptionActiveYes: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  recommendOptionActiveNo: {
    backgroundColor: '#EF4444',
    borderColor: '#EF4444',
  },
  recommendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  recommendTextActive: {
    color: '#fff',
  },
  photoScroll: {
    flexDirection: 'row',
  },
  addPhotoButton: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F9FAFB',
  },
  addPhotoButtonDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
  },
  addPhotoText: {
    fontSize: 10,
    color: '#667eea',
    marginTop: 6,
  },
  photoPreview: {
    position: 'relative',
    marginRight: 12,
  },
  previewImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  anonymousContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  anonymousContainerDark: {
    backgroundColor: '#16213e',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  anonymousContent: {
    flex: 1,
  },
  anonymousText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  anonymousSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  submitButton: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 10,
  },
  previewCard: {
    padding: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  previewStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 4,
  },
  previewText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 10,
  },
  previewRecommend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  previewRecommendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});