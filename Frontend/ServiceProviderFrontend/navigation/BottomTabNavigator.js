import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native-paper';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../theme';

import NewsFeedScreen from '../pages/NewsFeedScreen';
// import BookingsScreen from '../pages/BookingsScreen';
import EarningsScreen from '../pages/EarningsScreen';
import ProfileScreen from '../pages/ProfileScreen';
import ProviderCalendarScreen from '../pages/coordination/ProviderCalendarScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ iconSet = 'Ionicons', iconName, focused }) => {
  const IconComponent = iconSet === 'MaterialIcons' ? MaterialIcons : Ionicons;

  return (
    <View style={[styles.iconWrapper, focused && styles.iconWrapperFocused]}>
      <IconComponent
        name={iconName}
        size={21}
        color={focused ? Colors.primary : Colors.textLight}
      />
    </View>
  );
};

const TabLabel = ({ label, focused }) => (
  <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
    {label}
  </Text>
);

const CustomTab = ({ focused, label, iconName, iconSet }) => (
  <View style={styles.tabItem}>
    <TabIcon focused={focused} iconName={iconName} iconSet={iconSet} />
    <TabLabel label={label} focused={focused} />
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
            <CustomTab
              iconName={focused ? 'home' : 'home-outline'}
              label="Feed"
              focused={focused}
            />
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
            <CustomTab
              iconName={focused ? 'clipboard' : 'clipboard-outline'}
              label="Bookings"
              focused={focused}
            />
          ),
        }}
      />
      */}

      <Tab.Screen
        name="Earnings"
        component={EarningsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTab
              iconName="attach-money"
              iconSet="MaterialIcons"
              label="Earnings"
              focused={focused}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <CustomTab
              iconName={focused ? 'person' : 'person-outline'}
              label="Profile"
              focused={focused}
            />
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

  iconWrapper: {
    width: 36,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },

  iconWrapperFocused: {
    backgroundColor: '#EEF2FF',
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