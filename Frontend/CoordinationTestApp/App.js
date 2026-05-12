import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import LoginScreen from "./src/screens/LoginScreen";
import ProviderHomeScreen from "./src/screens/ProviderHomeScreen";
import SeekerHomeScreen from "./src/screens/SeekerHomeScreen";
import BookingDetailsScreen from "./src/screens/BookingDetailsScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <Stack.Navigator initialRouteName="Login">
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ProviderHome" component={ProviderHomeScreen} />
      <Stack.Screen name="SeekerHome" component={SeekerHomeScreen} />
      <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
    </Stack.Navigator>
  );
}