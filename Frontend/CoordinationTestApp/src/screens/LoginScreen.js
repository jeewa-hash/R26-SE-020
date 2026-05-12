import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import {
  PROVIDER_LOGIN_API,
  SEEKER_LOGIN_API,
} from "../api/client";
import { setSession } from "../auth/session";

export default function LoginScreen() {
  const [email, setEmail] = useState("chaveenProvider@gmail.com");
  const [password, setPassword] = useState("Chawwa@2002");

  const handleLogin = async () => {
    try {
      const isSeeker = email.toLowerCase().includes("seeker");
      const loginUrl = isSeeker ? SEEKER_LOGIN_API : PROVIDER_LOGIN_API;

      const response = await axios.post(loginUrl, {
        email,
        password,
      });

      const token = response.data.token;

      const user = {
        role: response.data.role,
        email,
      };

      if (!token || !user.role) {
        Alert.alert("Login failed", "Token or role missing");
        return;
      }

      setSession(token, user);

      try {
        await AsyncStorage.setItem("token", token);
        await AsyncStorage.setItem("user", JSON.stringify(user));
      } catch (storageError) {
        console.log("AsyncStorage unavailable, using memory fallback");
      }

      Alert.alert("Login success", `Logged in as ${user.role}`);
    } catch (error) {
      Alert.alert(
        "Login failed",
        error.response?.data?.message || error.message
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Coordination Test Login</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        autoCapitalize="none"
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        secureTextEntry
        onChangeText={setPassword}
      />

      <Button title="Login" onPress={handleLogin} />

      <View style={styles.gap} />

      <Button
        title="Use Provider Login"
        onPress={() => {
          setEmail("chaveenProvider@gmail.com");
          setPassword("Chawwa@2002");
        }}
      />

      <View style={styles.gap} />

      <Button
        title="Use Seeker Login"
        onPress={() => {
          setEmail("chaveenSeeker@gmail.com");
          setPassword("Chawwa@2002");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 28,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  gap: {
    height: 14,
  },
});