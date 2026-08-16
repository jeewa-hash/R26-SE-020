import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import LoginScreen from "./src/screens/LoginScreen";
import HomeTabScreen from "./src/screens/HomeTabScreen";
import RequestsTabScreen from "./src/screens/RequestsTabScreen";
import BookingsTabScreen from "./src/screens/BookingsTabScreen";
import ProfileTabScreen from "./src/screens/ProfileTabScreen";
import { useSession } from "./src/auth/session";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: "#2563eb",
        tabBarInactiveTintColor: "#6b7280",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e7eb",
          height: 62,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, size }) => {
          let iconName = "home";

          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Requests") {
            iconName = "clipboard";
          } else if (route.name === "Bookings") {
            iconName = "calendar";
          } else if (route.name === "Profile") {
            iconName = "person";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeTabScreen} />
      <Tab.Screen name="Requests" component={RequestsTabScreen} />
      <Tab.Screen name="Bookings" component={BookingsTabScreen} />
      <Tab.Screen name="Profile" component={ProfileTabScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  const { user } = useSession();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user?.token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
