import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from "react-native";
import LoginScreen from "./LoginScreen";
import api from "../api/client";
import { useSession } from "../auth/session";

export default function BookingsTabScreen() {
  const { user } = useSession();
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reschedules, setReschedules] = useState([]);

  if (!user) {
    return <LoginScreen />;
  }

  const loadBookings = async () => {
    try {
      const endpoint =
        user.role === "ServiceProvider"
          ? "/calendar/provider/me?startDate=2026-06-01&endDate=2026-06-30"
          : "/calendar/seeker/me?startDate=2026-06-01&endDate=2026-06-30";

      const response = await api.get(endpoint);
      setBookings(response.data.data || []);
      setSelectedBooking(null);
      setReschedules([]);
    } catch (error) {
      Alert.alert(
        "Failed to load bookings",
        error.response?.data?.message || error.message
      );
    }
  };

  const loadBookingDetails = async (bookingId) => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      setSelectedBooking(response.data.data);
      await loadReschedules(bookingId);
    } catch (error) {
      Alert.alert(
        "Failed to load details",
        error.response?.data?.message || error.message
      );
    }
  };

  const loadReschedules = async (bookingId) => {
    try {
      const response = await api.get(`/reschedules/booking/${bookingId}`);
      setReschedules(response.data.data || []);
    } catch (error) {
      console.log("Failed to load reschedules:", error.response?.data || error.message);
      setReschedules([]);
    }
  };

  const performBookingAction = async (endpoint, successMessage) => {
    if (!selectedBooking?._id) {
      return;
    }

    try {
      await api.put(endpoint, {});
      Alert.alert("Success", successMessage);
      await loadBookingDetails(selectedBooking._id);
      await loadBookings();
    } catch (error) {
      Alert.alert(
        "Action failed",
        error.response?.data?.message || error.message
      );
    }
  };

  const createReschedule = async (bookingId) => {
    try {
      await api.post(`/reschedules/bookings/${bookingId}/reschedule`, {
        reason: "Current booking needs to be rescheduled",
      });
      Alert.alert("Success", "Reschedule request created");
      await loadBookingDetails(bookingId);
      await loadBookings();
    } catch (error) {
      Alert.alert(
        "Failed to create reschedule",
        error.response?.data?.message || error.message
      );
    }
  };

  const acceptSuggestedSlot = async (rescheduleId, selectedSlot) => {
    try {
      await api.put(`/reschedules/${rescheduleId}/accept`, {
        selectedSlot: {
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
      });
      Alert.alert("Success", "Suggested slot accepted");
      if (selectedBooking?._id) {
        await loadBookingDetails(selectedBooking._id);
      }
      await loadBookings();
    } catch (error) {
      Alert.alert(
        "Failed to accept slot",
        error.response?.data?.message || error.message
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Bookings</Text>
          <Text style={styles.subtitle}>Track active bookings and control reschedules.</Text>
          <Text style={styles.statusText}>Role: {user.role}</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={loadBookings}>
          <Text style={styles.primaryButtonText}>Load Bookings</Text>
        </TouchableOpacity>

        {bookings.map((item) => (
          <View key={item.bookingId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.date}</Text>
              <View style={styles.statusTag}>
                <Text style={styles.statusTagText}>{item.status || "UNKNOWN"}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>{item.startTime} - {item.endTime}</Text>
            <Text style={styles.cardMeta}>Risk: {item.riskLevel || "-"}</Text>
            <Text style={styles.cardMeta}>Location: {item.location?.city || "-"}</Text>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => loadBookingDetails(item.bookingId)}
            >
              <Text style={styles.secondaryButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        ))}

        {selectedBooking && (
          <View style={styles.detailCard}>
            <Text style={styles.sectionTitle}>Selected Booking</Text>
            <Text style={styles.cardMeta}>ID: {selectedBooking._id}</Text>
            <Text style={styles.cardMeta}>Status: {selectedBooking.bookingStatus}</Text>
            <Text style={styles.cardMeta}>
              Initial: {selectedBooking.initialSchedule?.date} {selectedBooking.initialSchedule?.startTime} - {selectedBooking.initialSchedule?.endTime}
            </Text>
            <Text style={styles.cardMeta}>
              Current: {selectedBooking.scheduledDate} {selectedBooking.startTime} - {selectedBooking.endTime}
            </Text>
            <Text style={styles.cardMeta}>Location: {selectedBooking.location?.city || "-"}</Text>
            <Text style={styles.cardMeta}>Delay risk: {selectedBooking.delayRiskLevel || "-"}</Text>
            <Text style={styles.cardMeta}>Delay reason: {selectedBooking.delayInfo?.delayReason || "-"}</Text>
            <Text style={styles.cardMeta}>Accepted reschedules: {selectedBooking.acceptedRescheduleRequests?.length || 0}</Text>

            <View style={styles.actionGroup}>
              {user.role === "ServiceProvider" && (
                <> 
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => performBookingAction(`/bookings/${selectedBooking._id}/start`, "Booking started")}
                  >
                    <Text style={styles.actionButtonText}>Start</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => performBookingAction(`/bookings/${selectedBooking._id}/report-delay`, "Delay reported")}
                  >
                    <Text style={styles.actionButtonText}>Report Delay</Text>
                  </TouchableOpacity>
                </>
              )}

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => createReschedule(selectedBooking._id)}
              >
                <Text style={styles.actionButtonText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => performBookingAction(`/bookings/${selectedBooking._id}/complete`, "Booking completed")}
              >
                <Text style={styles.actionButtonText}>Complete</Text>
              </TouchableOpacity>
            </View>

            {reschedules.length > 0 && (
              <View style={styles.rescheduleSection}>
                <Text style={styles.sectionSubtitle}>Pending reschedules</Text>
                {reschedules.map((item) => (
                  <View key={item._id} style={styles.rescheduleCard}>
                    <Text style={styles.cardMeta}>Request: {item.reason || "-"}</Text>
                    <Text style={styles.cardMeta}>Status: {item.status}</Text>
                    {item.suggestedSlots?.map((slot, index) => (
                      <TouchableOpacity
                        key={index}
                        style={styles.slotButton}
                        onPress={() => acceptSuggestedSlot(item._id, slot)}
                      >
                        <Text style={styles.slotButtonText}>{slot.date} {slot.startTime} - {slot.endTime}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>
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
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    marginBottom: 8,
    color: "#1e3a8a",
  },
  subtitle: {
    color: "#475569",
    marginBottom: 10,
  },
  statusText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 20,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  detailCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 10,
  },
  statusTag: {
    backgroundColor: "#e0f2fe",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusTagText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  cardMeta: {
    color: "#475569",
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#0f172a",
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    color: "#1d4ed8",
  },
  actionGroup: {
    marginTop: 14,
  },
  actionButton: {
    backgroundColor: "#eef2ff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 12,
  },
  actionButtonText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  rescheduleSection: {
    marginTop: 16,
  },
  rescheduleCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  slotButton: {
    backgroundColor: "#dbeafe",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 8,
  },
  slotButtonText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
});
