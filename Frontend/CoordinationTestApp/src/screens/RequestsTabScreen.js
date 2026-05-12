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

export default function RequestsTabScreen() {
  const { user } = useSession();

  const [requests, setRequests] = useState([]);

  if (!user) {
    return <LoginScreen />;
  }

  const loadProviderRequests = async () => {
    try {
      const response = await api.get("/requests/provider/me");
      setRequests(response.data.data || []);
    } catch (error) {
      Alert.alert(
        "Failed to load provider requests",
        error.response?.data?.message || error.message
      );
    }
  };

  const loadSeekerPostRequests = async () => {
    try {
      const postsResponse = await api.get("/posts");
      const posts = postsResponse.data.data || [];

      const allRequests = [];

      for (const post of posts) {
        const requestResponse = await api.get(`/requests/post/${post._id}`);
        allRequests.push(...(requestResponse.data.data || []));
      }

      setRequests(allRequests);
    } catch (error) {
      Alert.alert(
        "Failed to load seeker requests",
        error.response?.data?.message || error.message
      );
    }
  };

  const acceptRequest = async (requestId) => {
    try {
      const response = await api.post(`/requests/${requestId}/accept`, {});

      Alert.alert("Success", "Provider request accepted and booking created");
      console.log("ACCEPT RESPONSE:", response.data);

      loadSeekerPostRequests();
    } catch (error) {
      Alert.alert(
        "Failed to accept request",
        error.response?.data?.message || error.message
      );
    }
  };

  const loadRequests = () => {
    if (user.role === "ServiceProvider") {
      loadProviderRequests();
    } else {
      loadSeekerPostRequests();
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Requests</Text>
      <Text style={styles.text}>Logged in as: {user.role}</Text>

      <Button title="Load Requests" onPress={loadRequests} />

      <View style={styles.gap} />

      {requests.map((item) => (
        <View key={item._id} style={styles.card}>
          <Text style={styles.cardTitle}>
            {item.taskName || "Provider Request"}
          </Text>

          <Text>Request ID: {item._id}</Text>
          <Text>Post ID: {item.postId}</Text>
          <Text>Status: {item.requestStatus}</Text>
          <Text>Validation: {item.validationStatus}</Text>
          <Text>
            Risk: {item.riskLevel} ({item.riskScore})
          </Text>
          <Text>
            Time: {item.requestedDate} {item.requestedStartTime} -{" "}
            {item.requestedEndTime}
          </Text>
          <Text>Message: {item.validationMessage}</Text>

          {user.role === "Seeker" && item.requestStatus === "PENDING" && (
            <>
              <View style={styles.smallGap} />
              <Button
                title="Accept Request"
                onPress={() => acceptRequest(item._id)}
              />
            </>
          )}
        </View>
      ))}
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
});