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

  const startBooking = async (bookingId) => {
    try {
      await api.put(`/bookings/${bookingId}/start`, {});
      Alert.alert("Success", "Booking started");
      await loadBookingDetails(bookingId);
      await loadBookings();
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
      await loadBookingDetails(bookingId);
      await loadBookings();
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
      await loadBookingDetails(bookingId);
      await loadBookings();
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
      const response = await api.put(`/reschedules/${rescheduleId}/accept`, {
        selectedSlot: {
          date: selectedSlot.date,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
        },
      });

      Alert.alert("Success", "Suggested slot accepted");
      console.log("ACCEPT RESCHEDULE:", response.data);

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

  const pendingReschedules = reschedules.filter(
    (item) => item.status === "PENDING"
  );

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
            Accepted Reschedules:{" "}
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

          <View style={styles.smallGap} />

          <Button
            title="Reload Reschedules"
            onPress={() => loadReschedules(selectedBooking._id)}
          />
        </View>
      )}

      {selectedBooking && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pending Reschedule Requests</Text>

          {pendingReschedules.length === 0 && (
            <Text>No pending reschedule requests for this booking.</Text>
          )}

          {pendingReschedules.map((reschedule) => (
            <View key={reschedule._id} style={styles.historyCard}>
              <Text style={styles.cardTitle}>Reschedule Request</Text>
              <Text>Requested By: {reschedule.requestedByType}</Text>
              <Text>Reason: {reschedule.reason}</Text>
              <Text>
                Current: {reschedule.currentSchedule?.date}{" "}
                {reschedule.currentSchedule?.startTime} -{" "}
                {reschedule.currentSchedule?.endTime}
              </Text>
              <Text>Status: {reschedule.status}</Text>

              <View style={styles.smallGap} />

              <Text style={styles.sectionTitle}>Suggested Slots</Text>

              {reschedule.suggestedSlots?.map((slot, index) => (
                <View key={`${reschedule._id}-${index}`} style={styles.slotCard}>
                  <Text>
                    {slot.date} {slot.startTime} - {slot.endTime}
                  </Text>
                  <Text>Risk: {slot.riskLevel}</Text>
                  <Text>Score: {slot.score}</Text>
                  <Text>{slot.reason}</Text>

                  <View style={styles.smallGap} />

                  <Button
                    title="Accept This Slot"
                    onPress={() => acceptSuggestedSlot(reschedule._id, slot)}
                  />
                </View>
              ))}
            </View>
          ))}
        </View>
      )}

      {selectedBooking && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Accepted Reschedule History</Text>

          {selectedBooking.acceptedRescheduleRequests?.length === 0 && (
            <Text>No accepted reschedules yet.</Text>
          )}

          {selectedBooking.acceptedRescheduleRequests?.map((item) => (
            <View key={item._id || item} style={styles.historyCard}>
              {typeof item === "string" ? (
                <Text>{item}</Text>
              ) : (
                <>
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
                </>
              )}
            </View>
          ))}
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
  historyCard: {
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    marginTop: 10,
    backgroundColor: "#fafafa",
  },
  slotCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 8,
    marginTop: 10,
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
    marginTop: 6,
  },
});