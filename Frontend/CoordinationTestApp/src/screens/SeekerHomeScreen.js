import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Button,
  ScrollView,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import api from "../api/client";

export default function SeekerHomeScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);

  const loadSeekerCalendar = async () => {
    try {
      const response = await api.get(
        "/calendar/seeker/me?startDate=2026-06-01&endDate=2026-06-30"
      );

      setBookings(response.data.data || []);
    } catch (error) {
      Alert.alert(
        "Failed to load seeker calendar",
        error.response?.data?.message || error.message
      );
    }
  };

  const handleLogout = async () => {
    global.authToken = null;
    global.loggedUser = null;

    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (error) {
      console.log("AsyncStorage clear skipped");
    }

    navigation.replace("Login");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Seeker Home</Text>
      <Text style={styles.text}>Logged in as seeker.</Text>

      <Button title="Load My Bookings" onPress={loadSeekerCalendar} />

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
            onPress={() =>
              navigation.navigate("BookingDetails", {
                bookingId: item.bookingId,
              })
            }
          />
        </View>
      ))}

      <View style={styles.gap} />

      <Button title="Logout" color="#cc0000" onPress={handleLogout} />
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
    marginBottom: 12,
    backgroundColor: "#fff",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 6,
  },
});