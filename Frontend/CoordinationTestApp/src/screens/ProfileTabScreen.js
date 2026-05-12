import React from "react";
import { View, Text, StyleSheet, Button } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LoginScreen from "./LoginScreen";
import { clearSession, useSession } from "../auth/session";

export default function ProfileTabScreen() {
  const { user } = useSession();

  if (!user) {
    return <LoginScreen />;
  }

  const handleLogout = async () => {
    clearSession();

    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("user");
    } catch (error) {
      console.log("AsyncStorage clear skipped");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.card}>
        <Text>Email: {user.email}</Text>
        <Text>Role: {user.role}</Text>
      </View>

      <Button title="Logout" color="#cc0000" onPress={handleLogout} />

      <Text style={styles.note}>After logout, the tabs will return to login.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
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
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  note: {
    marginTop: 12,
    color: "#666",
  },
});