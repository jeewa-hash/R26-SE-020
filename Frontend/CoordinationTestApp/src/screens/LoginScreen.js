import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { PROVIDER_LOGIN_API, SEEKER_LOGIN_API } from "../api/client";
import { setSession } from "../auth/session";

const decodeJwtToken = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = global.atob ? global.atob(base64) : atob(base64);
    const json = decodeURIComponent(
      decoded
        .split("")
        .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState("chaveenProvider@gmail.com");
  const [password, setPassword] = useState("Chawwa@2002");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const isSeeker = email.toLowerCase().includes("seeker");
      const loginUrl = isSeeker ? SEEKER_LOGIN_API : PROVIDER_LOGIN_API;

      const response = await axios.post(loginUrl, {
        email,
        password,
      });

      const token = response.data.token;
      const decodedToken = decodeJwtToken(token);
      const tokenUser = decodedToken?.user || decodedToken || {};
      const user = {
        role: response.data.role,
        email,
        name: tokenUser.name || email.split("@")[0],
      };

      if (!token || !user.role) {
        Alert.alert("Login failed", "Token or role missing");
        return;
      }

      setSession(token, user);

      try {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
      } catch (_storageError) {
        console.log("AsyncStorage unavailable, using memory fallback");
      }

      navigation.replace("Main");
    } catch (error) {
      Alert.alert(
        "Login failed",
        error.response?.data?.message || error.message
      );
    } finally {
      setLoading(false);
    }
  };

  const setSample = (loginEmail) => {
    setEmail(loginEmail);
    setPassword("Chawwa@2002");
  };

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Text style={styles.brandTitle}>Coordination Tester</Text>
        <Text style={styles.subtitle}>
          Sign in with your provider or seeker credentials.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="you@domain.com"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#9ca3af"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? "Signing in..." : "Sign In"}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.quickTitle}>Quick login</Text>
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => setSample("chaveenProvider@gmail.com")}
            >
              <Text style={styles.smallButtonText}>Provider</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => setSample("chaveenSeeker@gmail.com")}
            >
              <Text style={styles.smallButtonText}>Seeker</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#eef2ff",
  },
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#1d4ed8",
    marginBottom: 8,
  },
  subtitle: {
    color: "#4b5563",
    marginBottom: 24,
    fontSize: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  label: {
    marginBottom: 8,
    color: "#374151",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    backgroundColor: "#f9fafb",
    color: "#111827",
  },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 16,
  },
  quickActions: {
    marginTop: 24,
  },
  quickTitle: {
    color: "#6b7280",
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  smallButton: {
    flex: 1,
    backgroundColor: "#e0e7ff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 4,
  },
  smallButtonText: {
    color: "#1d4ed8",
    fontWeight: "700",
  },
});
