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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

export default function FeedbackScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { service } = route.params || {
    title: "Electrical Wiring",
    provider: "Apex Electrical",
    date: "Mar 15, 2024",
    image: "https://randomuser.me/api/portraits/men/1.jpg",
  };

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

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
        >
          <Ionicons
            name={i <= currentRating ? "star" : "star-outline"}
            size={40}
            color={i <= currentRating ? "#FBBF24" : "#D1D5DB"}
          />
        </TouchableOpacity>
      );
    }
    return stars;
  };

  const getRatingText = () => {
    if (rating === 5) return "Excellent! 🌟";
    if (rating === 4) return "Very Good! 😊";
    if (rating === 3) return "Good 👍";
    if (rating === 2) return "Fair 😐";
    if (rating === 1) return "Poor 😞";
    return "Tap to rate";
  };

  const handleSubmitReview = () => {
    if (rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }
    
    if (reviewText.trim().length < 10) {
      Alert.alert("Error", "Please write at least 10 characters");
      return;
    }
    
    Alert.alert(
      "Review Submitted",
      "Thank you for your feedback! Your review has been posted.",
      [
        { 
          text: "OK", 
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write a Review</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Service Info Card */}
        <View style={styles.serviceCard}>
          <Image source={{ uri: service.image }} style={styles.serviceImage} />
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceTitle}>{service.title}</Text>
            <Text style={styles.serviceProvider}>{service.provider}</Text>
            <Text style={styles.serviceDate}>Completed on {service.date}</Text>
          </View>
        </View>

        {/* Rating Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Rating</Text>
          <Text style={styles.sectionSubtitle}>How was your experience?</Text>
          
          <View style={styles.starsContainer}>
            {renderStars()}
          </View>
          
          <Text style={styles.ratingText}>{getRatingText()}</Text>
        </View>

        {/* Review Text Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Write Your Review</Text>
          <Text style={styles.sectionSubtitle}>Share your experience with others</Text>
          
          <TextInput
            style={styles.reviewInput}
            multiline
            numberOfLines={6}
            placeholder="What did you like or dislike? Would you recommend this provider?"
            placeholderTextColor="#9CA3AF"
            value={reviewText}
            onChangeText={setReviewText}
            textAlignVertical="top"
          />
          
          <Text style={styles.charCount}>
            {reviewText.length}/500 characters
          </Text>
        </View>

        {/* Quick Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Suggestions</Text>
          <View style={styles.suggestionsContainer}>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setReviewText(reviewText + " Professional and punctual service. ")}
            >
              <Text style={styles.suggestionText}>Professional & punctual</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setReviewText(reviewText + " Great value for money. ")}
            >
              <Text style={styles.suggestionText}>Great value for money</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setReviewText(reviewText + " Excellent communication. ")}
            >
              <Text style={styles.suggestionText}>Excellent communication</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.suggestionChip}
              onPress={() => setReviewText(reviewText + " Would definitely hire again. ")}
            >
              <Text style={styles.suggestionText}>Would hire again</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Would You Recommend */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Would you recommend this provider?</Text>
          
          <View style={styles.recommendContainer}>
            <TouchableOpacity 
              style={[
                styles.recommendOption,
                recommendation === true && styles.recommendOptionActive
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
                recommendation === true && styles.recommendTextActive
              ]}>Yes</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.recommendOption,
                recommendation === false && styles.recommendOptionActive
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
                recommendation === false && styles.recommendTextActive
              ]}>No</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Anonymous Option */}
        <TouchableOpacity 
          style={styles.anonymousContainer}
          onPress={() => setIsAnonymous(!isAnonymous)}
        >
          <View style={styles.checkbox}>
            {isAnonymous && <Ionicons name="checkmark" size={16} color="#667eea" />}
          </View>
          <Text style={styles.anonymousText}>Post anonymously</Text>
          <Text style={styles.anonymousSubtext}>Your name won't be shown publicly</Text>
        </TouchableOpacity>

        {/* Photo Upload Option */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Photos (Optional)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoScroll}>
            <TouchableOpacity style={styles.addPhotoButton}>
              <Ionicons name="camera" size={32} color="#667eea" />
              <Text style={styles.addPhotoText}>Add Photo</Text>
            </TouchableOpacity>
            <View style={styles.photoExample}>
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1585704032916-cf2ac0922b1b?w=100" }} 
                style={styles.examplePhoto} 
              />
            </View>
            <View style={styles.photoExample}>
              <Image 
                source={{ uri: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=100" }} 
                style={styles.examplePhoto} 
              />
            </View>
          </ScrollView>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmitReview}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Text style={styles.submitButtonText}>Submit Review</Text>
            <Ionicons name="send" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        {/* Preview Section */}
        {reviewText.length > 0 && rating > 0 && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <Image source={{ uri: "https://i.pravatar.cc/150?img=7" }} style={styles.previewAvatar} />
                <View>
                  <Text style={styles.previewName}>
                    {isAnonymous ? "Anonymous User" : "Tashmi Perera"}
                  </Text>
                  <View style={styles.previewStars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons 
                        key={i}
                        name={i < rating ? "star" : "star-outline"}
                        size={14}
                        color="#FBBF24"
                      />
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.previewText}>{reviewText}</Text>
              {recommendation !== null && (
                <View style={styles.previewRecommend}>
                  <Ionicons 
                    name={recommendation ? "thumbs-up" : "thumbs-down"} 
                    size={16} 
                    color={recommendation ? "#10B981" : "#EF4444"} 
                  />
                  <Text style={styles.previewRecommendText}>
                    {recommendation ? "Recommends this provider" : "Does not recommend this provider"}
                  </Text>
                </View>
              )}
            </View>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  serviceCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  serviceImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
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
    marginBottom: 2,
  },
  serviceDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  ratingText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  reviewInput: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: '#1F2937',
    minHeight: 120,
  },
  charCount: {
    textAlign: 'right',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
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
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#fff',
  },
  recommendOptionActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  recommendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  recommendTextActive: {
    color: '#fff',
  },
  anonymousContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  anonymousText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginRight: 8,
  },
  anonymousSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addPhotoText: {
    fontSize: 10,
    color: '#667eea',
    marginTop: 4,
  },
  photoExample: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
    overflow: 'hidden',
  },
  examplePhoto: {
    width: '100%',
    height: '100%',
  },
  submitButton: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  previewSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  previewCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
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
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  previewName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  previewStars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  previewText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  previewRecommend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  previewRecommendText: {
    fontSize: 12,
    color: '#6B7280',
  },
});