import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import api from "../api/client";

export default function BookingDetailsScreen({ route }) {
  const { bookingId } = route.params;

  const [booking, setBooking] = useState(null);

  const loadBookingDetails = async () => {
    try {
      const response = await api.get(`/bookings/${bookingId}`);
      setBooking(response.data.data);
    } catch (error) {
      Alert.alert(
        "Failed to load booking",
        error.response?.data?.message || error.message
      );
    }
  };

  const startBooking = async () => {
    try {
      await api.put(`/bookings/${bookingId}/start`, {});
      Alert.alert("Success", "Booking started");
      loadBookingDetails();
    } catch (error) {
      Alert.alert(
        "Failed to start",
        error.response?.data?.message || error.message
      );
    }
  };

  const reportDelay = async () => {
    try {
      await api.put(`/bookings/${bookingId}/report-delay`, {
        delayReason: "Current service is taking longer than expected",
        additionalDelayMins: 45,
      });

      Alert.alert("Success", "Delay reported");
      loadBookingDetails();
    } catch (error) {
      Alert.alert(
        "Failed to report delay",
        error.response?.data?.message || error.message
      );
    }
  };

  const completeBooking = async () => {
    try {
      await api.put(`/bookings/${bookingId}/complete`, {});
      Alert.alert("Success", "Booking completed");
      loadBookingDetails();
    } catch (error) {
      Alert.alert(
        "Failed to complete",
        error.response?.data?.message || error.message
      );
    }
  };

  const createReschedule = async () => {
    try {
      const response = await api.post(
        `/reschedules/bookings/${bookingId}/reschedule`,
        {
          reason: "Current booking needs to be rescheduled",
        }
      );

      Alert.alert("Success", "Reschedule request created");
      console.log("RESCHEDULE RESPONSE:", response.data);
      loadBookingDetails();
    } catch (error) {
      Alert.alert(
        "Failed to reschedule",
        error.response?.data?.message || error.message
      );
    }
  };

  useEffect(() => {
    loadBookingDetails();
  }, []);

  if (!booking) {
    return (
      <View style={styles.center}>
        <Text>Loading booking details...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Booking Details</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Booking ID</Text>
        <Text>{booking._id}</Text>

        <Text style={styles.label}>Status</Text>
        <Text>{booking.bookingStatus}</Text>

        <Text style={styles.label}>Initial Schedule</Text>
        <Text>
          {booking.initialSchedule?.date}{" "}
          {booking.initialSchedule?.startTime} -{" "}
          {booking.initialSchedule?.endTime}
        </Text>

        <Text style={styles.label}>Current Schedule</Text>
        <Text>
          {booking.scheduledDate} {booking.startTime} - {booking.endTime}
        </Text>

        <Text style={styles.label}>Location</Text>
        <Text>
          {booking.location?.address || "-"} / {booking.location?.city || "-"}
        </Text>

        <Text style={styles.label}>Delay Risk</Text>
        <Text>
          {booking.delayRiskLevel} ({booking.delayRiskScore})
        </Text>

        <Text style={styles.label}>Delay Info</Text>
        <Text>Reason: {booking.delayInfo?.delayReason || "-"}</Text>
        <Text>Extra mins: {booking.delayInfo?.additionalDelayMins || 0}</Text>
        <Text>Reported By: {booking.delayInfo?.reportedBy || "-"}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Actions</Text>

        <Button title="Start Booking" onPress={startBooking} />

        <View style={styles.smallGap} />

        <Button title="Report Delay" onPress={reportDelay} />

        <View style={styles.smallGap} />

        <Button title="Create Reschedule Request" onPress={createReschedule} />

        <View style={styles.smallGap} />

        <Button title="Complete Booking" onPress={completeBooking} />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Accepted Reschedule History</Text>

        {booking.acceptedRescheduleRequests?.length === 0 && (
          <Text>No accepted reschedules yet.</Text>
        )}

        {booking.acceptedRescheduleRequests?.map((item) => (
          <View key={item._id} style={styles.historyCard}>
            <Text>Requested By: {item.requestedByType}</Text>
            <Text>Reason: {item.reason}</Text>
            <Text>
              Old: {item.currentSchedule?.date}{" "}
              {item.currentSchedule?.startTime} -{" "}
              {item.currentSchedule?.endTime}
            </Text>
            <Text>
              New: {item.selectedSlot?.date} {item.selectedSlot?.startTime} -{" "}
              {item.selectedSlot?.endTime}
            </Text>
            <Text>Status: {item.status}</Text>
          </View>
        ))}
      </View>

      <View style={styles.smallGap} />

      <Button title="Refresh" onPress={loadBookingDetails} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  label: {
    fontWeight: "bold",
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  historyCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginTop: 10,
  },
  smallGap: {
    height: 10,
  },
});