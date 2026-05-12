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

export default function HomeTabScreen() {
  const { user } = useSession();

  const [posts, setPosts] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  if (!user) {
    return <LoginScreen />;
  }

  const normalizePostsResponse = (responseData) => {
    if (Array.isArray(responseData)) {
      return responseData;
    }

    if (Array.isArray(responseData?.data)) {
      return responseData.data;
    }

    if (Array.isArray(responseData?.posts)) {
      return responseData.posts;
    }

    return [];
  };

  const loadPosts = async () => {
    try {
      const response = await api.get("/posts");

      console.log("POSTS RESPONSE:", response.data);

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
        requestedDate: "2026-06-20",
        requestedStartTime: "09:00",
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

  if (user.role === "ServiceProvider") {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Provider Home</Text>
        <Text style={styles.text}>View seeker posts and send requests.</Text>

        <Button title="Load Seeker Posts" onPress={loadPosts} />

        <View style={styles.gap} />

        <Text style={styles.countText}>Posts loaded: {posts.length}</Text>

        {posts.map((post) => (
          <View key={post._id} style={styles.card}>
            <Text style={styles.cardTitle}>{post.title || "Untitled Post"}</Text>
            <Text>Category: {post.category || "-"}</Text>
            <Text>Urgency: {post.urgency || "-"}</Text>
            <Text>City: {post.location?.city || "-"}</Text>
            <Text>District: {post.location?.district || "-"}</Text>
            <Text>Post ID: {post._id}</Text>

            <View style={styles.smallGap} />

            <Button
              title="Add Request to this Post"
              onPress={() => sendProviderRequest(post)}
            />
          </View>
        ))}

        {lastResult && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Last Request Result</Text>
            <Text>ML Source: {lastResult.mlSource || "-"}</Text>
            <Text>Status: {lastResult.data?.validationStatus || "-"}</Text>
            <Text>Risk: {lastResult.data?.riskLevel || "-"}</Text>
            <Text>Score: {lastResult.data?.riskScore || "-"}</Text>
            <Text>Message: {lastResult.data?.validationMessage || "-"}</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Seeker Home</Text>
      <Text style={styles.text}>
        Go to Requests tab to review provider requests and approve bookings.
      </Text>

      <Button title="Load My Posts" onPress={loadPosts} />

      <View style={styles.gap} />

      <Text style={styles.countText}>Posts loaded: {posts.length}</Text>

      {posts.map((post) => (
        <View key={post._id} style={styles.card}>
          <Text style={styles.cardTitle}>{post.title || "Untitled Post"}</Text>
          <Text>Category: {post.category || "-"}</Text>
          <Text>Urgency: {post.urgency || "-"}</Text>
          <Text>City: {post.location?.city || "-"}</Text>
          <Text>District: {post.location?.district || "-"}</Text>
          <Text>Post ID: {post._id}</Text>
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
  countText: {
    marginBottom: 12,
    fontWeight: "bold",
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