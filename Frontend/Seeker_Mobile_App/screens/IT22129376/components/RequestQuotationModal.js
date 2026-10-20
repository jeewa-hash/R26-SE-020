import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  useWindowDimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../../hooks/useTheme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "../../../components/SafeMapView";
import * as ExpoLocation from "expo-location";
import { createRequestQuotation } from "../services/requestQuotationApi";

const showRequestAlert = (title, message) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

const URGENCY_LEVELS = ["Normal", "Today", "Emergency"];
const normalizeUrgency = (value) =>
  URGENCY_LEVELS.includes(value) ? value : "Normal";

const firstValue = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const atHour = (date, hour) => {
  const value = new Date(date);
  value.setHours(hour, 0, 0, 0);
  return value;
};

const formatDate = (date) =>
  date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
const formatTime = (date) =>
  date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

export default function RequestQuotationModal({
  visible,
  provider,
  seekerId,
  sessionData = {},
  diagnosisData = {},
  defaultLocation = "",
  defaultUrgency = "Normal",
  defaultSchedule,
  defaultCoordinates,
  initialDescription = "",
  onClose,
  onSuccess,
  onAlreadyRequested,
}) {
  const { isDarkMode } = useTheme();
  const { width, height } = useWindowDimensions();
  const colors = useMemo(() => isDarkMode ? {
    surface: "#171C28", input: "#222A39", text: "#F1F5F9",
    muted: "#A8B5C7", border: "#43516A", tint: "#29264B",
    accent: "#B4ACFF", primary: "#6366F1",
  } : {
    surface: "#FFFFFF", input: "#F8FAFC", text: "#0F172A",
    muted: "#475569", border: "#CBD5E1", tint: "#EEF2FF",
    accent: "#4338CA", primary: "#6366F1",
  }, [isDarkMode]);
  const styles = useMemo(() => createStyles(colors, width, height), [colors, width, height]);
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [startTime, setStartTime] = useState(atHour(new Date(), 8));
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState(defaultLocation);
  const [coordinates, setCoordinates] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [urgency, setUrgency] = useState(normalizeUrgency(defaultUrgency));
  const [picker, setPicker] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const submissionLock = useRef(false);

  const providerName = useMemo(
    () =>
      provider?.businessName ||
      provider?.fullName ||
      provider?.providerName ||
      provider?.name ||
      "Selected Provider",
    [provider]
  );

  const scheduleDate = defaultSchedule?.date;
  const scheduleStart = defaultSchedule?.startTime;
  const latitude = defaultCoordinates?.lat;
  const longitude = defaultCoordinates?.lng;
  useEffect(() => {
    if (!visible) return;
    const candidate = scheduleDate ? new Date(`${scheduleDate}T12:00:00`) : new Date();
    const date = Number.isNaN(candidate.getTime()) ? new Date() : candidate;
    setPreferredDate(date);
    const start = atHour(date, 9);
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(scheduleStart || '')) {
      const [hours, minutes] = scheduleStart.split(':').map(Number);
      start.setHours(hours, minutes, 0, 0);
    }
    setStartTime(start);
    setBudget("");
    setLocation(typeof defaultLocation === "string" ? defaultLocation : "");
    setCoordinates(Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude } : null);
    setShowMap(false);
    setUrgency(normalizeUrgency(defaultUrgency));
    setPicker(null);
  }, [visible, defaultLocation, defaultUrgency, initialDescription, scheduleDate, scheduleStart, latitude, longitude]);

  const handlePickerChange = (event, value) => {
    if (Platform.OS === "android") setPicker(null);
    if (!value || event?.type === "dismissed") return;
    if (picker === "date") {
      setPreferredDate(value);
    } else if (picker === "start") {
      setStartTime(value);
    }
  };

  const submit = async () => {
    if (submissionLock.current) return;
    const explicitProviderId = firstValue(
      provider?.providerId?._id,
      provider?.providerId,
      provider?.provider?._id,
      provider?.provider?.id,
      provider?.userId,
      provider?.serviceProviderId,
      provider?.serviceProvider?._id,
      provider?.serviceProvider?.id,
      provider?.applicantId
    );
    const fallbackProviderId = provider?._id || provider?.id;
    const providerId = explicitProviderId || fallbackProviderId;
    const selectedRecordId = provider?._id || provider?.id || provider?.postId;
    const postId = provider?.postId || (
      explicitProviderId && selectedRecordId && String(selectedRecordId) !== String(providerId)
        ? selectedRecordId
        : null
    );
    const sessionId = firstValue(
      sessionData?.sessionId,
      sessionData?.session_id,
      sessionData?._id,
      diagnosisData?.sessionId,
      diagnosisData?.session_id,
      diagnosisData?._id
    );
    const resolvedSeekerId =
      seekerId ||
      (await AsyncStorage.getItem("seekerId")) ||
      (await AsyncStorage.getItem("userId"));
    if (!resolvedSeekerId) return showRequestAlert("Sign in required", "Please sign in before requesting a quotation.");
    if (!providerId) return showRequestAlert("Provider unavailable", "Please select a provider again.");
    if (!sessionId) return showRequestAlert("Service details unavailable", "Please complete the service diagnosis first.");
    if (!preferredDate || !startTime)
      return showRequestAlert("Missing time", "Please select a preferred date and time.");
    if (!location.trim()) return showRequestAlert("Missing location", "Please enter your service location.");
    if (!budget.trim() || Number(budget) < 0 || Number.isNaN(Number(budget)))
      return showRequestAlert("Missing budget", "Please enter your budget amount.");

    const preferredStartTime = new Date(preferredDate);
    preferredStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);

    const detectedCategory = firstValue(
      sessionData?.detectedCategory,
      sessionData?.detected_category,
      diagnosisData?.detectedCategory,
      diagnosisData?.detected_category,
      sessionData?.category,
      diagnosisData?.category,
      "General"
    );
    const detectedObject = firstValue(
      sessionData?.detectedObject,
      sessionData?.detected_object,
      diagnosisData?.detectedObject,
      diagnosisData?.detected_object,
      sessionData?.object,
      diagnosisData?.object,
      "Service"
    );
    if (!detectedCategory || !detectedObject)
      return showRequestAlert("Service details unavailable", "Please complete the service diagnosis first.");

    const payload = {
      seekerId: resolvedSeekerId,
      providerId,
      postId,
      sessionId,
      detectedCategory,
      detectedObject,
      modelConfidence: firstValue(
        sessionData?.modelConfidence,
        sessionData?.model_confidence,
        diagnosisData?.modelConfidence,
        diagnosisData?.model_confidence,
        null
      ),
      stepBreakdown: firstValue(
        sessionData?.stepBreakdown,
        sessionData?.step_breakdown,
        diagnosisData?.stepBreakdown,
        diagnosisData?.step_breakdown,
        []
      ),
      briefDescription: firstValue(
        initialDescription?.trim(),
        sessionData?.briefDescription,
        sessionData?.brief_description,
        diagnosisData?.briefDescription,
        diagnosisData?.brief_description,
        "Service request"
      ),
      urgencyLevel: urgency,
      serviceLocation: location.trim(),
      serviceLatitude: coordinates?.latitude ?? null,
      serviceLongitude: coordinates?.longitude ?? null,
      location: {
        address: location.trim(),
        lat: coordinates?.latitude ?? null,
        lng: coordinates?.longitude ?? null,
      },
      preferredStartTime: preferredStartTime.toISOString(),
      preferredEndTime: null,
      preferredTimeLabel: formatTime(preferredStartTime),
      seekerBudgetAmount: Number(budget),
    };

    submissionLock.current = true;
    setSubmitting(true);
    try {
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));
      const result = await createRequestQuotation(payload, token);
      onSuccess?.(result, providerId);
    } catch (error) {
      const isDuplicate = error.status === 409;
      if (isDuplicate && onAlreadyRequested) { onAlreadyRequested(error.data, providerId); return; }
      const isNetworkError = !error.status;
      showRequestAlert(
        isDuplicate ? "Already requested" : "Request failed",
        isDuplicate
          ? "You have already requested a quotation from this provider for this service."
          : isNetworkError
          ? "Unable to send the request right now. Please check your connection and try again."
          : "Could not send the quotation request. Please check the details and try again."
      );
    } finally {
      submissionLock.current = false;
      setSubmitting(false);
    }
  };

  const resolveSelectedAddress = async (point) => {
    try {
      const [address] = await ExpoLocation.reverseGeocodeAsync(point);
      const text = [address?.name, address?.street, address?.city, address?.district]
        .filter(Boolean).filter((value, index, list) => list.indexOf(value) === index).join(', ');
      setLocation(text || `${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
    } catch (error) {
      setLocation(`${point.latitude.toFixed(6)}, ${point.longitude.toFixed(6)}`);
    }
  };

  const useCurrentLocation = async () => {
    try {
      setLocating(true);
      const permission = await ExpoLocation.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') return showRequestAlert('Location permission', 'You can still type the service address manually.');
      const current = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(point);
      await resolveSelectedAddress(point);
    } catch (error) {
      showRequestAlert('Location unavailable', 'Unable to get your current location. You can still type the address manually.');
    } finally { setLocating(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <SafeAreaView style={styles.sheetArea} edges={["top", "bottom"]}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Request Quotation</Text>
              <Text style={styles.provider}>To: {providerName}</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} accessibilityLabel="Close quotation form" onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color={colors.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>
                {firstValue(sessionData?.detectedObject, sessionData?.detected_object, sessionData?.object, diagnosisData?.detectedObject, diagnosisData?.detected_object, "Service")}
              </Text>
              <Text style={styles.summaryCategory}>
                Category: {firstValue(sessionData?.detectedCategory, sessionData?.detected_category, sessionData?.category, diagnosisData?.detectedCategory, diagnosisData?.detected_category, "General")}
              </Text>
            </View>
            <Text style={styles.label}>Preferred date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setPicker("date")}>
              <Text style={styles.valueText}>{formatDate(preferredDate)}</Text>
            </TouchableOpacity>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.label}>Start time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setPicker("start")}><Text style={styles.valueText}>{formatTime(startTime)}</Text></TouchableOpacity>
              </View>
            </View>

            {picker && Platform.OS !== "web" && <DateTimePicker themeVariant={isDarkMode ? "dark" : "light"} value={picker === "date" ? preferredDate : startTime} mode={picker === "date" ? "date" : "time"} minimumDate={picker === "date" ? new Date() : undefined} onChange={handlePickerChange} />}

            {picker && Platform.OS === "web" && React.createElement("input", {
              type: picker === "date" ? "date" : "time",
              "aria-label": picker === "date" ? "Preferred date" : "Start time",
              value: picker === "date"
                ? `${preferredDate.getFullYear()}-${String(preferredDate.getMonth() + 1).padStart(2, "0")}-${String(preferredDate.getDate()).padStart(2, "0")}`
                : `${String(startTime.getHours()).padStart(2, "0")}:${String(startTime.getMinutes()).padStart(2, "0")}`,
              onChange: (event) => {
                if (!event.target.value) return;
                const value = picker === "date" ? new Date(`${event.target.value}T12:00:00`) : new Date(startTime);
                if (picker === "start") {
                  const [hours, minutes] = event.target.value.split(":").map(Number);
                  value.setHours(hours, minutes, 0, 0);
                }
                handlePickerChange({ type: "set" }, value);
              },
              style: { width: "100%", boxSizing: "border-box", minHeight: 48, marginTop: 12,
                padding: 12, borderRadius: 12, border: `1px solid ${colors.border}`,
                backgroundColor: colors.input, color: colors.text, colorScheme: isDarkMode ? "dark" : "light" },
            })}

            <Text style={styles.coordinationHint}>Service duration will be estimated automatically during schedule coordination.</Text>
            <Text style={styles.label}>Budget amount (LKR)</Text>
            <TextInput placeholderTextColor={colors.muted} selectionColor={colors.accent} keyboardAppearance={isDarkMode ? "dark" : "light"} style={styles.input} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="e.g. 5000" />
            <Text style={styles.label}>Service location</Text>
            <TextInput placeholderTextColor={colors.muted} selectionColor={colors.accent} keyboardAppearance={isDarkMode ? "dark" : "light"} style={styles.input} value={location} onChangeText={setLocation} placeholder="Address, city or district" />
            <View style={styles.locationActions}>
              <TouchableOpacity style={styles.locationButton} onPress={() => setShowMap(true)}><Ionicons name="map-outline" size={17} color={colors.accent} /><Text style={styles.locationButtonText}>Pick from Map</Text></TouchableOpacity>
              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}><Ionicons name="locate-outline" size={17} color={colors.accent} /><Text style={styles.locationButtonText}>{locating ? 'Locating...' : 'Use Current Location'}</Text></TouchableOpacity>
            </View>
            {coordinates ? <Text style={styles.coordinatesText}>{coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}</Text> : null}
            <Text style={styles.label}>Urgency level</Text>
            <View style={styles.options}>
              {URGENCY_LEVELS.map((label) => (
                <TouchableOpacity key={label} style={[styles.chip, urgency === label && styles.chipActive]} onPress={() => setUrgency(label)}>
                  <Text style={urgency === label ? styles.chipTextActive : styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={submitting}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity style={[styles.send, submitting && styles.disabled]} onPress={submit} disabled={submitting}>
              {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={styles.sendText}>Send Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <SafeAreaView style={styles.mapScreen}>
          <MapView style={styles.map} initialRegion={{ latitude: coordinates?.latitude || 7.8731, longitude: coordinates?.longitude || 80.7718, latitudeDelta: 3.5, longitudeDelta: 3.5 }} onPress={(event) => setCoordinates(event.nativeEvent.coordinate)}>
            {coordinates ? <Marker coordinate={coordinates} /> : null}
          </MapView>
          <View style={styles.mapFooter}><Text style={styles.mapHint}>Tap the map to choose the service location.</Text><View style={styles.mapFooterActions}><TouchableOpacity style={styles.cancel} onPress={() => setShowMap(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={[styles.send, !coordinates && styles.disabled]} disabled={!coordinates} onPress={async () => { await resolveSelectedAddress(coordinates); setShowMap(false); }}><Text style={styles.sendText}>Use Location</Text></TouchableOpacity></View></View>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}

const createStyles = (colors, width, height) => StyleSheet.create({
  sheetArea: { width: "100%", maxWidth: 640, alignSelf: "center", flex: 1, justifyContent: "flex-end" },
  scroll: { flex: 1, minHeight: 0 },
  headerText: { flex: 1, paddingRight: 12 },
  closeButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  valueText: { color: colors.text },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  card: { height: "92%", maxHeight: Math.max(240, height - 24), minHeight: 0, overflow: "hidden", backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: width < 360 ? 14 : 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 20, fontWeight: "600", color: colors.text },
  provider: { marginTop: 3, color: colors.muted },
  body: { padding: width < 360 ? 14 : 20, paddingBottom: 8 },
  summary: { backgroundColor: colors.tint, padding: 12, borderRadius: 12, marginBottom: 5 },
  summaryTitle: { color: colors.accent, fontWeight: "600" },
  summaryCategory: { color: colors.primary, fontSize: 12, marginTop: 3 },
  label: { fontSize: 13, fontWeight: "600", color: colors.text, marginBottom: 7, marginTop: 11 },
  input: { color: colors.text, paddingVertical: 12, minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, justifyContent: "center", backgroundColor: colors.input },
  textArea: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.muted },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  coordinationHint: { fontSize: 12, color: colors.muted, marginTop: 8 },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  actions: { flexDirection: "row", flexWrap: "wrap", flexShrink: 0, gap: 12, padding: width < 360 ? 14 : 20, borderTopWidth: 1, borderTopColor: colors.border },
  cancel: { flex: 1, minWidth: 100, alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.muted, fontWeight: "600" },
  send: { flex: 1.5, minWidth: 140, alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: colors.primary },
  sendText: { color: "#FFF", fontWeight: "600" },
  disabled: { opacity: 0.6 },
  locationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  locationButton: { maxWidth: "100%", flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.tint, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  locationButtonText: { flexShrink: 1, color: colors.accent, fontWeight: '600', fontSize: 12 },
  coordinatesText: { color: colors.muted, fontSize: 11, marginTop: 7 },
  mapScreen: { flex: 1, backgroundColor: colors.surface },
  map: { flex: 1 },
  mapFooter: { padding: 18, borderTopWidth: 1, borderTopColor: colors.border },
  mapHint: { color: colors.muted, marginBottom: 12 },
  mapFooterActions: { flexDirection: 'row', gap: 12 },
});
