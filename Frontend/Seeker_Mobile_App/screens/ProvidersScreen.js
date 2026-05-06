// screens/ProvidersScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProvidersScreen({ route, navigation }) {
  // Get the data passed from FollowUpScreen
  const { userAnswers, finalDecision, initialMessage } = route.params || {};
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quotationModalVisible, setQuotationModalVisible] = useState(false);
  const [quotationDetails, setQuotationDetails] = useState('');

  // Sample providers data with profile images
  const providers = [
    {
      id: 1,
      name: "Sarah's Cleaning Service",
      rating: 4.9,
      reviews: 128,
      price: "$30/visit",
      experience: "8 years",
      distance: "2.5 km away",
      available: true,
      image: "https://randomuser.me/api/portraits/women/1.jpg",
      responseTime: "~5 min",
      verified: true,
      phone: "+1 234-567-8901",
      email: "sarah@cleaning.com",
    },
    {
      id: 2,
      name: "Professional Cleaners Co.",
      rating: 4.8,
      reviews: 95,
      price: "$35/visit",
      experience: "12 years",
      distance: "3.8 km away",
      available: true,
      image: "https://randomuser.me/api/portraits/men/2.jpg",
      responseTime: "~3 min",
      verified: true,
      phone: "+1 234-567-8902",
      email: "info@professionalcleaners.com",
    },
    {
      id: 3,
      name: "Eco-Friendly Cleaning",
      rating: 4.7,
      reviews: 67,
      price: "$28/visit",
      experience: "5 years",
      distance: "4.2 km away",
      available: false,
      image: "https://randomuser.me/api/portraits/women/3.jpg",
      responseTime: "~10 min",
      verified: false,
      phone: "+1 234-567-8903",
      email: "eco@green.com",
    },
    {
      id: 4,
      name: "MaidPro Services",
      rating: 4.9,
      reviews: 203,
      price: "$32/visit",
      experience: "15 years",
      distance: "1.8 km away",
      available: true,
      image: "https://randomuser.me/api/portraits/men/4.jpg",
      responseTime: "~2 min",
      verified: true,
      phone: "+1 234-567-8904",
      email: "contact@maidpro.com",
    },
  ];

  const handleViewProfile = (provider) => {
    Alert.alert(
      "Provider Profile",
      `${provider.name}\n\n⭐ Rating: ${provider.rating} (${provider.reviews} reviews)\n💰 Price: ${provider.price}\n📅 Experience: ${provider.experience}\n📍 Distance: ${provider.distance}\n⏱️ Response: ${provider.responseTime}\n📧 Email: ${provider.email}\n📞 Phone: ${provider.phone}`,
      [{ text: "Close" }]
    );
  };

  const handleRequestQuotation = () => {
    if (!quotationDetails.trim()) {
      Alert.alert("Error", "Please enter your requirements");
      return;
    }
    
    Alert.alert(
      "Quotation Request Sent",
      `Your quotation request has been sent to ${selectedProvider.name}`,
      [
        { 
          text: "OK", 
          onPress: () => {
            setQuotationModalVisible(false);
            setQuotationDetails('');
          }
        }
      ]
    );
  };

  const handleChat = (provider) => {
    Alert.alert(
      "Start Chat",
      `Start a conversation with ${provider.name}`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Start Chat", onPress: () => Alert.alert("Chat", `Chat with ${provider.name} started!`) }
      ]
    );
  };

  const renderStars = (rating) => {
    let stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Ionicons
          key={i}
          name={i <= rating ? "star" : "star-outline"}
          size={14}
          color="#FBBF24"
        />
      );
    }
    return stars;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header - Only back button and filter */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={24} color="#6366F1" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Results Count */}
        <Text style={styles.resultsCount}>
          {providers.filter(p => p.available).length} providers available
        </Text>

        {/* Providers List */}
        {providers.map((provider) => (
          <View key={provider.id} style={styles.providerCard}>
            <View style={styles.providerHeader}>
              <View style={styles.profileSection}>
                <Image 
                  source={{ uri: provider.image }} 
                  style={styles.profileImage}
                />
                <View style={styles.providerInfo}>
                  <View style={styles.nameRow}>
                    <Text style={styles.providerName}>{provider.name}</Text>
                    {provider.verified && (
                      <Ionicons name="checkmark-circle" size={16} color="#6366F1" />
                    )}
                  </View>
                  <View style={styles.ratingContainer}>
                    {renderStars(provider.rating)}
                    <Text style={styles.ratingText}>{provider.rating}</Text>
                    <Text style={styles.reviewsText}>({provider.reviews} reviews)</Text>
                  </View>
                  <View style={styles.responseTime}>
                    <Ionicons name="time-outline" size={12} color="#6B7280" />
                    <Text style={styles.responseTimeText}>Responds in {provider.responseTime}</Text>
                  </View>
                </View>
              </View>
              {provider.available && (
                <View style={styles.availableBadge}>
                  <Text style={styles.availableText}>Available</Text>
                </View>
              )}
            </View>

            <View style={styles.providerDetails}>
              <View style={styles.detailItem}>
                <Ionicons name="cash-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{provider.price}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="briefcase-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{provider.experience}</Text>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="location-outline" size={16} color="#6B7280" />
                <Text style={styles.detailText}>{provider.distance}</Text>
              </View>
            </View>

            {/* Beautiful Button Design */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => handleViewProfile(provider)}
              >
                <View style={styles.buttonIcon}>
                  <Ionicons name="person-outline" size={18} color="#6366F1" />
                </View>
                <Text style={styles.profileButtonText}>Profile</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.quotationButton}
                onPress={() => {
                  setSelectedProvider(provider);
                  setQuotationModalVisible(true);
                }}
              >
                <View style={styles.buttonIcon}>
                  <Ionicons name="document-text-outline" size={18} color="#6366F1" />
                </View>
                <Text style={styles.quotationButtonText}>Get Quote</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.chatButton}
                onPress={() => handleChat(provider)}
              >
                <View style={styles.buttonIcon}>
                  <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                </View>
                <Text style={styles.chatButtonText}>Chat</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Request Quotation Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={quotationModalVisible}
        onRequestClose={() => setQuotationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Quotation</Text>
              <TouchableOpacity onPress={() => setQuotationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalLabel}>Tell us about your requirements:</Text>
              <TextInput
                style={styles.quotationInput}
                multiline
                numberOfLines={6}
                placeholder="Describe what you need..."
                placeholderTextColor="#9CA3AF"
                value={quotationDetails}
                onChangeText={setQuotationDetails}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelModalButton}
                  onPress={() => setQuotationModalVisible(false)}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.sendModalButton}
                  onPress={handleRequestQuotation}
                >
                  <Ionicons name="send" size={18} color="#fff" />
                  <Text style={styles.sendModalText}>Send Request</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 4,
  },
  filterButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  resultsCount: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    marginLeft: 4,
  },
  providerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  providerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  profileSection: {
    flexDirection: "row",
    flex: 1,
    gap: 12,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  providerInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1F2937",
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 11,
    color: "#6B7280",
  },
  responseTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  responseTimeText: {
    fontSize: 11,
    color: "#6B7280",
  },
  availableBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  availableText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#10B981",
  },
  providerDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonIcon: {
    width: 24,
    alignItems: "center",
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  quotationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  quotationButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6366F1",
  },
  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  chatButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
  },
  modalBody: {
    padding: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 12,
  },
  quotationInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 14,
    fontSize: 14,
    color: "#1F2937",
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
  },
  cancelModalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  cancelModalText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
  sendModalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 2,
  },
  sendModalText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});