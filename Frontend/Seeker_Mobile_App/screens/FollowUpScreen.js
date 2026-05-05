import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";
import { LanguageContext } from "../context/LanguageContext";

export default function FollowUpScreen({ route, navigation }) {
const { initialMessage, backendResponse, source } = route.params;
  const { language } = useContext(LanguageContext);
  const [questionData, setQuestionData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalDecision, setFinalDecision] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [progress, setProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});

  // 🔵 Start prediction
  useEffect(() => {
  const startPredict = async () => {
    try {
      // ⭐ IMAGE FLOW (ONLY ADD THIS BLOCK)
      if (source === "image" && backendResponse) {
        console.log("Using image response");

        setQuestionData(backendResponse.next_question);
        setSessionId(backendResponse.session_id);
        setSelectedOption(null);
        setProgress(20);
        return; // 🚨 VERY IMPORTANT
      }

      // ✅ KEEP YOUR TEXT FLOW EXACTLY SAME
      const res = await fetch("http://10.0.2.2:5002/text-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: initialMessage,
          app_lan: language === "si" ? "si" : "en",
        }),
      });

      const data = await res.json();

      if (data.next_question) {
        setQuestionData(data.next_question);
        setSessionId(data.session_id);
        setSelectedOption(null);
        setProgress(20);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  startPredict();
}, []);

  // 🔵 Handle answer with optional skip
 const handleAnswer = async (answer = null) => {
  try {
    const finalAnswer = answer || selectedOption;

    // ✅ SAVE ANSWERS (THIS IS WHY SUMMARY WAS EMPTY)
    if (questionData) {
      setUserAnswers(prev => [
        ...prev,
        {
          question: questionData.question,
          answer: finalAnswer || "Skipped",
        }
      ]);
    }

    const payload = {
      session_id: sessionId,
      answer_key: questionData.answer_key,
      answer: finalAnswer || "skipped",
      app_lan: language === "si" ? "si" : "en",
    };

    const endpoint =
      source === "image"
        ? "http://10.0.2.2:5000/chat"
        : "http://10.0.2.2:5002/text-chat";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    console.log("Response:", data);

    // ✅ SHOW SUMMARY SCREEN INSTEAD OF DIRECT FINAL
    if (data.final_decision) {
      setQuestionData(null);
      setFinalDecision(data);
      setShowSummaryScreen(true); // ⭐ IMPORTANT
      setProgress(100);
      return;
    }

    const nextQ = data.next_question || data.question;

    if (nextQ) {
      setQuestionData(nextQ);
      setSelectedOption(null);
      setProgress(prev => Math.min(prev + 20, 90));
    }

  } catch (err) {
    console.error("ERROR:", err);
  }
};

  const toggleSection = (index) => {
    setExpandedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Navigate to Providers Screen
  const navigateToProviders = () => {
    navigation.navigate("ProvidersScreen", {
      userAnswers: userAnswers,
      finalDecision: finalDecision,
      initialMessage: initialMessage,
    });
  };

  // 🔵 Loading Screen
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🔵 Final Result Screen
  if (finalDecision) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <ScrollView style={styles.container}>
          {/* Final Decision Card */}
          <View style={styles.finalDecisionCard}>
            <Text style={styles.finalDecisionText}>{finalDecision.summary}</Text>
          </View>

          {/* Response Timeline */}
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Responses</Text>
            
            {userAnswers.map((item, index) => (
              <TouchableOpacity 
                key={index}
                style={styles.timelineItem}
                onPress={() => toggleSection(index)}
                activeOpacity={0.7}
              >
                <View style={styles.timelineNumber}>
                  <Text style={styles.timelineNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineQuestion}>
                    {item.question}
                  </Text>
                  
                  {expandedSections[index] && (
                    <View style={styles.expandedContent}>
                      <Text style={styles.answerText}>{item.answer}</Text>
                    </View>
                  )}
                  
                  {!expandedSections[index] && item.answer !== "Skipped" && (
                    <Text style={styles.previewAnswer} numberOfLines={1}>
                      {item.answer}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Proceed Button - Navigates to Providers Screen */}
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={navigateToProviders}
          >
            <Text style={styles.primaryButtonText}>Find Caregivers →</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!questionData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centerContainer}>
          <Text>No question available</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ⭐ ADDRESS Screen
  if (
    questionData.type === "address" ||
    questionData.question?.toLowerCase().includes("address") ||
    questionData.question?.toLowerCase().includes("location") ||
    questionData.question?.toLowerCase().includes("area")
  ) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.container}>
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}% Complete</Text>
          </View>

          <View style={styles.headerSection}>
            <Text style={styles.mainTitle}>Location Details</Text>
            <View style={styles.questionCard}>
              <Text style={styles.questionText}>{questionData.question}</Text>
            </View>
          </View>

          <View style={styles.addressSection}>
            <GooglePlacesAutocomplete
              placeholder="Search for your address..."
              fetchDetails={true}
              enablePoweredByContainer={false}
              minLength={2}
              debounce={250}
              autoFocus={true}
              nearbyPlacesAPI="GooglePlacesSearch"
              GooglePlacesSearchQuery={{
                rankby: "distance",
                type: "establishment",
              }}
              currentLocation={true}
              currentLocationLabel="Use current location"
              query={{
                key: "YOUR_GOOGLE_MAPS_API_KEY",
                language: "en",
                components: "country:lk",
                region: "lk",
              }}
              onPress={(data, details = null) => {
                handleAnswer({
                  address: data.description,
                  placeId: data.place_id,
                  lat: details?.geometry?.location?.lat,
                  lng: details?.geometry?.location?.lng,
                });
              }}
              styles={{
                container: { flex: 0 },
                textInput: styles.addressInput,
                listView: styles.addressListView,
                row: styles.addressRow,
                description: { fontSize: 14, color: "#6B7280" },
              }}
              textInputProps={{
                placeholderTextColor: "#9CA3AF",
              }}
            />
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity style={styles.backBtn}>
              <Text style={styles.backBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.nextBtn}
              onPress={() => handleAnswer()}
            >
              <Text style={styles.nextBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ⭐ Main Question Screen
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <View style={styles.container}>
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% Complete</Text>
        </View>

        <View style={styles.headerSection}>
          <Text style={styles.mainTitle}>Service Assessment</Text>
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{questionData.question}</Text>
          </View>
        </View>

        <ScrollView 
          style={styles.optionsSection}
          showsVerticalScrollIndicator={false}
        >
          {questionData.options?.map((opt, idx) => (
            <TouchableOpacity
              key={idx}
              style={[
                styles.optionItem,
                selectedOption === opt && styles.optionItemSelected,
              ]}
              onPress={() => setSelectedOption(opt)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.radioCircle,
                  selectedOption === opt && styles.radioCircleSelected,
                ]}>
                  {selectedOption === opt && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.optionText,
                  selectedOption === opt && styles.optionTextSelected,
                ]}>
                  {opt}
                </Text>
              </View>
              {selectedOption === opt && (
                <Ionicons name="checkmark-circle" size={24} color="#6366F1" />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.navigationButtons}>
          <TouchableOpacity style={styles.backBtn}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.nextBtn, selectedOption && styles.nextBtnActive]}
            onPress={() => handleAnswer()}
          >
            <Text style={styles.nextBtnText}>
              {selectedOption ? "Next" : "Skip"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// 🔵 Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#fff",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#6B7280",
  },
  progressSection: {
    marginBottom: 24,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: "#6366F1",
    textAlign: "right",
  },
  headerSection: {
    marginBottom: 24,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: "#F3F4F6",
    padding: 16,
    borderRadius: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1F2937",
    lineHeight: 24,
  },
  optionsSection: {
    flex: 1,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  optionItemSelected: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioCircleSelected: {
    borderColor: "#6366F1",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#6366F1",
  },
  optionText: {
    fontSize: 15,
    color: "#1F2937",
    flex: 1,
  },
  optionTextSelected: {
    color: "#6366F1",
    fontWeight: "600",
  },
  navigationButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backBtnText: {
    fontSize: 16,
    color: "#6B7280",
  },
  nextBtn: {
    backgroundColor: "#9CA3AF",
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextBtnActive: {
    backgroundColor: "#6366F1",
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  addressSection: {
    flex: 1,
    marginTop: 16,
  },
  addressInput: {
    backgroundColor: "#F9FAFB",
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  addressListView: {
    backgroundColor: "#fff",
    borderRadius: 10,
    marginTop: 5,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addressRow: {
    padding: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  // Final Result Styles
  finalDecisionCard: {
    backgroundColor: "#6366F1",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  finalDecisionText: {
    fontSize: 16,
    color: "#fff",
    lineHeight: 24,
  },
  timelineSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  timelineNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  timelineNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6366F1",
  },
  timelineContent: {
    flex: 1,
  },
  timelineQuestion: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1F2937",
    marginBottom: 4,
  },
  previewAnswer: {
    fontSize: 12,
    color: "#6B7280",
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  answerText: {
    fontSize: 14,
    color: "#1F2937",
  },
  primaryButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
});