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
      await api.post(`/requests/${requestId}/accept`, {});
      Alert.alert("Success", "Provider request accepted and booking created");
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
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.title}>Requests</Text>
          <Text style={styles.subtitle}>Review provider or seeker requests.</Text>
          <Text style={styles.statusText}>Role: {user.role}</Text>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={loadRequests}>
          <Text style={styles.primaryButtonText}>Load Requests</Text>
        </TouchableOpacity>

        {requests.map((item) => (
          <View key={item._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.taskName || "Provider Request"}</Text>
              <View style={styles.statusTag}>
                <Text style={styles.statusTagText}>{item.requestStatus || "UNKNOWN"}</Text>
              </View>
            </View>

            <Text style={styles.cardMeta}>Post: {item.postId}</Text>
            <Text style={styles.cardMeta}>Validation: {item.validationStatus}</Text>
            <Text style={styles.cardMeta}>Risk: {item.riskLevel || "-"} ({item.riskScore || "-"})</Text>
            <Text style={styles.cardMeta}>When: {item.requestedDate} {item.requestedStartTime} - {item.requestedEndTime}</Text>
            <Text style={styles.cardMeta}>Message: {item.validationMessage || "None"}</Text>

            {user.role === "Seeker" && item.requestStatus === "PENDING" && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => acceptRequest(item._id)}
              >
                <Text style={styles.secondaryButtonText}>Accept Request</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
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
    backgroundColor: "#ffedd5",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusTagText: {
    color: "#c2410c",
    fontWeight: "700",
  },
  cardMeta: {
    color: "#475569",
    marginBottom: 6,
  },
  secondaryButton: {
    marginTop: 12,
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "700",
  },
});
