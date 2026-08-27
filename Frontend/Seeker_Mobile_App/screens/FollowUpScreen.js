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
  Platform,
  useColorScheme,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";
import { LanguageContext } from "../context/LanguageContext";
import * as Location from "expo-location";
import AsyncStorage from '@react-native-async-storage/async-storage';

let MapView = null;
let Marker = null;

if (Platform.OS !== 'web') {
  try {
    const loadMaps = () => eval('require')('react-native-maps');
    const Maps = loadMaps();
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
  } catch (error) {
    console.warn('react-native-maps unavailable on this platform:', error.message);
  }
}

const { width, height } = Dimensions.get("window");

export default function FollowUpScreen({ route, navigation }) {
  const { initialMessage, backendResponse, source } = route.params;
  const { language } = useContext(LanguageContext);
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  const [questionData, setQuestionData] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finalDecision, setFinalDecision] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [userAnswers, setUserAnswers] = useState([]);
  const [progress, setProgress] = useState(0);
  const [expandedSections, setExpandedSections] = useState({});
  const [showSummaryScreen, setShowSummaryScreen] = useState(false);

  // =====================================================
  // LOCATION STATES
  // =====================================================

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

  // =====================================================
  // START PREDICTION
  // =====================================================

  useEffect(() => {
    const startPredict = async () => {
      try {
        // =================================================
        // IMAGE FLOW
        // =================================================

        if (source === "image" && route.params.session_id) {
          console.log("IMAGE FLOW ACTIVE");

          setQuestionData(route.params.initialQuestion);
          setSessionId(route.params.session_id);
          setProgress(20);
          setLoading(false);

          return;
        }

        // =================================================
        // TEXT FLOW
        // =================================================

     // =================================================
// TEXT FLOW – with token
// =================================================

const token = await AsyncStorage.getItem('userToken');
if (!token) {
  Alert.alert('Error', 'You are not logged in.');
  setLoading(false);
  return;
}

const res = await fetch(
  "http://10.0.2.2:5002/text-predict",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,   // ← added
    },
    body: JSON.stringify({
      text: initialMessage,
      app_lan: language === "si" ? "si" : "en",
    }),
  }
);

        const data = await res.json();

        console.log("TEXT PREDICT RESPONSE:", data);

        if (data.next_question) {
          setQuestionData(data.next_question);
          setSessionId(data.session_id);
          setSelectedOption(null);
          setProgress(20);
        }
      } catch (err) {
        console.error("START PREDICT ERROR:", err);

        Alert.alert(
          "Connection Error",
          "Unable to connect to the service. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    startPredict();
  }, []);

  // =====================================================
  // GET CURRENT LOCATION
  // =====================================================

  const getCurrentLocation = async () => {
    try {
      setPickingLocation(true);

      const { status } =
        await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setPickingLocation(false);

        Alert.alert(
          "Permission Denied",
          "Please allow location access to use this feature."
        );

        return;
      }

      const location =
        await Location.getCurrentPositionAsync({});

      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };

      setCurrentRegion(newRegion);
      setSelectedLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Reverse geocode
      const [address] =
        await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });

      if (address) {
        const formattedAddress =
          `${address.street || ""} ${
            address.streetNumber || ""
          }, ${address.city || ""}, ${
            address.region || ""
          }`
            .replace(/\s+/g, " ")
            .replace(/^,\s*/, "")
            .trim();

        setLocationAddress(formattedAddress);
      }

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          newRegion,
          1000
        );
      }
    } catch (error) {
      console.error("CURRENT LOCATION ERROR:", error);

      Alert.alert(
        "Error",
        "Failed to get current location."
      );
    } finally {
      setPickingLocation(false);
    }
  };

  // =====================================================
  // HANDLE MAP PRESS
  // =====================================================

  const handleMapPress = (event) => {
    const { coordinate } = event.nativeEvent;

    setSelectedLocation(coordinate);

    reverseGeocode(coordinate);
  };

  // =====================================================
  // REVERSE GEOCODE
  // =====================================================

  const reverseGeocode = async (coordinate) => {
    try {
      const [address] =
        await Location.reverseGeocodeAsync({
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
        });

      if (address) {
        const formattedAddress =
          `${address.street || ""} ${
            address.streetNumber || ""
          }, ${address.city || ""}, ${
            address.region || ""
          }`
            .replace(/\s+/g, " ")
            .replace(/^,\s*/, "")
            .trim();

        setLocationAddress(
          formattedAddress ||
            `${coordinate.latitude.toFixed(
              6
            )}, ${coordinate.longitude.toFixed(6)}`
        );
      }
    } catch (error) {
      console.error("REVERSE GEOCODE ERROR:", error);

      setLocationAddress(
        `${coordinate.latitude.toFixed(
          6
        )}, ${coordinate.longitude.toFixed(6)}`
      );
    }
  };

  // =====================================================
  // FORMAT ANSWER
  // =====================================================

  const formatAnswer = (ans) => {
    if (ans === null || ans === undefined) {
      return "Skipped";
    }

    if (typeof ans === "string") {
      return ans;
    }

    if (typeof ans === "object") {
      if (ans.address) {
        return ans.address;
      }

      if (
        ans.lat !== undefined &&
        ans.lng !== undefined
      ) {
        return `${Number(ans.lat).toFixed(
          6
        )}, ${Number(ans.lng).toFixed(6)}`;
      }

      try {
        return JSON.stringify(ans);
      } catch (e) {
        return String(ans);
      }
    }

    return String(ans);
  };

  // =====================================================
  // CONFIRM LOCATION
  // =====================================================

  const confirmLocation = () => {
    if (selectedLocation) {
      const locationData = {
        address: locationAddress,
        lat: selectedLocation.latitude,
        lng: selectedLocation.longitude,
      };

      setShowLocationPicker(false);

      setSelectedOption(locationData);
      setLocationAddress(locationAddress);
    } else {
      Alert.alert(
        "No Location",
        "Please select a location on the map."
      );
    }
  };

  // =====================================================
  // HANDLE ANSWER
  // =====================================================

  const handleAnswer = async (answer = null) => {
    if (loading) {
      return;
    }

    setLoading(true);

    try {
      const finalAnswer =
        answer !== null && answer !== undefined
          ? answer
          : selectedOption;

      // =================================================
      // SAVE ANSWER
      // =================================================

      if (questionData) {
        setUserAnswers((prev) => [
          ...prev,
          {
            question: questionData.question,
            answer: formatAnswer(finalAnswer),
          },
        ]);
      }

      const payload = {
        session_id: sessionId,
        answer_key: questionData.answer_key,

        answer:
          typeof finalAnswer === "object" &&
          finalAnswer !== null
            ? finalAnswer.address || ""
            : finalAnswer,

        app_lan:
          language === "si" ? "si" : "en",

        ...(typeof finalAnswer === "object" &&
        finalAnswer !== null
          ? {
              lat: finalAnswer.lat,
              lng: finalAnswer.lng,
            }
          : {}),
      };

      console.log("SENDING PAYLOAD:", payload);

      // =================================================
      // SELECT ENDPOINT
      // =================================================

     // ✅ Get token
const token = await AsyncStorage.getItem('userToken');
if (!token) {
  Alert.alert('Error', 'You are not logged in.');
  setLoading(false);
  return;
}

const endpoint =
  source === "image"
    ? "http://10.0.2.2:8000/flow/next"
    : "http://10.0.2.2:5002/text-chat";

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,   // ← added
  },
  body: JSON.stringify(payload),
});

      // =================================================
      // RESPONSE
      // =================================================

      const contentType =
        response.headers.get("content-type");

      let data;

      if (
        contentType &&
        contentType.includes("application/json")
      ) {
        data = await response.json();
      } else {
        const raw = await response.text();

        console.warn(
          "NON JSON RESPONSE:",
          raw
        );

        Alert.alert(
          "Server Error",
          "The server returned an unexpected response."
        );

        setLoading(false);
        return;
      }

      console.log("FLOW RESPONSE:", data);

      // =================================================
      // FINAL RESULT
      // =================================================

      if (data.success) {
        setLoading(false);

        setQuestionData(null);

        setFinalDecision(data);

        setShowSummaryScreen(true);

        setProgress(100);

        return;
      }

      // =================================================
      // NEXT QUESTION
      // =================================================

      const nextQ =
        data.next_question || data.question;

      if (nextQ) {
        setQuestionData(nextQ);

        setSelectedOption(null);

        setProgress((prev) =>
          Math.min(prev + 20, 90)
        );

        setSelectedLocation(null);
        setLocationAddress("");
        setShowLocationPicker(false);

        setLoading(false);

        return;
      }

      setLoading(false);
    } catch (err) {
      console.error("HANDLE ANSWER ERROR:", err);

      Alert.alert(
        "Connection Error",
        "Unable to communicate with the server. Please try again."
      );

      setLoading(false);
    }
  };

  // =====================================================
  // TOGGLE SUMMARY SECTION
  // =====================================================

  const toggleSection = (index) => {
    setExpandedSections((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  // =====================================================
  // NAVIGATE TO PROVIDERS
  // =====================================================

  const navigateToProviders = () => {
    navigation.navigate("ProvidersScreen", {
      userAnswers,
      finalDecision,
      initialMessage,
    });
  };

  // =====================================================
  // LOADING SCREEN
  // =====================================================

  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: isDarkMode
              ? "#111827"
              : "#F8FAFC",
          },
        ]}
      >
        <View style={styles.centerContainer}>
          <View
            style={[
              styles.loadingIconContainer,
              {
                backgroundColor: isDarkMode
                  ? "#312E81"
                  : "#EEF2FF",
              },
            ]}
          >
            <ActivityIndicator
              size="large"
              color="#6366F1"
            />
          </View>

          <Text
            style={[
              styles.loadingTitle,
              {
                color: isDarkMode
                  ? "#F9FAFB"
                  : "#111827",
              },
            ]}
          >
            Preparing your request
          </Text>

          <Text
            style={[
              styles.loadingText,
              {
                color: isDarkMode
                  ? "#9CA3AF"
                  : "#64748B",
              },
            ]}
          >
            Please wait while we process your
            information...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // PROFESSIONAL FINAL SUMMARY SCREEN
  // =====================================================

  if (
    finalDecision &&
    showSummaryScreen
  ) {
    const summaryText =
      typeof finalDecision.summary === "string"
        ? finalDecision.summary
        : finalDecision.final_decision
            ?.issue_summary ||
          finalDecision.final_decision
            ?.location_summary ||
          finalDecision.summary
            ?.brief_description ||
          finalDecision.request_summary
            ?.description ||
          "Your service request is ready.";

    const serviceType =
      finalDecision.service_type ||
      finalDecision.final_decision
        ?.service_type ||
      finalDecision.request_summary
        ?.service_type ||
      "Service Request";

    const locationAnswer =
      userAnswers.find((item) => {
        const question =
          item.question?.toLowerCase() || "";

        return (
          question.includes("location") ||
          question.includes("address") ||
          question.includes("area")
        );
      });

    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: isDarkMode
              ? "#111827"
              : "#F8FAFC",
          },
        ]}
      >
        <StatusBar
          barStyle={
            isDarkMode
              ? "light-content"
              : "dark-content"
          }
          backgroundColor={
            isDarkMode
              ? "#111827"
              : "#F8FAFC"
          }
        />

        <ScrollView
          style={[
            styles.summaryContainer,
            {
              backgroundColor: isDarkMode
                ? "#111827"
                : "#F8FAFC",
            },
          ]}
          contentContainerStyle={
            styles.summaryContent
          }
          showsVerticalScrollIndicator={false}
        >

          {/* ===========================================
              SUCCESS HEADER
          =========================================== */}

          <View style={styles.successHeader}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <Ionicons
                  name="checkmark"
                  size={32}
                  color="#FFFFFF"
                />
              </View>
            </View>

            <Text
              style={[
                styles.successTitle,
                {
                  color: isDarkMode
                    ? "#F9FAFB"
                    : "#111827",
                },
              ]}
            >
              Request Ready
            </Text>

            <Text
              style={[
                styles.successSubtitle,
                {
                  color: isDarkMode
                    ? "#9CA3AF"
                    : "#64748B",
                },
              ]}
            >
              We've collected everything needed
              to find the right caregiver for you.
            </Text>
          </View>

          {/* ===========================================
              SERVICE SUMMARY
          =========================================== */}

          <View
            style={[
              styles.serviceSummaryCard,
              {
                backgroundColor: isDarkMode
                  ? "#1F2937"
                  : "#FFFFFF",
                borderColor: isDarkMode
                  ? "#374151"
                  : "#E5E7EB",
              },
            ]}
          >
            <View style={styles.serviceHeaderRow}>
              <View
                style={styles.serviceIconContainer}
              >
                <Ionicons
                  name="construct-outline"
                  size={24}
                  color="#6366F1"
                />
              </View>

              <View style={styles.serviceHeaderText}>
                <Text
                  style={[
                    styles.serviceLabel,
                    {
                      color: isDarkMode
                        ? "#9CA3AF"
                        : "#64748B",
                    },
                  ]}
                >
                  SERVICE REQUEST
                </Text>

                <Text
                  style={[
                    styles.serviceTitle,
                    {
                      color: isDarkMode
                        ? "#F9FAFB"
                        : "#111827",
                    },
                  ]}
                >
                  {serviceType}
                </Text>
              </View>

              <View style={styles.readyBadge}>
                <Ionicons
                  name="checkmark-circle"
                  size={15}
                  color="#16A34A"
                />

                <Text style={styles.readyBadgeText}>
                  Ready
                </Text>
              </View>
            </View>

            {/* AI SUMMARY */}

            <View
              style={[
                styles.aiSummaryBox,
                {
                  backgroundColor: isDarkMode
                    ? "#312E81"
                    : "#EEF2FF",
                },
              ]}
            >
              <View style={styles.aiSummaryHeader}>
                <Ionicons
                  name="sparkles"
                  size={18}
                  color="#6366F1"
                />

                <Text
                  style={[
                    styles.aiSummaryTitle,
                    {
                      color: isDarkMode
                        ? "#C7D2FE"
                        : "#4338CA",
                    },
                  ]}
                >
                  AI Assessment
                </Text>
              </View>

              <Text
                style={[
                  styles.aiSummaryText,
                  {
                    color: isDarkMode
                      ? "#E0E7FF"
                      : "#3730A3",
                  },
                ]}
              >
                {summaryText}
              </Text>
            </View>
          </View>

          {/* ===========================================
              LOCATION CARD
          =========================================== */}

          {locationAnswer &&
            locationAnswer.answer !==
              "Skipped" && (
              <View
                style={[
                  styles.locationSummaryCard,
                  {
                    backgroundColor: isDarkMode
                      ? "#1F2937"
                      : "#FFFFFF",
                    borderColor: isDarkMode
                      ? "#374151"
                      : "#E5E7EB",
                  },
                ]}
              >
                <View style={styles.cardTitleRow}>
                  <View
                    style={
                      styles.smallIconContainer
                    }
                  >
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#6366F1"
                    />
                  </View>

                  <View>
                    <Text
                      style={[
                        styles.cardTitle,
                        {
                          color: isDarkMode
                            ? "#F9FAFB"
                            : "#111827",
                        },
                      ]}
                    >
                      Service Location
                    </Text>

                    <Text
                      style={[
                        styles.cardSubtitle,
                        {
                          color: isDarkMode
                            ? "#9CA3AF"
                            : "#64748B",
                        },
                      ]}
                    >
                      Where the service is needed
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.locationTextBox,
                    {
                      backgroundColor:
                        isDarkMode
                          ? "#374151"
                          : "#F8FAFC",
                    },
                  ]}
                >
                  <Ionicons
                    name="navigate-outline"
                    size={18}
                    color="#6366F1"
                  />

                  <Text
                    style={[
                      styles.locationText,
                      {
                        color: isDarkMode
                          ? "#D1D5DB"
                          : "#334155",
                      },
                    ]}
                  >
                    {locationAnswer.answer}
                  </Text>
                </View>
              </View>
            )}

          {/* ===========================================
              RESPONSES
          =========================================== */}

          <View style={styles.responsesSection}>
            <View style={styles.responsesHeader}>
              <View>
                <Text
                  style={[
                    styles.responsesTitle,
                    {
                      color: isDarkMode
                        ? "#F9FAFB"
                        : "#111827",
                    },
                  ]}
                >
                  Your Responses
                </Text>

                <Text
                  style={[
                    styles.responsesSubtitle,
                    {
                      color: isDarkMode
                        ? "#9CA3AF"
                        : "#64748B",
                    },
                  ]}
                >
                  Information provided during
                  assessment
                </Text>
              </View>

              <View
                style={[
                  styles.responseCount,
                  {
                    backgroundColor: isDarkMode
                      ? "#312E81"
                      : "#EEF2FF",
                  },
                ]}
              >
                <Text
                  style={styles.responseCountText}
                >
                  {userAnswers.length}
                </Text>
              </View>
            </View>

            {userAnswers.map(
              (item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.responseCard,
                    {
                      backgroundColor:
                        isDarkMode
                          ? "#1F2937"
                          : "#FFFFFF",
                      borderColor: isDarkMode
                        ? "#374151"
                        : "#E5E7EB",
                    },
                  ]}
                  onPress={() =>
                    toggleSection(index)
                  }
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.responseNumber,
                      {
                        backgroundColor:
                          isDarkMode
                            ? "#312E81"
                            : "#EEF2FF",
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.responseNumberText
                      }
                    >
                      {index + 1}
                    </Text>
                  </View>

                  <View
                    style={styles.responseContent}
                  >
                    <Text
                      style={[
                        styles.responseQuestion,
                        {
                          color: isDarkMode
                            ? "#F9FAFB"
                            : "#1E293B",
                        },
                      ]}
                    >
                      {item.question}
                    </Text>

                    {!expandedSections[
                      index
                    ] &&
                      item.answer !==
                        "Skipped" && (
                        <Text
                          style={[
                            styles.responsePreview,
                            {
                              color:
                                isDarkMode
                                  ? "#9CA3AF"
                                  : "#64748B",
                            },
                          ]}
                          numberOfLines={1}
                        >
                          {formatAnswer(
                            item.answer
                          )}
                        </Text>
                      )}

                    {expandedSections[
                      index
                    ] && (
                      <View
                        style={[
                          styles.expandedAnswer,
                          {
                            borderTopColor:
                              isDarkMode
                                ? "#374151"
                                : "#E5E7EB",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.expandedAnswerText,
                            {
                              color:
                                isDarkMode
                                  ? "#D1D5DB"
                                  : "#475569",
                            },
                          ]}
                        >
                          {formatAnswer(
                            item.answer
                          )}
                        </Text>
                      </View>
                    )}
                  </View>

                  <Ionicons
                    name={
                      expandedSections[index]
                        ? "chevron-up"
                        : "chevron-down"
                    }
                    size={20}
                    color={
                      isDarkMode
                        ? "#9CA3AF"
                        : "#94A3B8"
                    }
                  />
                </TouchableOpacity>
              )
            )}
          </View>

          {/* ===========================================
              COMPLETION CARD
          =========================================== */}

          <View
            style={[
              styles.completionCard,
              {
                backgroundColor: isDarkMode
                  ? "#064E3B"
                  : "#ECFDF5",
                borderColor: isDarkMode
                  ? "#065F46"
                  : "#A7F3D0",
              },
            ]}
          >
            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#10B981"
            />

            <View
              style={
                styles.completionTextContainer
              }
            >
              <Text
                style={[
                  styles.completionTitle,
                  {
                    color: isDarkMode
                      ? "#A7F3D0"
                      : "#047857",
                  },
                ]}
              >
                Assessment Complete
              </Text>

              <Text
                style={[
                  styles.completionText,
                  {
                    color: isDarkMode
                      ? "#D1FAE5"
                      : "#065F46",
                  },
                ]}
              >
                Your requirements have been
                successfully analyzed. You can now
                find suitable caregivers.
              </Text>
            </View>
          </View>

          {/* ===========================================
              FIND CAREGIVERS
          =========================================== */}

          <TouchableOpacity
            style={
              styles.findCaregiverButton
            }
            onPress={navigateToProviders}
            activeOpacity={0.85}
          >
            <View
              style={styles.findButtonIcon}
            >
              <Ionicons
                name="search"
                size={21}
                color="#FFFFFF"
              />
            </View>

            <View
              style={
                styles.findButtonTextContainer
              }
            >
              <Text
                style={styles.findButtonTitle}
              >
                Find Caregivers
              </Text>

              <Text
                style={
                  styles.findButtonSubtitle
                }
              >
                Discover suitable service
                providers
              </Text>
            </View>

            <Ionicons
              name="arrow-forward"
              size={22}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {/* ===========================================
              FOOTER
          =========================================== */}

          <View style={styles.summaryFooter}>
            <Ionicons
              name="lock-closed-outline"
              size={14}
              color={
                isDarkMode
                  ? "#6B7280"
                  : "#94A3B8"
              }
            />

            <Text
              style={[
                styles.footerText,
                {
                  color: isDarkMode
                    ? "#6B7280"
                    : "#94A3B8",
                },
              ]}
            >
              Your information is used only to
              improve caregiver matching.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // =====================================================
  // NO QUESTION
  // =====================================================

  if (!questionData) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: isDarkMode
              ? "#1F2937"
              : "#FFFFFF",
          },
        ]}
      >
        <View style={styles.centerContainer}>
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color="#6366F1"
          />

          <Text
            style={{
              color: isDarkMode
                ? "#F9FAFB"
                : "#1F2937",
              marginTop: 12,
              fontSize: 16,
            }}
          >
            No question available
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // LOCATION QUESTION SCREEN
  // =====================================================

  if (
    questionData.type === "address" ||
    questionData.question
      ?.toLowerCase()
      .includes("address") ||
    questionData.question
      ?.toLowerCase()
      .includes("location") ||
    questionData.question
      ?.toLowerCase()
      .includes("area")
  ) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          {
            backgroundColor: isDarkMode
              ? "#1F2937"
              : "#FFFFFF",
          },
        ]}
      >
        <StatusBar
          barStyle={
            isDarkMode
              ? "light-content"
              : "dark-content"
          }
          backgroundColor={
            isDarkMode
              ? "#1F2937"
              : "#FFFFFF"
          }
        />

        <View
          style={[
            styles.container,
            {
              backgroundColor: isDarkMode
                ? "#1F2937"
                : "#FFFFFF",
            },
          ]}
        >
          {/* PROGRESS */}

          <View style={styles.progressSection}>
            <View
              style={
                styles.progressBarContainer
              }
            >
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${progress}%`,
                  },
                ]}
              />
            </View>

            <Text style={styles.progressText}>
              {progress}% Complete
            </Text>
          </View>

          {/* HEADER */}

          <View style={styles.headerSection}>
            <Text
              style={[
                styles.mainTitle,
                {
                  color: isDarkMode
                    ? "#F9FAFB"
                    : "#1F2937",
                },
              ]}
            >
              Location Details
            </Text>

            <View
              style={[
                styles.questionCard,
                {
                  backgroundColor: isDarkMode
                    ? "#374151"
                    : "#F3F4F6",
                },
              ]}
            >
              <Text
                style={[
                  styles.questionText,
                  {
                    color: isDarkMode
                      ? "#F9FAFB"
                      : "#1F2937",
                  },
                ]}
              >
                {questionData.question}
              </Text>
            </View>
          </View>

          {/* MAP BUTTON */}

          <TouchableOpacity
            style={[
              styles.locationPickerButton,
              {
                backgroundColor: isDarkMode
                  ? "#374151"
                  : "#F3F4F6",
                borderColor: isDarkMode
                  ? "#4B5563"
                  : "#E5E7EB",
              },
            ]}
            onPress={() =>
              setShowLocationPicker(true)
            }
          >
            <Ionicons
              name="map-outline"
              size={24}
              color="#6366F1"
            />

            <Text
              style={
                styles.locationPickerButtonText
              }
            >
              Pick Location on Map
            </Text>
          </TouchableOpacity>

          {/* ADDRESS SEARCH */}

          <View
            style={styles.addressSection}
          >
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
              onPress={(
                data,
                details = null
              ) => {
                const answerObj = {
                  address:
                    data.description,
                  placeId:
                    data.place_id,
                  lat:
                    details?.geometry
                      ?.location?.lat,
                  lng:
                    details?.geometry
                      ?.location?.lng,
                };

                setSelectedOption(
                  answerObj
                );

                setSelectedLocation(
                  null
                );

                setLocationAddress(
                  data.description
                );
              }}
              styles={{
                container: {
                  flex: 0,
                },

                textInput: {
                  ...styles.addressInput,
                  backgroundColor:
                    isDarkMode
                      ? "#374151"
                      : "#F9FAFB",
                  borderColor:
                    isDarkMode
                      ? "#4B5563"
                      : "#E5E7EB",
                  color:
                    isDarkMode
                      ? "#F9FAFB"
                      : "#1F2937",
                },

                listView: {
                  ...styles.addressListView,
                  backgroundColor:
                    isDarkMode
                      ? "#374151"
                      : "#FFFFFF",
                },

                row: {
                  ...styles.addressRow,
                  backgroundColor:
                    isDarkMode
                      ? "#374151"
                      : "#FFFFFF",
                  borderBottomColor:
                    isDarkMode
                      ? "#4B5563"
                      : "#E5E7EB",
                },

                description: {
                  fontSize: 14,
                  color:
                    isDarkMode
                      ? "#D1D5DB"
                      : "#6B7280",
                },
              }}
              textInputProps={{
                placeholderTextColor:
                  "#9CA3AF",

                onChangeText: (
                  text
                ) => {
                  setLocationAddress(
                    text
                  );

                  setSelectedOption({
                    address: text,
                  });

                  setSelectedLocation(
                    null
                  );
                },
              }}
            />
          </View>

          {/* NAVIGATION */}

          <View
            style={styles.navigationButtons}
          >
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() =>
                navigation.goBack()
              }
            >
              <Text
                style={[
                  styles.backBtnText,
                  {
                    color: isDarkMode
                      ? "#9CA3AF"
                      : "#6B7280",
                  },
                ]}
              >
                ← Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.nextBtn,
                (selectedLocation ||
                  selectedOption) &&
                  styles.nextBtnActive,
              ]}
              onPress={() => {
                if (selectedLocation) {
                  handleAnswer({
                    address:
                      locationAddress,
                    lat:
                      selectedLocation.latitude,
                    lng:
                      selectedLocation.longitude,
                  });
                } else if (
                  selectedOption
                ) {
                  handleAnswer(
                    selectedOption
                  );
                } else {
                  handleAnswer();
                }
              }}
            >
              <Text
                style={styles.nextBtnText}
              >
                {selectedLocation ||
                selectedOption
                  ? "Next"
                  : "Skip"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ===========================================
              LOCATION MODAL
          =========================================== */}

          <Modal
            visible={
              showLocationPicker
            }
            animationType="slide"
            presentationStyle="fullScreen"
          >
            <SafeAreaView
              style={[
                styles.modalContainer,
                {
                  backgroundColor:
                    isDarkMode
                      ? "#1F2937"
                      : "#FFFFFF",
                },
              ]}
            >
              {/* MODAL HEADER */}

              <View
                style={[
                  styles.modalHeader,
                  {
                    borderBottomColor:
                      isDarkMode
                        ? "#4B5563"
                        : "#E5E7EB",
                    backgroundColor:
                      isDarkMode
                        ? "#1F2937"
                        : "#FFFFFF",
                  },
                ]}
              >
                <TouchableOpacity
                  onPress={() =>
                    setShowLocationPicker(
                      false
                    )
                  }
                  style={
                    styles.modalCloseButton
                  }
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={
                      isDarkMode
                        ? "#F9FAFB"
                        : "#1F2937"
                    }
                  />
                </TouchableOpacity>

                <Text
                  style={[
                    styles.modalTitle,
                    {
                      color: isDarkMode
                        ? "#F9FAFB"
                        : "#1F2937",
                    },
                  ]}
                >
                  Select Location
                </Text>

                <View
                  style={{
                    width: 40,
                  }}
                />
              </View>

              {/* LOADING */}

              {pickingLocation && (
                <View
                  style={
                    styles.loadingOverlay
                  }
                >
                  <ActivityIndicator
                    size="large"
                    color="#6366F1"
                  />

                  <Text
                    style={{
                      color: "#FFFFFF",
                      marginTop: 10,
                    }}
                  >
                    Getting your location...
                  </Text>
                </View>
              )}

              {/* MAP */}

              {MapView ? (
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  region={currentRegion}
                  onPress={
                    handleMapPress
                  }
                  showsUserLocation={
                    true
                  }
                  showsMyLocationButton={
                    true
                }
                >
                  {selectedLocation && (
                    <Marker
                      coordinate={
                        selectedLocation
                      }
                      draggable
                      onDragEnd={(e) => {
                        const {
                          coordinate,
                        } =
                          e.nativeEvent;

                        setSelectedLocation(
                          coordinate
                        );

                        reverseGeocode(
                          coordinate
                        );
                      }}
                    >
                      <View
                        style={
                          styles.markerContainer
                        }
                      >
                        <Ionicons
                          name="location"
                          size={38}
                          color="#6366F1"
                        />
                      </View>
                    </Marker>
                  )}
                </MapView>
              ) : (
                <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#F3F4F6' }]}>
                  <Text style={{ fontSize: 16, color: '#374151', textAlign: 'center', paddingHorizontal: 24 }}>
                    The map picker is not available in the web browser. Please use the mobile app for location selection.
                  </Text>
                </View>
              )}

              {/* MY LOCATION */}

              <View
                style={
                  styles.locationControls
                }
              >
                <TouchableOpacity
                  style={[
                    styles.currentLocationButton,
                    {
                      backgroundColor:
                        isDarkMode
                          ? "#374151"
                          : "#FFFFFF",
                      borderColor:
                        isDarkMode
                          ? "#4B5563"
                          : "#E5E7EB",
                    },
                  ]}
                  onPress={
                    getCurrentLocation
                  }
                >
                  <Ionicons
                    name="locate"
                    size={20}
                    color="#6366F1"
                  />

                  <Text
                    style={
                      styles.currentLocationText
                    }
                  >
                    My Location
                  </Text>
                </TouchableOpacity>
              </View>

              {/* LOCATION DETAILS */}

              {selectedLocation && (
                <View
                  style={[
                    styles.locationDetails,
                    {
                      backgroundColor:
                        isDarkMode
                          ? "#1F2937"
                          : "#FFFFFF",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.selectedAddressLabel,
                      {
                        color:
                          isDarkMode
                            ? "#9CA3AF"
                            : "#6B7280",
                      },
                    ]}
                  >
                    Selected Address
                  </Text>

                  <Text
                    style={[
                      styles.selectedAddress,
                      {
                        color:
                          isDarkMode
                            ? "#F9FAFB"
                            : "#1F2937",
                      },
                    ]}
                  >
                    {locationAddress ||
                      "Selected location"}
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.confirmButton
                    }
                    onPress={
                      confirmLocation
                    }
                  >
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />

                    <Text
                      style={
                        styles.confirmButtonText
                      }
                    >
                      Confirm Location
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </SafeAreaView>
          </Modal>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN QUESTION SCREEN
  // =====================================================

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        {
          backgroundColor: isDarkMode
            ? "#1F2937"
            : "#FFFFFF",
        },
      ]}
    >
      <StatusBar
        barStyle={
          isDarkMode
            ? "light-content"
            : "dark-content"
        }
        backgroundColor={
          isDarkMode
            ? "#1F2937"
            : "#FFFFFF"
        }
      />

      <View
        style={[
          styles.container,
          {
            backgroundColor: isDarkMode
              ? "#1F2937"
              : "#FFFFFF",
          },
        ]}
      >
        {/* PROGRESS */}

        <View style={styles.progressSection}>
          <View
            style={
              styles.progressBarContainer
            }
          >
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {progress}% Complete
          </Text>
        </View>

        {/* HEADER */}

        <View style={styles.headerSection}>
          <Text
            style={[
              styles.mainTitle,
              {
                color: isDarkMode
                  ? "#F9FAFB"
                  : "#1F2937",
              },
            ]}
          >
            Service Assessment
          </Text>

          <View
            style={[
              styles.questionCard,
              {
                backgroundColor:
                  isDarkMode
                    ? "#374151"
                    : "#F3F4F6",
              },
            ]}
          >
            <Text
              style={[
                styles.questionText,
                {
                  color: isDarkMode
                    ? "#F9FAFB"
                    : "#1F2937",
                },
              ]}
            >
              {questionData.question}
            </Text>
          </View>
        </View>

        {/* OPTIONS */}

        <ScrollView
          style={styles.optionsSection}
          showsVerticalScrollIndicator={
            false
          }
        >
          {questionData.options?.map(
            (opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionItem,
                  {
                    backgroundColor:
                      isDarkMode
                        ? "#374151"
                        : "#FFFFFF",
                    borderColor:
                      isDarkMode
                        ? "#4B5563"
                        : "#E5E7EB",
                  },

                  selectedOption ===
                    opt && [
                    styles.optionItemSelected,
                    {
                      backgroundColor:
                        isDarkMode
                          ? "#4C1D95"
                          : "#EEF2FF",
                      borderColor:
                        "#6366F1",
                    },
                  ],
                ]}
                onPress={() =>
                  setSelectedOption(opt)
                }
                activeOpacity={0.7}
              >
                <View
                  style={
                    styles.optionContent
                  }
                >
                  <View
                    style={[
                      styles.radioCircle,
                      {
                        borderColor:
                          isDarkMode
                            ? "#6B7280"
                            : "#D1D5DB",
                      },
                      selectedOption ===
                        opt &&
                        styles.radioCircleSelected,
                    ]}
                  >
                    {selectedOption ===
                      opt && (
                      <View
                        style={
                          styles.radioInner
                        }
                      />
                    )}
                  </View>

                  <Text
                    style={[
                      styles.optionText,
                      {
                        color: isDarkMode
                          ? "#F9FAFB"
                          : "#1F2937",
                      },
                      selectedOption ===
                        opt &&
                        styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </View>

                {selectedOption ===
                  opt && (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#6366F1"
                  />
                )}
              </TouchableOpacity>
            )
          )}
        </ScrollView>

        {/* NAVIGATION */}

        <View
          style={[
            styles.navigationButtons,
            {
              borderTopColor:
                isDarkMode
                  ? "#374151"
                  : "#E5E7EB",
            },
          ]}
        >
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() =>
              navigation.goBack()
            }
          >
            <Text
              style={[
                styles.backBtnText,
                {
                  color: isDarkMode
                    ? "#9CA3AF"
                    : "#6B7280",
                },
              ]}
            >
              ← Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.nextBtn,
              selectedOption &&
                styles.nextBtnActive,
            ]}
            onPress={() =>
              handleAnswer()
            }
          >
            <Text
              style={
                styles.nextBtnText
              }
            >
              {selectedOption
                ? "Next"
                : "Skip"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

// =======================================================
// STYLES
// =======================================================

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
    paddingHorizontal: 30,
  },

  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  loadingTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 7,
  },

  loadingText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
  },

  // =====================================================
  // PROGRESS
  // =====================================================

  progressSection: {
    marginBottom: 24,
  },

  progressBarContainer: {
    height: 5,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 8,
  },

  progressBar: {
    height: "100%",
    backgroundColor: "#6366F1",
    borderRadius: 3,
  },

  progressText: {
    fontSize: 12,
    color: "#6366F1",
    textAlign: "right",
    fontWeight: "600",
  },

  // =====================================================
  // QUESTION
  // =====================================================

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

  // =====================================================
  // NAVIGATION
  // =====================================================

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
    fontWeight: "500",
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
    color: "#FFFFFF",
  },

  // =====================================================
  // ADDRESS
  // =====================================================

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
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  addressRow: {
    padding: 14,
    borderBottomWidth: 0.5,
  },

  // =====================================================
  // LOCATION PICKER
  // =====================================================

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
    fontWeight: "600",
  },

  // =====================================================
  // MODAL
  // =====================================================

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
    backgroundColor: "rgba(0,0,0,0.55)",
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
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
  },

  currentLocationText: {
    marginLeft: 8,
    fontWeight: "600",
    color: "#6366F1",
  },

  locationDetails: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    elevation: 8,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },

  selectedAddressLabel: {
    fontSize: 12,
    marginBottom: 5,
    fontWeight: "600",
  },

  selectedAddress: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },

  confirmButton: {
    backgroundColor: "#6366F1",
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },

  confirmButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
    marginLeft: 7,
  },

  // =====================================================
  // PROFESSIONAL SUMMARY
  // =====================================================

  summaryContainer: {
    flex: 1,
  },

  summaryContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },

  // Success Header

  successHeader: {
    alignItems: "center",
    marginBottom: 28,
  },

  successIconOuter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  successIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#6366F1",
    justifyContent: "center",
    alignItems: "center",
  },

  successTitle: {
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
  },

  successSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 320,
  },

  // Service Summary

  serviceSummaryCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 16,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  serviceHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  serviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  serviceHeaderText: {
    flex: 1,
  },

  serviceLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },

  serviceTitle: {
    fontSize: 17,
    fontWeight: "700",
  },

  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
  },

  readyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
    marginLeft: 4,
  },

  // AI Summary

  aiSummaryBox: {
    marginTop: 18,
    padding: 15,
    borderRadius: 14,
  },

  aiSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  aiSummaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 7,
  },

  aiSummaryText: {
    fontSize: 14,
    lineHeight: 21,
  },

  // Location

  locationSummaryCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },

  smallIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },

  cardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },

  locationTextBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 10,
  },

  locationText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    marginLeft: 9,
  },

  // Responses

  responsesSection: {
    marginBottom: 20,
  },

  responsesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  responsesTitle: {
    fontSize: 19,
    fontWeight: "700",
  },

  responsesSubtitle: {
    fontSize: 12,
    marginTop: 3,
  },

  responseCount: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },

  responseCountText: {
    color: "#6366F1",
    fontSize: 13,
    fontWeight: "800",
  },

  responseCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 10,

    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 5,
    elevation: 1,
  },

  responseNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  responseNumberText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6366F1",
  },

  responseContent: {
    flex: 1,
    marginRight: 8,
  },

  responseQuestion: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },

  responsePreview: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },

  expandedAnswer: {
    borderTopWidth: 1,
    marginTop: 9,
    paddingTop: 9,
  },

  expandedAnswerText: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Completion

  completionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
  },

  completionTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  completionTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },

  completionText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // Find Caregivers

  findCaregiverButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderRadius: 16,
    marginBottom: 18,

    shadowColor: "#6366F1",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },

  findButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor:
      "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  findButtonTextContainer: {
    flex: 1,
  },

  findButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  findButtonSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 2,
  },

  // Footer

  summaryFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
  },

  footerText: {
    fontSize: 10,
    marginLeft: 5,
    textAlign: "center",
  },
});