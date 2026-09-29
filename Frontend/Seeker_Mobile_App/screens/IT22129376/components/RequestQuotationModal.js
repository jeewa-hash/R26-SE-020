import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import MapView, { Marker } from "react-native-maps";
import * as ExpoLocation from "expo-location";
import { createRequestQuotation } from "../services/requestQuotationApi";

const TIME_WINDOWS = {
  Morning: [9, 12],
  Afternoon: [13, 17],
  Evening: [17, 20],
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
  initialDescription = "",
  onClose,
  onSuccess,
}) {
  const [preferredDate, setPreferredDate] = useState(new Date());
  const [preferredTimeLabel, setPreferredTimeLabel] = useState("Morning");
  const [startTime, setStartTime] = useState(atHour(new Date(), 8));
  const [endTime, setEndTime] = useState(atHour(new Date(), 12));
  const [duration, setDuration] = useState("");
  const [budget, setBudget] = useState("");
  const [location, setLocation] = useState(defaultLocation);
  const [coordinates, setCoordinates] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [locating, setLocating] = useState(false);
  const [description, setDescription] = useState(initialDescription);
  const [urgency, setUrgency] = useState(normalizeUrgency(defaultUrgency));
  const [picker, setPicker] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const providerName = useMemo(
    () =>
      provider?.businessName ||
      provider?.fullName ||
      provider?.providerName ||
      provider?.name ||
      "Selected Provider",
    [provider]
  );

  useEffect(() => {
    if (!visible) return;
    const date = new Date();
    setPreferredDate(date);
    setPreferredTimeLabel("Morning");
    setStartTime(atHour(date, 9));
    setEndTime(atHour(date, 12));
    setDuration("");
    setBudget("");
    setLocation(typeof defaultLocation === "string" ? defaultLocation : "");
    setCoordinates(null);
    setShowMap(false);
    setDescription(initialDescription || "");
    setUrgency(normalizeUrgency(defaultUrgency));
    setPicker(null);
  }, [visible, defaultLocation, defaultUrgency, initialDescription]);

  const selectWindow = (label) => {
    setPreferredTimeLabel(label);
    if (TIME_WINDOWS[label]) {
      setStartTime(atHour(preferredDate, TIME_WINDOWS[label][0]));
      setEndTime(atHour(preferredDate, TIME_WINDOWS[label][1]));
    }
  };

  const handlePickerChange = (event, value) => {
    if (Platform.OS === "android") setPicker(null);
    if (!value || event?.type === "dismissed") return;
    if (picker === "date") {
      setPreferredDate(value);
      if (TIME_WINDOWS[preferredTimeLabel]) {
        setStartTime(atHour(value, TIME_WINDOWS[preferredTimeLabel][0]));
        setEndTime(atHour(value, TIME_WINDOWS[preferredTimeLabel][1]));
      }
    } else if (picker === "start") {
      setStartTime(value);
      setPreferredTimeLabel("Custom");
    } else if (picker === "end") {
      setEndTime(value);
      setPreferredTimeLabel("Custom");
    }
  };

  const submit = async () => {
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
    if (!resolvedSeekerId) return Alert.alert("Sign in required", "Please sign in before requesting a quotation.");
    if (!providerId) return Alert.alert("Provider unavailable", "Please select a provider again.");
    if (!sessionId) return Alert.alert("Service details unavailable", "Please complete the service diagnosis first.");
    if (!preferredDate || !startTime || !endTime)
      return Alert.alert("Missing time", "Please select a preferred date and time.");
    if (!location.trim()) return Alert.alert("Missing location", "Please enter your service location.");
    if (!duration.trim() || Number(duration) <= 0)
      return Alert.alert("Missing duration", "Please enter your estimated duration.");
    if (!budget.trim() || Number(budget) < 0 || Number.isNaN(Number(budget)))
      return Alert.alert("Missing budget", "Please enter your budget amount.");

    const preferredStartTime = new Date(preferredDate);
    preferredStartTime.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0);
    const preferredEndTime = new Date(preferredDate);
    preferredEndTime.setHours(endTime.getHours(), endTime.getMinutes(), 0, 0);
    if (preferredEndTime <= preferredStartTime)
      return Alert.alert("Invalid time", "Preferred end time must be after the start time.");

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
      return Alert.alert("Service details unavailable", "Please complete the service diagnosis first.");

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
        description.trim(),
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
      preferredEndTime: preferredEndTime.toISOString(),
      preferredTimeLabel,
      seekerEstimatedDurationHours: Number(duration),
      seekerBudgetAmount: Number(budget),
    };

    setSubmitting(true);
    try {
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));
      const result = await createRequestQuotation(payload, token);
      onSuccess?.(result, providerId);
    } catch (error) {
      const isDuplicate = error.status === 409;
      const isNetworkError = !error.status;
      Alert.alert(
        isDuplicate ? "Already requested" : "Request failed",
        isDuplicate
          ? "You have already requested a quotation from this provider for this service."
          : isNetworkError
          ? "Unable to send the request right now. Please check your connection and try again."
          : "Could not send the quotation request. Please check the details and try again."
      );
    } finally {
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
      if (permission.status !== 'granted') return Alert.alert('Location permission', 'You can still type the service address manually.');
      const current = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
      const point = { latitude: current.coords.latitude, longitude: current.coords.longitude };
      setCoordinates(point);
      await resolveSelectedAddress(point);
    } catch (error) {
      Alert.alert('Location unavailable', 'Unable to get your current location. You can still type the address manually.');
    } finally { setLocating(false); }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Request Quotation</Text>
              <Text style={styles.provider}>To: {providerName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} disabled={submitting}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>
                {firstValue(sessionData?.detectedObject, sessionData?.detected_object, sessionData?.object, diagnosisData?.detectedObject, diagnosisData?.detected_object, "Service")}
              </Text>
              <Text style={styles.summaryCategory}>
                Category: {firstValue(sessionData?.detectedCategory, sessionData?.detected_category, sessionData?.category, diagnosisData?.detectedCategory, diagnosisData?.detected_category, "General")}
              </Text>
            </View>
            <Text style={styles.label}>Requirements &amp; Details</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Describe what work needs to be done..." />
            <Text style={styles.label}>Preferred date</Text>
            <TouchableOpacity style={styles.input} onPress={() => setPicker("date")}>
              <Text>{formatDate(preferredDate)}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Preferred time window</Text>
            <View style={styles.options}>
              {["Morning", "Afternoon", "Evening", "Custom"].map((label) => (
                <TouchableOpacity key={label} style={[styles.chip, preferredTimeLabel === label && styles.chipActive]} onPress={() => selectWindow(label)}>
                  <Text style={preferredTimeLabel === label ? styles.chipTextActive : styles.chipText}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeField}>
                <Text style={styles.label}>Start time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setPicker("start")}><Text>{formatTime(startTime)}</Text></TouchableOpacity>
              </View>
              <View style={styles.timeField}>
                <Text style={styles.label}>End time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setPicker("end")}><Text>{formatTime(endTime)}</Text></TouchableOpacity>
              </View>
            </View>

            {picker && <DateTimePicker value={picker === "date" ? preferredDate : picker === "start" ? startTime : endTime} mode={picker === "date" ? "date" : "time"} minimumDate={picker === "date" ? new Date() : undefined} onChange={handlePickerChange} />}

            <Text style={styles.label}>Estimated duration (hours)</Text>
            <TextInput style={styles.input} value={duration} onChangeText={setDuration} keyboardType="decimal-pad" placeholder="e.g. 2" />
            <Text style={styles.label}>Budget amount (LKR)</Text>
            <TextInput style={styles.input} value={budget} onChangeText={setBudget} keyboardType="decimal-pad" placeholder="e.g. 5000" />
            <Text style={styles.label}>Service location</Text>
            <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Address, city or district" />
            <View style={styles.locationActions}>
              <TouchableOpacity style={styles.locationButton} onPress={() => setShowMap(true)}><Ionicons name="map-outline" size={17} color="#4F46E5" /><Text style={styles.locationButtonText}>Pick from Map</Text></TouchableOpacity>
              <TouchableOpacity style={styles.locationButton} onPress={useCurrentLocation} disabled={locating}><Ionicons name="locate-outline" size={17} color="#4F46E5" /><Text style={styles.locationButtonText}>{locating ? 'Locating...' : 'Use Current Location'}</Text></TouchableOpacity>
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
      </View>
      <Modal visible={showMap} animationType="slide" onRequestClose={() => setShowMap(false)}>
        <View style={styles.mapScreen}>
          <MapView style={styles.map} initialRegion={{ latitude: coordinates?.latitude || 7.8731, longitude: coordinates?.longitude || 80.7718, latitudeDelta: 3.5, longitudeDelta: 3.5 }} onPress={(event) => setCoordinates(event.nativeEvent.coordinate)}>
            {coordinates ? <Marker coordinate={coordinates} /> : null}
          </MapView>
          <View style={styles.mapFooter}><Text style={styles.mapHint}>Tap the map to choose the service location.</Text><View style={styles.mapFooterActions}><TouchableOpacity style={styles.cancel} onPress={() => setShowMap(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.send} disabled={!coordinates} onPress={async () => { await resolveSelectedAddress(coordinates); setShowMap(false); }}><Text style={styles.sendText}>Use Location</Text></TouchableOpacity></View></View>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  card: { maxHeight: "92%", backgroundColor: "#FFF", borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  title: { fontSize: 20, fontWeight: "600", color: "#0F172A" },
  provider: { marginTop: 3, color: "#64748B" },
  body: { padding: 20, paddingBottom: 8 },
  summary: { backgroundColor: "#EEF2FF", padding: 12, borderRadius: 12, marginBottom: 5 },
  summaryTitle: { color: "#3730A3", fontWeight: "600" },
  summaryCategory: { color: "#6366F1", fontSize: 12, marginTop: 3 },
  label: { fontSize: 13, fontWeight: "600", color: "#334155", marginBottom: 7, marginTop: 11 },
  input: { minHeight: 48, borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 12, paddingHorizontal: 14, justifyContent: "center", backgroundColor: "#F8FAFC" },
  textArea: { minHeight: 88, paddingTop: 12, textAlignVertical: "top" },
  options: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#CBD5E1", borderRadius: 18, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  chipText: { color: "#475569" },
  chipTextActive: { color: "#FFF", fontWeight: "600" },
  timeRow: { flexDirection: "row", gap: 12 },
  timeField: { flex: 1 },
  actions: { flexDirection: "row", gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  cancel: { flex: 1, alignItems: "center", padding: 14, borderRadius: 12, borderWidth: 1, borderColor: "#CBD5E1" },
  cancelText: { color: "#475569", fontWeight: "600" },
  send: { flex: 1.5, alignItems: "center", padding: 14, borderRadius: 12, backgroundColor: "#6366F1" },
  sendText: { color: "#FFF", fontWeight: "600" },
  disabled: { opacity: 0.6 },
  locationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
  locationButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#C7D2FE', backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 11, paddingVertical: 9 },
  locationButtonText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },
  coordinatesText: { color: '#64748B', fontSize: 11, marginTop: 7 },
  mapScreen: { flex: 1, backgroundColor: '#FFF' },
  map: { flex: 1 },
  mapFooter: { padding: 18, borderTopWidth: 1, borderTopColor: '#E2E8F0' },
  mapHint: { color: '#475569', marginBottom: 12 },
  mapFooterActions: { flexDirection: 'row', gap: 12 },
});
