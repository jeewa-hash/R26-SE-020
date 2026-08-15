import React, { useContext, useState, useEffect, useRef } from "react";
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
  Modal,
  Dimensions,
  useColorScheme,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";
import { LanguageContext } from "../context/LanguageContext";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";

const { width, height } = Dimensions.get("window");

export default function FollowUpScreen({ route, navigation }) {
  const { initialMessage, backendResponse, source } = route.params;
  const { language } = useContext(LanguageContext);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';

  const [questionData, setQuestionData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalDecision, setFinalDecision] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [progress, setProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [showSummaryScreen, setShowSummaryScreen] = useState(false);

  // Location picker states
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationAddress, setLocationAddress] = useState("");
  const [currentRegion, setCurrentRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [pickingLocation, setPickingLocation] = useState(false);
  const mapRef = useRef(null);

  // Dynamic styles based on theme
  const dynamicStyles = {
    container: {
      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
    },
    textColor: {
      color: isDarkMode ? '#F9FAFB' : '#1F2937',
    },
    subTextColor: {
      color: isDarkMode ? '#9CA3AF' : '#6B7280',
    },
    cardBackground: {
      backgroundColor: isDarkMode ? '#374151' : '#F3F4F6',
    },
    inputBackground: {
      backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
    },
    optionBackground: {
      backgroundColor: isDarkMode ? '#374151' : '#fff',
      borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
    },
    selectedOptionBackground: {
      backgroundColor: isDarkMode ? '#4C1D95' : '#EEF2FF',
      borderColor: '#6366F1',
    },
    modalBackground: {
      backgroundColor: isDarkMode ? '#1F2937' : '#fff',
    },
    modalOverlay: {
      backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
    },
  };

  // 🔵 Start prediction
  useEffect(() => {
    const startPredict = async () => {
      try {
        // ⭐ IMAGE FLOW (ONLY ADD THIS BLOCK)
        if (source === "image" && route.params.session_id) {
          console.log("IMAGE FLOW ACTIVE");
          setQuestionData(route.params.initialQuestion);
          setSessionId(route.params.session_id);
          setProgress(20);
          setLoading(false);
          return;
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

  // Get current location
  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please allow location access to use this feature');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCurrentRegion(newRegion);
      setSelectedLocation(newRegion);

      // Reverse geocode to get address
      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      const formattedAddress = `${address.street || ''} ${address.streetNumber || ''}, ${address.city || ''}, ${address.region || ''}`;
      setLocationAddress(formattedAddress);

      if (mapRef.current) {
        mapRef.current.animateToRegion(newRegion, 1000);
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  // Handle map press
  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;
    setSelectedLocation(coordinate);
    reverseGeocode(coordinate);
  };

  // Reverse geocode coordinates to address
  const reverseGeocode = async (coordinate) => {
    try {
      const [address] = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });

      const formattedAddress = `${address.street || ''} ${address.streetNumber || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
      setLocationAddress(formattedAddress || `${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    } catch (error) {
      console.error(error);
      setLocationAddress(`${coordinate.latitude.toFixed(6)}, ${coordinate.longitude.toFixed(6)}`);
    }
  };

  // Confirm location selection
  const confirmLocation = () => {
    if (selectedLocation) {
      const locationData = {
        address: locationAddress,
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      };
      setShowLocationPicker(false);
      handleAnswer(locationData);
    } else {
      Alert.alert('No Location', 'Please select a location on the map');
    }
  };

  // 🔵 Handle answer with optional skip
  const handleAnswer = async (answer = null) => {
    try {
      const finalAnswer = answer || selectedOption;

      // ✅ SAVE ANSWERS
      if (questionData) {
        setUserAnswers(prev => [
          ...prev,
          {
            question: questionData.question,
            answer: finalAnswer?.address || finalAnswer || "Skipped",
          }
        ]);
      }

      const payload = {
        session_id: sessionId,
        answer_key: questionData.answer_key,
        // If the answer is a location object, send only the address string.
        // Include latitude and longitude as extra fields for backend use if needed.
        answer: typeof finalAnswer === 'object' && finalAnswer !== null ? finalAnswer.address : finalAnswer,
        app_lan: language === "si" ? "si" : "en",
        ...(typeof finalAnswer === 'object' && finalAnswer !== null ? { lat: finalAnswer.lat, lng: finalAnswer.lng } : {}),
      };

      const endpoint = source === "image"
        ? "http://10.0.2.2:8000/flow/next"
        : "http://10.0.2.2:5002/text-chat";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        // Try parsing JSON from a fresh clone of the response
        data = await response.clone().json();
      } catch (e) {
        // If JSON parsing fails, read the original response as text
        const raw = await response.text();
        console.warn('Non‑JSON response from server:', raw);
        Alert.alert('Server error', 'Unable to parse response. Please try again later.');
        setLoading(false);
        return;
      }

      console.log("Response:", data);

      // ✅ SHOW SUMMARY SCREEN
      // The backend now returns the final result under `summary` rather than `final_decision`.
      if (data.summary) {
        setQuestionData(null);
        setFinalDecision(data);
        setShowSummaryScreen(true);
        setProgress(100);
        return;
      }

      const nextQ = data.next_question || data.question;

      if (nextQ) {
        setQuestionData(nextQ);
        setSelectedOption(null);
        setProgress(prev => Math.min(prev + 20, 90));
        // Reset loading state after handling response
        setLoading(false);
      }

    } catch (err) {
      console.error("ERROR:", err);
      setLoading(false);
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={[styles.loadingText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // 🔵 Final Result Screen
  if (finalDecision && showSummaryScreen) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? '#1F2937' : '#fff'} />
        <ScrollView style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
          {/* Final Decision Card */}
          <View style={styles.finalDecisionCard}>
            <Text style={styles.finalDecisionText}>{finalDecision.summary?.brief_description}</Text>
          </View>

          {/* Response Timeline */}
          <View style={styles.timelineSection}>
            <Text style={[styles.sectionTitle, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>Responses</Text>

            {userAnswers.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.timelineItem, { borderBottomColor: isDarkMode ? '#374151' : '#F3F4F6' }]}
                onPress={() => toggleSection(index)}
                activeOpacity={0.7}
              >
                <View style={[styles.timelineNumber, { backgroundColor: isDarkMode ? '#4C1D95' : '#EEF2FF' }]}>
                  <Text style={[styles.timelineNumberText, { color: '#6366F1' }]}>{index + 1}</Text>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={[styles.timelineQuestion, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>
                    {item.question}
                  </Text>

                  {expandedSections[index] && (
                    <View style={[styles.expandedContent, { borderTopColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
                      <Text style={[styles.answerText, { color: isDarkMode ? '#D1D5DB' : '#1F2937' }]}>{item.answer}</Text>
                    </View>
                  )}

                  {!expandedSections[index] && item.answer !== "Skipped" && (
                    <Text style={[styles.previewAnswer, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]} numberOfLines={1}>
                      {item.answer}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Proceed Button */}
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
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
        <View style={styles.centerContainer}>
          <Text style={{ color: isDarkMode ? '#F9FAFB' : '#1F2937' }}>No question available</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ⭐ ADDRESS Screen with Location Picker
  if (
    questionData.type === "address" ||
    questionData.question?.toLowerCase().includes("address") ||
    questionData.question?.toLowerCase().includes("location") ||
    questionData.question?.toLowerCase().includes("area")
  ) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? '#1F2937' : '#fff'} />
        <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
          <View style={styles.progressSection}>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{progress}% Complete</Text>
          </View>

          <View style={styles.headerSection}>
            <Text style={[styles.mainTitle, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>Location Details</Text>
            <View style={[styles.questionCard, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
              <Text style={[styles.questionText, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>{questionData.question}</Text>
            </View>
          </View>

          {/* Location Picker Button */}
          <TouchableOpacity
            style={[styles.locationPickerButton, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6', borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }]}
            onPress={() => setShowLocationPicker(true)}
          >
            <Ionicons name="map-outline" size={24} color="#6366F1" />
            <Text style={styles.locationPickerButtonText}>Pick Location on Map</Text>
          </TouchableOpacity>

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
                textInput: {
                  ...styles.addressInput,
                  backgroundColor: isDarkMode ? '#374151' : '#F9FAFB',
                  borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                  color: isDarkMode ? '#F9FAFB' : '#1F2937',
                },
                listView: {
                  ...styles.addressListView,
                  backgroundColor: isDarkMode ? '#374151' : '#fff',
                },
                row: {
                  ...styles.addressRow,
                  backgroundColor: isDarkMode ? '#374151' : '#fff',
                  borderBottomColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                },
                description: {
                  fontSize: 14,
                  color: isDarkMode ? '#D1D5DB' : '#6B7280',
                },
              }}
              textInputProps={{
                placeholderTextColor: isDarkMode ? '#9CA3AF' : '#9CA3AF',
              }}
            />
          </View>

          <View style={styles.navigationButtons}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={[styles.backBtnText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, (selectedLocation || selectedOption) && styles.nextBtnActive]}
              onPress={() => {
                if (selectedLocation) {
                  // Submit selected location as answer
                  handleAnswer({
                    address: locationAddress,
                    lat: selectedLocation.latitude,
                    lng: selectedLocation.longitude,
                  });
                } else {
                  // No location selected, treat as skip
                  handleAnswer();
                }
              }}
            >
              <Text style={styles.nextBtnText}>
                {selectedLocation ? "Next" : (selectedOption ? "Next" : "Skip")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Location Picker Modal */}
          <Modal
            visible={showLocationPicker}
            animationType="slide"
            presentationStyle="fullScreen"
          >
            <SafeAreaView style={[styles.modalContainer, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
              <View style={[styles.modalHeader, { borderBottomColor: isDarkMode ? '#4B5563' : '#E5E7EB', backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
                <TouchableOpacity
                  onPress={() => setShowLocationPicker(false)}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={isDarkMode ? '#F9FAFB' : '#1F2937'} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>Select Location</Text>
                <View style={{ width: 40 }} />
              </View>

              {pickingLocation && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color="#6366F1" />
                </View>
              )}

              <MapView
                ref={mapRef}
                style={styles.map}
                region={currentRegion}
                onPress={handleMapPress}
                showsUserLocation={true}
                showsMyLocationButton={true}
              >
                {selectedLocation && (
                  <Marker
                    coordinate={selectedLocation}
                    draggable
                    onDragEnd={(e) => {
                      const { coordinate } = e.nativeEvent;
                      setSelectedLocation(coordinate);
                      reverseGeocode(coordinate);
                    }}
                  >
                    <View style={styles.markerContainer}>
                      <Ionicons name="location" size={32} color="#6366F1" />
                    </View>
                  </Marker>
                )}
              </MapView>

              <View style={styles.locationControls}>
                <TouchableOpacity
                  style={[styles.currentLocationButton, { backgroundColor: isDarkMode ? '#374151' : '#fff', borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' }]}
                  onPress={getCurrentLocation}
                >
                  <Ionicons name="locate" size={20} color="#6366F1" />
                  <Text style={[styles.currentLocationText, { color: '#6366F1' }]}>My Location</Text>
                </TouchableOpacity>
              </View>

              {selectedLocation && (
                <View style={[styles.locationDetails, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
                  <Text style={[styles.selectedAddressLabel, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>Selected Address:</Text>
                  <Text style={[styles.selectedAddress, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>{locationAddress}</Text>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={confirmLocation}
                  >
                    <Text style={styles.confirmButtonText}>Confirm Location</Text>
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </Modal>
        </View>
      </SafeAreaView>
    );
  }

  // ⭐ Main Question Screen
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={isDarkMode ? '#1F2937' : '#fff'} />
      <View style={[styles.container, { backgroundColor: isDarkMode ? '#1F2937' : '#fff' }]}>
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{progress}% Complete</Text>
        </View>

        <View style={styles.headerSection}>
          <Text style={[styles.mainTitle, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>Service Assessment</Text>
          <View style={[styles.questionCard, { backgroundColor: isDarkMode ? '#374151' : '#F3F4F6' }]}>
            <Text style={[styles.questionText, { color: isDarkMode ? '#F9FAFB' : '#1F2937' }]}>{questionData.question}</Text>
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
                { backgroundColor: isDarkMode ? '#374151' : '#fff', borderColor: isDarkMode ? '#4B5563' : '#E5E7EB' },
                selectedOption === opt && [styles.optionItemSelected, { backgroundColor: isDarkMode ? '#4C1D95' : '#EEF2FF', borderColor: '#6366F1' }],
              ]}
              onPress={() => setSelectedOption(opt)}
              activeOpacity={0.7}
            >
              <View style={styles.optionContent}>
                <View style={[
                  styles.radioCircle,
                  { borderColor: isDarkMode ? '#6B7280' : '#D1D5DB' },
                  selectedOption === opt && styles.radioCircleSelected,
                ]}>
                  {selectedOption === opt && <View style={styles.radioInner} />}
                </View>
                <Text style={[
                  styles.optionText,
                  { color: isDarkMode ? '#F9FAFB' : '#1F2937' },
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

        <View style={[styles.navigationButtons, { borderTopColor: isDarkMode ? '#374151' : '#E5E7EB' }]}>
          <TouchableOpacity style={styles.backBtn}>
            <Text style={[styles.backBtnText, { color: isDarkMode ? '#9CA3AF' : '#6B7280' }]}>← Back</Text>
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
    marginBottom: 16,
  },
  questionCard: {
    padding: 16,
    borderRadius: 12,
  },
  questionText: {
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  optionsSection: {
    flex: 1,
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  optionItemSelected: {
    borderColor: "#6366F1",
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
    marginTop: 16,
  },
  backBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  backBtnText: {
    fontSize: 16,
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
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  addressListView: {
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
  },
  // Location Picker Styles
  locationPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  locationPickerButtonText: {
    fontSize: 16,
    color: "#6366F1",
    marginLeft: 8,
    fontWeight: "500",
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  map: {
    width: width,
    height: height - 200,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  markerContainer: {
    alignItems: "center",
  },
  locationControls: {
    position: "absolute",
    bottom: 20,
    right: 20,
  },
  currentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
  },
  currentLocationText: {
    marginLeft: 8,
    fontWeight: "500",
  },
  locationDetails: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedAddressLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  selectedAddress: {
    fontSize: 14,
    marginBottom: 16,
  },
  confirmButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
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
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  timelineNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  timelineNumberText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timelineContent: {
    flex: 1,
  },
  timelineQuestion: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  previewAnswer: {
    fontSize: 12,
  },
  expandedContent: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  answerText: {
    fontSize: 14,
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