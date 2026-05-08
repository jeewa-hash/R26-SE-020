import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Text } from 'react-native-paper';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

import NewsFeedScreen from '../pages/NewsFeedScreen';
// import BookingsScreen from '../pages/BookingsScreen';
import EarningsScreen from '../pages/EarningsScreen';
import ProfileScreen from '../pages/ProfileScreen';
import AppliedJobsScreen from '../pages/AppliedJobsScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ iconName, label, focused }) => (
  <View style={styles.tabItem}>
    <Icon 
      name={iconName} 
      size={24} 
      color={focused ? Colors.primary : Colors.textLight} 
    />
    <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
      {label}
    </Text>
  </View>
);

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabBarItem,
      }}
    >
      <Tab.Screen
        name="NewsFeed"
        component={NewsFeedScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="home" label="Feed" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Schedule"
        component={ProviderCalendarScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTab
              iconName={focused ? 'calendar' : 'calendar-outline'}
              label="Schedule"
              focused={focused}
            />
          ),
        }}
      />

      {/* 
      Booking tab is temporarily disabled for now.
      Enable this later when the booking member's flow is ready.

      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="event" label="Bookings" focused={focused} />
          ),
        }}
      />
      */}

      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="attach-money" label="Earnings" focused={focused} />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="person" label="Profile" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Applied"
        component={AppliedJobsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon iconName="assignment" label="Applied" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    paddingTop: 6,
    paddingBottom: 8,
  },

  tabBarItem: {
    paddingVertical: 2,
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '600',
  },

  tabLabelFocused: {
    color: Colors.primary,
    fontWeight: '800',
  },
});