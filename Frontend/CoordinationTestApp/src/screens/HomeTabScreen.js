import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  SafeAreaView,
} from "react-native";
import LoginScreen from "./LoginScreen";
import api from "../api/client";
import { useSession } from "../auth/session";

export default function HomeTabScreen() {
  const { user } = useSession();
  const [posts, setPosts] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  if (!user) {
    return <LoginScreen />;
  }

  const name = user.name || user.email?.split("@")[0] || "there";
  const isProvider = user.role === "ServiceProvider";

  const normalizePostsResponse = (responseData) => {
    if (Array.isArray(responseData)) return responseData;
    if (Array.isArray(responseData?.data)) return responseData.data;
    if (Array.isArray(responseData?.posts)) return responseData.posts;
    return [];
  };

  const loadPosts = async () => {
    try {
      const response = await api.get("/posts");
      const postsList = normalizePostsResponse(response.data);
      setPosts(postsList);

      if (postsList.length === 0) {
        Alert.alert("No posts", "No posts were returned from the API.");
      }
    } catch (error) {
      Alert.alert(
        "Failed to load posts",
        error.response?.data?.message || error.message
      );
    }
  };

  const sendProviderRequest = async (post) => {
    try {
      const response = await api.post("/requests", {
        postId: post._id,
        requestedDate: post.preferredSchedule?.date || undefined,
        requestedStartTime: post.preferredSchedule?.startTime || undefined,
        serviceCategory: post.category || "",
        serviceSubcategory: post.category || "",
        taskName: post.title || "",
        complexityLevel: "Medium",
        propertySize: "Medium",
        urgency: post.urgency || "medium",
        location: post.location,
      });

      setLastResult(response.data);
      Alert.alert(
        "Request Created",
        `Status: ${response.data.data?.validationStatus}\nRisk: ${response.data.data?.riskLevel}`
      );
    } catch (error) {
      Alert.alert(
        "Request Failed",
        error.response?.data?.message || error.message
      );
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <Text style={styles.greeting}>Welcome back, {name}</Text>
          <Text style={styles.subtitle}>
            {isProvider
              ? "Review the latest seeker requests and send your offers quickly."
              : "Review your posts and use the Requests tab to manage incoming provider responses."}
          </Text>
          <View style={styles.badgeRow}>
            <View style={styles.badgePrimary}>
              <Text style={styles.badgePrimaryText}>{user.role}</Text>
            </View>
            <View style={styles.badgeSecondary}>
              <Text style={styles.badgeSecondaryText}>
                {isProvider ? "Provider dashboard" : "Seeker dashboard"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Posts loaded</Text>
            <Text style={styles.summaryValue}>{posts.length}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Last status</Text>
            <Text style={styles.summaryValue}>
              {lastResult?.data?.validationStatus || "No actions yet"}
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.primaryButton} onPress={loadPosts}>
          <Text style={styles.primaryButtonText}>
            {isProvider ? "Refresh Seeker Posts" : "Load My Posts"}
          </Text>
        </TouchableOpacity>

        {posts.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Nothing to show yet</Text>
            <Text style={styles.emptyText}>
              Tap the button above to fetch the latest coordination posts.
            </Text>
          </View>
        )}

        {posts.map((post) => (
          <View key={post._id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{post.title || "Quick help request"}</Text>
              <View style={styles.tag}>
                <Text style={styles.tagText}>{(post.urgency || "medium").toUpperCase()}</Text>
              </View>
            </View>
            <Text style={styles.cardMeta}>Category: {post.category || "General"}</Text>
            <Text style={styles.cardMeta}>Location: {post.location?.city || "Unknown city"}</Text>
            <Text style={styles.cardMeta}>District: {post.location?.district || "Unknown"}</Text>

            <View style={styles.segment}>
              <Text style={styles.segmentLabel}>Preferred schedule</Text>
              <Text style={styles.segmentText}>{post.preferredSchedule?.date || "No date set"}</Text>
              <Text style={styles.segmentText}>{post.preferredSchedule?.startTime || "No start time"}</Text>
              <Text style={styles.segmentText}>
                Flexible: {post.preferredSchedule?.flexible ? "Yes" : "No"}
              </Text>
            </View>

            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>Post ID: {post._id}</Text>
              {isProvider && (
                <TouchableOpacity
                  style={styles.requestButton}
                  onPress={() => sendProviderRequest(post)}
                >
                  <Text style={styles.requestButtonText}>Send request</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        {lastResult && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Last request result</Text>
            <Text style={styles.resultLine}>ML source: {lastResult.mlSource || "-"}</Text>
            <Text style={styles.resultLine}>Status: {lastResult.data?.validationStatus || "-"}</Text>
            <Text style={styles.resultLine}>Risk: {lastResult.data?.riskLevel || "-"}</Text>
            <Text style={styles.resultLine}>Score: {lastResult.data?.riskScore || "-"}</Text>
            <Text style={styles.resultLine}>Message: {lastResult.data?.validationMessage || "-"}</Text>
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
    borderRadius: 24,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: "800",
    color: "#1e3a8a",
    marginBottom: 8,
  },
  subtitle: {
    color: "#475569",
    lineHeight: 22,
    marginBottom: 16,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  badgePrimary: {
    backgroundColor: "#dbeafe",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  badgePrimaryText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
  badgeSecondary: {
    backgroundColor: "#eff6ff",
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  badgeSecondaryText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  summaryLabel: {
    color: "#6b7280",
    marginBottom: 8,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
  },
  primaryButton: {
    backgroundColor: "#2563eb",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 22,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  emptyState: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 18,
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  emptyText: {
    color: "#475569",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
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
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    flex: 1,
    marginRight: 12,
  },
  tag: {
    backgroundColor: "#ede9fe",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  tagText: {
    color: "#7c3aed",
    fontWeight: "700",
  },
  cardMeta: {
    color: "#475569",
    marginBottom: 6,
    lineHeight: 20,
  },
  segment: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  segmentLabel: {
    fontWeight: "700",
    marginBottom: 6,
    color: "#1f2937",
  },
  segmentText: {
    color: "#4b5563",
    marginBottom: 4,
  },
  cardFooter: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  cardFooterText: {
    color: "#6b7280",
  },
  requestButton: {
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  requestButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  resultCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
    marginTop: 10,
  },
  resultTitle: {
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 10,
  },
  resultLine: {
    color: "#374151",
    marginBottom: 4,
  },
});
