import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
  Switch,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import LoginScreen from "./LoginScreen";
import { clearSession, useSession } from "../auth/session";
import api from "../api/client";

export default function ProfileTabScreen() {
  const { user } = useSession();

  const [availability, setAvailability] = useState(null);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);

  // New states for update inputs
  const [availableDays, setAvailableDays] = useState([]);
  const [startTime, setStartTime] = useState(new Date());
  const [endTime, setEndTime] = useState(new Date());
  const [isActive, setIsActive] = useState(true);
  const [showDaysModal, setShowDaysModal] = useState(false);
  const [showStartTimePicker, setShowStartTimePicker] = useState(false);
  const [showEndTimePicker, setShowEndTimePicker] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  if (!user) {
    return <LoginScreen />;
  }

  const handleLogout = async () => {
    clearSession();

    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (_error) {
      console.log("AsyncStorage clear skipped");
    }
  };

  const loadAvailability = async () => {
    try {
      const response = await api.get("/availability/me");

      setAvailability(response.data.data || null);
      setAvailabilityChecked(true);

      // Populate inputs with current data
      if (response.data.data) {
        setAvailableDays(response.data.data.availableDays || []);
        const start = new Date();
        start.setHours(parseInt(response.data.data.workingHours?.start?.split(':')[0] || 8));
        start.setMinutes(parseInt(response.data.data.workingHours?.start?.split(':')[1] || 0));
        setStartTime(start);

        const end = new Date();
        end.setHours(parseInt(response.data.data.workingHours?.end?.split(':')[0] || 17));
        end.setMinutes(parseInt(response.data.data.workingHours?.end?.split(':')[1] || 0));
        setEndTime(end);

        setIsActive(response.data.data.isActive || false);
      }
    } catch (error) {
      setAvailability(null);
      setAvailabilityChecked(true);

      if (error.response?.status !== 404) {
        Alert.alert(
          "Failed to load availability",
          error.response?.data?.message || error.message
        );
      }
    }
  };

  const setupAvailability = async () => {
    try {
      const payload = {
        availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingHours: {
          start: "08:00",
          end: "17:00",
        },
        unavailableSlots: [],
        maxBookingsPerDay: 3,
        isActive: true,
      };

      const response = await api.post("/availability", payload);

      setAvailability(response.data.data);
      setAvailabilityChecked(true);

      Alert.alert("Success", "Provider availability setup completed.");
    } catch (error) {
      Alert.alert(
        "Failed to setup availability",
        error.response?.data?.message || error.message
      );
    }
  };

  const updateAvailability = async () => {
    try {
      const payload = {
        availableDays,
        workingHours: {
          start: `${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`,
          end: `${endTime.getHours().toString().padStart(2, '0')}:${endTime.getMinutes().toString().padStart(2, '0')}`,
        },
        maxBookingsPerDay: 4,
        isActive,
      };

      const response = await api.put("/availability/me", payload);

      setAvailability(response.data.data);

      Alert.alert("Success", "Provider availability updated.");
    } catch (error) {
      Alert.alert(
        "Failed to update availability",
        error.response?.data?.message || error.message
      );
    }
  };

  const toggleDay = (day) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const onStartTimeChange = (event, selectedTime) => {
    setShowStartTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setStartTime(selectedTime);
    }
  };

  const onEndTimeChange = (event, selectedTime) => {
    setShowEndTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      setEndTime(selectedTime);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Email</Text>
          <Text style={styles.fieldValue}>{user.email}</Text>

          <Text style={styles.fieldLabel}>Role</Text>
          <Text style={styles.fieldValue}>{user.role}</Text>
        </View>

        {user.role === "ServiceProvider" && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Provider Availability</Text>

            <TouchableOpacity style={styles.primaryButton} onPress={loadAvailability}>
              <Text style={styles.primaryButtonText}>Check Availability Setup</Text>
            </TouchableOpacity>

            {availabilityChecked && availability && (
              <View style={styles.availabilityBox}>
                <Text style={styles.statusText}>Availability already configured.</Text>

                <Text style={styles.fieldLabel}>Available Days</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowDaysModal(true)}>
                  <Text style={styles.inputText}>
                    {availableDays.length > 0 ? availableDays.join(', ') : 'Select days'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>Start Time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowStartTimePicker(true)}>
                  <Text style={styles.inputText}>
                    {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>End Time</Text>
                <TouchableOpacity style={styles.input} onPress={() => setShowEndTimePicker(true)}>
                  <Text style={styles.inputText}>
                    {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>

                <View style={styles.switchRow}>
                  <Text style={styles.fieldLabel}>Active Status</Text>
                  <Switch
                    value={isActive}
                    onValueChange={setIsActive}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={isActive ? '#f5dd4b' : '#f4f3f4'}
                  />
                </View>

                <TouchableOpacity style={styles.updateButton} onPress={updateAvailability}>
                  <Text style={styles.primaryButtonText}>Update Availability</Text>
                </TouchableOpacity>
              </View>
            )}

            {availabilityChecked && !availability && (
              <View style={styles.availabilityBox}>
                <Text style={styles.statusText}>
                  No availability setup found for this provider.
                </Text>

                <TouchableOpacity style={styles.primaryButton} onPress={setupAvailability}>
                  <Text style={styles.primaryButtonText}>Setup Availability</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          Logout clears the session and returns you to login.
        </Text>

        {/* Days Modal */}
        <Modal
          visible={showDaysModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowDaysModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Select Available Days</Text>
              {daysOfWeek.map(day => (
                <TouchableOpacity
                  key={day}
                  style={styles.checkboxRow}
                  onPress={() => toggleDay(day)}
                >
                  <View style={[styles.checkbox, availableDays.includes(day) && styles.checkboxChecked]}>
                    {availableDays.includes(day) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxText}>{day}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.modalButton} onPress={() => setShowDaysModal(false)}>
                <Text style={styles.modalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Time Pickers */}
        {showStartTimePicker && (
          <DateTimePicker
            value={startTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onStartTimeChange}
          />
        )}

        {showEndTimePicker && (
          <DateTimePicker
            value={endTime}
            mode="time"
            is24Hour={true}
            display="default"
            onChange={onEndTimeChange}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e3a8a",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a8a",
    marginBottom: 16,
  },
  fieldLabel: {
    color: "#6b7280",
    marginBottom: 6,
    fontWeight: "700",
  },
  fieldValue: {
    color: "#111827",
    marginBottom: 14,
    fontSize: 16,
  },
  availabilityBox: {
    marginTop: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusText: {
    color: "#334155",
    fontWeight: "700",
    marginBottom: 14,
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  updateButton: {
    backgroundColor: "#16a34a",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#ef4444",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  logoutButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  note: {
    marginTop: 16,
    color: "#475569",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
  },
  inputText: {
    color: "#111827",
    fontSize: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    width: "80%",
    maxHeight: "70%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1e3a8a",
    marginBottom: 16,
    textAlign: "center",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  checkmark: {
    color: "#ffffff",
    fontWeight: "bold",
  },
  checkboxText: {
    fontSize: 16,
    color: "#111827",
  },
  modalButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 16,
  },
  modalButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
});
