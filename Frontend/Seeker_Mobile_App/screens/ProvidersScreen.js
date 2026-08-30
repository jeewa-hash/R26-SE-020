// screens/ProvidersScreen.js

import React, { useState, useEffect } from "react";
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
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CONFIG, IP_ADDRESS } from "../config";
import { useAuth } from "../context/AuthContext";

// --------------------------------------------------------------
// 🔥 Build URL with IP from config
// --------------------------------------------------------------
const QUOTATION_API_URL = `http://${IP_ADDRESS}:6000/request-quotations`;

export default function ProvidersScreen({ route, navigation }) {
  const {
    userAnswers = [],
    finalDecision = null,
    initialMessage = "",
  } = route.params || {};

  const { user } = useAuth();
  const [seekerId, setSeekerId] = useState(null);

  const [selectedProvider, setSelectedProvider] = useState(null);
  const [quotationModalVisible, setQuotationModalVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestedProviderIds, setRequestedProviderIds] = useState(new Set());

  const summary = finalDecision?.summary || {};
  const sessionId = summary.session_id || finalDecision?.session_id || null;

  // Load seeker ID
  useEffect(() => {
    const getSeekerId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (storedUserId) {
          setSeekerId(storedUserId);
        } else if (user?.id) {
          setSeekerId(user.id);
        }
      } catch (error) {
        console.log("Error loading seeker ID:", error);
      }
    };
    getSeekerId();
  }, [user]);

  // Fetch existing requests for this seeker to know which providers have already been requested
  useEffect(() => {
    const fetchExistingRequests = async () => {
      if (!seekerId) return;
      try {
        const token = await AsyncStorage.getItem("userToken");
        const response = await fetch(`${QUOTATION_API_URL}/seeker/${seekerId}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await response.json();
        if (data.success && Array.isArray(data.requests)) {
          const sessionRequests = data.requests.filter(
            (r) => !sessionId || r.sessionId === sessionId
          );
          const ids = new Set(
            sessionRequests.map((r) => String(r.providerId?._id || r.providerId))
          );
          setRequestedProviderIds(ids);
        }
      } catch (error) {
        console.log("Error fetching existing quotation requests:", error);
      }
    };
    fetchExistingRequests();
  }, [seekerId, sessionId]);

  /*
   * ==========================================================
   * PROVIDERS
   * ==========================================================
   */
  const providerMatching = finalDecision?.summary?.provider_matching || {};
  const providers = providerMatching.providers || [];
  const totalMatchedProviders =
    providerMatching.total_matched_providers ?? providers.length;

  /*
   * ==========================================================
   * PROFILE IMAGE
   * ==========================================================
   */
  const getProfileImage = (profileImage) => {
    if (!profileImage) return null;
    const normalizedPath = profileImage.replace(/\\/g, "/");
    if (normalizedPath.startsWith("http")) {
      return normalizedPath;
    }
    return `${CONFIG.API_BASE_URL}/${normalizedPath}`;
  };

  const getProviderName = (provider) => {
    return provider?.name || "Service Provider";
  };

  /*
   * ==========================================================
   * REQUEST QUOTATION
   * ==========================================================
   */
  const handleRequestQuotation = async () => {
    if (!seekerId) {
      Alert.alert("Error", "You must be logged in to request a quotation.");
      return;
    }

    const provider = selectedProvider?.provider;
    const providerId = provider?.id || provider?._id;
    if (!provider || !providerId) {
      Alert.alert("Error", "Provider information is unavailable.");
      return;
    }

    if (requestedProviderIds.has(String(providerId))) {
      Alert.alert(
        "Already Requested",
        `You have already requested a quotation from ${getProviderName(provider)} for this service request.`
      );
      setQuotationModalVisible(false);
      return;
    }

    const currentSessionId = sessionId || `SESSION-${Date.now()}`;

    const stepBreakdown = summary.step_breakdown || [];
    const briefDescription = summary.brief_description || "Service request";

    const payload = {
      seekerId: seekerId,
      providerId: providerId,
      sessionId: currentSessionId,
      detectedCategory: summary.detected_category || "unknown",
      detectedObject: summary.detected_object || "unknown",
      modelConfidence: summary.model_confidence || null,
      stepBreakdown: stepBreakdown,
      briefDescription: briefDescription,
      urgencyLevel: summary.urgency_level || "Normal",
      serviceLocation: summary.provider_matching?.criteria?.service_location || "",
    };

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Error", "You are not authenticated. Please log in again.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(QUOTATION_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.status === 201 || (response.status === 200 && data.success)) {
        setRequestedProviderIds((prev) => new Set([...prev, String(providerId)]));
        Alert.alert(
          "Quotation Request Sent",
          `Your quotation request has been sent to ${getProviderName(provider)}.\n\nYou can also request quotations from other providers in the list.`,
          [
            {
              text: "OK",
              onPress: () => {
                setQuotationModalVisible(false);
                setIsSubmitting(false);
              },
            },
          ]
        );
      } else if (response.status === 409) {
        setRequestedProviderIds((prev) => new Set([...prev, String(providerId)]));
        Alert.alert(
          "Already Requested",
          data.message || "A quotation request has already been sent to this provider for this session."
        );
        setQuotationModalVisible(false);
        setIsSubmitting(false);
      } else {
        Alert.alert(
          "Failed to Send",
          data.message || "Unable to send quotation request. Please try again."
        );
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error("QUOTATION REQUEST ERROR:", error);
      Alert.alert(
        "Network Error",
        `Could not connect to the server at ${QUOTATION_API_URL}.\nMake sure the backend is running and the IP/port is correct.`
      );
      setIsSubmitting(false);
    }
  };

  /*
   * ==========================================================
   * OTHER HANDLERS
   * ==========================================================
   */
  const handleViewProfile = (item) => {
    const pId = String(item?.provider?.id || item?.provider?._id);
    console.log("🔵 Navigating to ProviderProfile with finalDecision:", finalDecision);
    navigation.navigate("ProviderProfile", {
      providerItem: item,
      finalDecision: finalDecision,
      isRequested: requestedProviderIds.has(pId),
      onQuotationRequested: (requestedId) => {
        setRequestedProviderIds((prev) => new Set([...prev, String(requestedId)]));
      },
    });
  };

  const handleChat = (item) => {
    const provider = item.provider || {};
    Alert.alert("Start Chat", `Start a conversation with ${getProviderName(provider)}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Start Chat",
        onPress: () => {
          Alert.alert("Chat", `Chat with ${getProviderName(provider)} started!`);
        },
      },
    ]);
  };

  const renderStars = () => {
    return (
      <View style={styles.ratingContainer}>
        <Ionicons name="star-outline" size={15} color="#FBBF24" />
        <Text style={styles.ratingText}>No rating yet</Text>
      </View>
    );
  };

  /*
   * ==========================================================
   * EMPTY STATE
   * ==========================================================
   */
  if (!finalDecision) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Ionicons name="alert-circle-outline" size={50} color="#6366F1" />
          <Text style={styles.emptyTitle}>No matching results</Text>
          <Text style={styles.emptyText}>
            We could not find the provider matching results.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.primaryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /*
   * ==========================================================
   * MAIN UI
   * ==========================================================
   */
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />


      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MATCH SUMMARY */}
        <View style={styles.matchSummary}>
          <View style={styles.matchIcon}>
            <Ionicons name="checkmark-circle" size={26} color="#10B981" />
          </View>
          <View style={styles.matchSummaryContent}>
            <Text style={styles.matchTitle}>
              {totalMatchedProviders} provider{totalMatchedProviders !== 1 ? "s" : ""} found
            </Text>
            <Text style={styles.matchSubtitle}>
              Based on your service requirements and location
            </Text>
          </View>
        </View>

        {/* SERVICE INFORMATION */}
        <View style={styles.serviceCard}>
          <View style={styles.serviceRow}>
            <Ionicons name="construct-outline" size={20} color="#6366F1" />
            <View style={styles.serviceContent}>
              <Text style={styles.serviceLabel}>Service</Text>
              <Text style={styles.serviceValue}>
                {providerMatching?.criteria?.service_category || "Service"}
              </Text>
            </View>
          </View>
          <View style={styles.serviceRow}>
            <Ionicons name="location-outline" size={20} color="#6366F1" />
            <View style={styles.serviceContent}>
              <Text style={styles.serviceLabel}>Location</Text>
              <Text style={styles.serviceValue}>
                {providerMatching?.district_used ||
                  providerMatching?.criteria?.service_location ||
                  "Not specified"}
              </Text>
            </View>
          </View>
          <View style={styles.serviceRow}>
            <Ionicons name="flash-outline" size={20} color="#EF4444" />
            <View style={styles.serviceContent}>
              <Text style={styles.serviceLabel}>Priority</Text>
              <Text style={styles.serviceValue}>
                {providerMatching?.criteria?.urgency_level || "Normal"}
              </Text>
            </View>
          </View>
        </View>

        {/* PROVIDER LIST */}
        {providers.length === 0 ? (
          <View style={styles.noProvidersContainer}>
            <Ionicons name="search-outline" size={50} color="#9CA3AF" />
            <Text style={styles.noProvidersTitle}>No providers found</Text>
            <Text style={styles.noProvidersText}>
              We couldn't find a matching provider for your requirements.
            </Text>
          </View>
        ) : (
          providers.map((item, index) => {
            const provider = item.provider || {};
            const portfolio = item.portfolio || {};
            const match = item.match || {};

            const providerName = getProviderName(provider);
            const imageUrl = getProfileImage(provider.profileImage);

            return (
              <View key={provider.id || index} style={styles.providerCard}>
                <View style={styles.providerHeader}>
                  <View style={styles.profileSection}>
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} style={styles.profileImage} />
                    ) : (
                      <View style={styles.defaultProfile}>
                        <Ionicons name="person" size={28} color="#6366F1" />
                      </View>
                    )}
                    <View style={styles.providerInfo}>
                      <View style={styles.nameRow}>
                        <Text style={styles.providerName} numberOfLines={1}>
                          {providerName}
                        </Text>
                        {provider.isVerified && (
                          <Ionicons name="checkmark-circle" size={17} color="#6366F1" />
                        )}
                      </View>
                      {renderStars()}
                      <View style={styles.providerCategory}>
                        <Ionicons name="briefcase-outline" size={13} color="#6B7280" />
                        <Text style={styles.categoryText} numberOfLines={1}>
                          {provider.category || "Service Provider"}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <View style={provider.isVerified ? styles.verifiedBadge : styles.unverifiedBadge}>
                    <Text style={provider.isVerified ? styles.verifiedText : styles.unverifiedText}>
                      {provider.isVerified ? "Verified" : "Unverified"}
                    </Text>
                  </View>
                </View>

                <View style={styles.providerDetails}>
                  <View style={styles.detailItem}>
                    <Ionicons name="location-outline" size={17} color="#6B7280" />
                    <Text style={styles.detailText}>{provider.district || "Location unavailable"}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Ionicons name="mail-outline" size={17} color="#6B7280" />
                    <Text style={styles.detailText} numberOfLines={1}>
                      {provider.email || "Email unavailable"}
                    </Text>
                  </View>
                </View>

                <View style={styles.matchDetails}>
                  {match.category_match && (
                    <View style={styles.matchTag}>
                      <Ionicons name="checkmark" size={14} color="#10B981" />
                      <Text style={styles.matchTagText}>Category match</Text>
                    </View>
                  )}
                  {match.district_match && (
                    <View style={styles.matchTag}>
                      <Ionicons name="checkmark" size={14} color="#10B981" />
                      <Text style={styles.matchTagText}>Location match</Text>
                    </View>
                  )}
                  {match.priority && (
                    <View style={styles.priorityTag}>
                      <Text style={styles.priorityTagText}>{match.priority}</Text>
                    </View>
                  )}
                </View>

                {portfolio.total_images > 0 && (
                  <View style={styles.portfolioSection}>
                    <Ionicons name="images-outline" size={16} color="#6366F1" />
                    <Text style={styles.portfolioText}>
                      {portfolio.total_images} portfolio image{portfolio.total_images !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}

                <View style={styles.buttonContainer}>
                  <TouchableOpacity style={styles.profileButton} onPress={() => handleViewProfile(item)}>
                    <Ionicons name="person-outline" size={18} color="#6366F1" />
                    <Text style={styles.profileButtonText}>Profile</Text>
                  </TouchableOpacity>

                  {requestedProviderIds.has(String(provider.id || provider._id)) ? (
                    <TouchableOpacity
                      style={styles.quotationButtonRequested}
                      onPress={() =>
                        Alert.alert(
                          "Quotation Requested",
                          `You have already requested a quotation from ${providerName}. Only 1 quotation request is allowed per provider for this service requirement.`
                        )
                      }
                    >
                      <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                      <Text style={styles.quotationButtonTextRequested}>Requested</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.quotationButton}
                      onPress={() => {
                        setSelectedProvider(item);
                        setQuotationModalVisible(true);
                      }}
                    >
                      <Ionicons name="document-text-outline" size={18} color="#6366F1" />
                      <Text style={styles.quotationButtonText}>Get Quote</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={styles.chatButton} onPress={() => handleChat(item)}>
                    <Ionicons name="chatbubble-outline" size={18} color="#fff" />
                    <Text style={styles.chatButtonText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* QUOTATION MODAL */}
      <Modal
        animationType="slide"
        transparent
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
              <Text style={styles.modalLabel}>
                Service description for {getProviderName(selectedProvider?.provider)}
              </Text>

              <View style={styles.descriptionBox}>
                <Text style={styles.descriptionText}>
                  {finalDecision?.summary?.brief_description || "No description available."}
                </Text>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelModalButton}
                  onPress={() => setQuotationModalVisible(false)}
                  disabled={isSubmitting}
                >
                  <Text style={styles.cancelModalText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.sendModalButton, isSubmitting && styles.disabledButton]}
                  onPress={handleRequestQuotation}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.sendModalText}>Send Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ============================================================
   STYLES
============================================================ */

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

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 50,
    flexGrow: 1,
  },

  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 15,
  },

  emptyText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 8,
    marginBottom: 20,
  },

  /* MATCH SUMMARY */
  matchSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },

  matchIcon: {
    marginRight: 12,
  },

  matchSummaryContent: {
    flex: 1,
  },

  matchTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#065F46",
  },

  matchSubtitle: {
    fontSize: 12,
    color: "#047857",
    marginTop: 3,
  },

  /* SERVICE CARD */
  serviceCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },

  serviceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  serviceContent: {
    marginLeft: 12,
    flex: 1,
  },

  serviceLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  serviceValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 2,
  },

  /* PROVIDER CARD */
  providerCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },

  providerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  profileSection: {
    flexDirection: "row",
    flex: 1,
  },

  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "#6366F1",
  },

  defaultProfile: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
  },

  providerInfo: {
    flex: 1,
    marginLeft: 12,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  providerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937",
    maxWidth: "85%",
  },

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  ratingText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 4,
  },

  providerCategory: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },

  categoryText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 5,
  },

  verifiedBadge: {
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  verifiedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },

  unverifiedBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  unverifiedText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
  },

  providerDetails: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
    paddingVertical: 12,
    marginTop: 14,
  },

  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
  },

  detailText: {
    fontSize: 12,
    color: "#6B7280",
    marginLeft: 7,
    flex: 1,
  },

  matchDetails: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    gap: 6,
  },

  matchTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  matchTagText: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
    marginLeft: 3,
  },

  priorityTag: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 20,
  },

  priorityTagText: {
    fontSize: 10,
    color: "#6366F1",
    fontWeight: "700",
  },

  portfolioSection: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },

  portfolioText: {
    fontSize: 12,
    color: "#6366F1",
    marginLeft: 6,
    fontWeight: "500",
  },

  /* BUTTONS */
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },

  profileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    paddingVertical: 11,
    borderRadius: 11,
    gap: 6,
  },

  profileButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
  },

  quotationButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#6366F1",
    gap: 5,
  },

  quotationButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6366F1",
  },

  quotationButtonRequested: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ECFDF5",
    paddingVertical: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#10B981",
    gap: 5,
  },

  quotationButtonTextRequested: {
    fontSize: 12,
    fontWeight: "700",
    color: "#059669",
  },

  chatButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#6366F1",
    paddingVertical: 11,
    borderRadius: 11,
    gap: 5,
  },

  chatButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },

  /* EMPTY */
  noProvidersContainer: {
    alignItems: "center",
    paddingVertical: 50,
  },

  noProvidersTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 12,
  },

  noProvidersText: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 30,
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalContainer: {
    backgroundColor: "#fff",
    borderRadius: 24,
    width: "90%",
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
    marginBottom: 10,
  },

  descriptionBox: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  descriptionText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
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
  },

  sendModalText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  primaryButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    paddingHorizontal: 25,
    borderRadius: 10,
    marginTop: 20,
  },

  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  disabledButton: {
    opacity: 0.6,
  },
});