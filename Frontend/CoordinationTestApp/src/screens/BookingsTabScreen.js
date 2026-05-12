import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import LoginScreen from "./LoginScreen";
import api from "../api/client";
import { useSession } from "../auth/session";

export default function BookingsTabScreen() {
  const { user } = useSession();

  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);

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
    } catch (error) {
      Alert.alert(
        "Failed to load details",
        error.response?.data?.message || error.message
      );
    }
  };

  const startBooking = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/start`, {});
      Alert.alert("Success", "Booking started");
      loadBookingDetails(bookingId);
      loadBookings();
    } catch (error) {
      Alert.alert(
        "Failed to start",
        error.response?.data?.message || error.message
      );
    }
  };

  const reportDelay = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/report-delay`, {
        delayReason: "Current service is taking longer than expected",
        additionalDelayMins: 45,
      });

      Alert.alert("Success", "Delay reported");
      loadBookingDetails(bookingId);
      loadBookings();
    } catch (error) {
      Alert.alert(
        "Failed to report delay",
        error.response?.data?.message || error.message
      );
    }
  };

  const completeBooking = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/complete`, {});
      Alert.alert("Success", "Booking completed");
      loadBookingDetails(bookingId);
      loadBookings();
    } catch (error) {
      Alert.alert(
        "Failed to complete",
        error.response?.data?.message || error.message
      );
    }
  };

  const createReschedule = async (bookingId) => {
    try {
      const response = await api.post(
        `/reschedules/bookings/${bookingId}/reschedule`,
        {
          reason: "Current booking needs to be rescheduled",
        }
      );

      Alert.alert("Success", "Reschedule request created");
      console.log("RESCHEDULE:", response.data);
      loadBookingDetails(bookingId);
      loadBookings();
    } catch (error) {
      Alert.alert(
        "Failed to create reschedule",
        error.response?.data?.message || error.message
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Bookings</Text>
      <Text style={styles.text}>Logged in as: {user.role}</Text>

      <Button title="Load Bookings" onPress={loadBookings} />

      <View style={styles.gap} />

      {bookings.map((item) => (
        <View key={item.bookingId} style={styles.card}>
          <Text style={styles.cardTitle}>{item.date}</Text>
          <Text>
            {item.startTime} - {item.endTime}
          </Text>
          <Text>Status: {item.status}</Text>
          <Text>Risk: {item.riskLevel}</Text>
          <Text>City: {item.location?.city || "-"}</Text>

          <View style={styles.smallGap} />

          <Button
            title="View Details"
            onPress={() => loadBookingDetails(item.bookingId)}
          />
        </View>
      ))}

      {selectedBooking && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Selected Booking</Text>

          <Text>ID: {selectedBooking._id}</Text>
          <Text>Status: {selectedBooking.bookingStatus}</Text>

          <Text>
            Initial: {selectedBooking.initialSchedule?.date}{" "}
            {selectedBooking.initialSchedule?.startTime} -{" "}
            {selectedBooking.initialSchedule?.endTime}
          </Text>

          <Text>
            Current: {selectedBooking.scheduledDate}{" "}
            {selectedBooking.startTime} - {selectedBooking.endTime}
          </Text>

          <Text>Location: {selectedBooking.location?.city || "-"}</Text>
          <Text>Risk: {selectedBooking.delayRiskLevel}</Text>
          <Text>Delay: {selectedBooking.delayInfo?.delayReason || "-"}</Text>
          <Text>
            Reschedules:{" "}
            {selectedBooking.acceptedRescheduleRequests?.length || 0}
          </Text>

          <View style={styles.smallGap} />

          {user.role === "ServiceProvider" && (
            <>
              <Button
                title="Start Booking"
                onPress={() => startBooking(selectedBooking._id)}
              />

              <View style={styles.smallGap} />

              <Button
                title="Report Delay"
                onPress={() => reportDelay(selectedBooking._id)}
              />

              <View style={styles.smallGap} />
            </>
          )}

          <Button
            title="Create Reschedule Request"
            onPress={() => createReschedule(selectedBooking._id)}
          />

          <View style={styles.smallGap} />

          <Button
            title="Complete Booking"
            onPress={() => completeBooking(selectedBooking._id)}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  text: {
    marginBottom: 16,
  },
  gap: {
    height: 20,
  },
  smallGap: {
    height: 10,
  },
  card: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 14,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
});