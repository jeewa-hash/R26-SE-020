import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { Text } from 'react-native-paper';
import { Colors } from '../theme';

import NewsFeedScreen from '../pages/NewsFeedScreen';
import BookingsScreen from '../pages/BookingsScreen';
import ProfileScreen from '../pages/ProfileScreen';
import ProviderCalendarScreen from '../pages/coordination/ProviderCalendarScreen';

const Tab = createBottomTabNavigator();

const TabIcon = ({ iconName, label, focused, iconType = 'Ionicons' }) => {
  const IconComponent = 
    iconType === 'Ionicons' ? Ionicons :
    iconType === 'MaterialIcons' ? MaterialIcons :
    FontAwesome5;
  
  return (
    <View style={styles.tabItem}>
      <IconComponent 
        name={iconName} 
        size={24} 
        color={focused ? Colors.primary : Colors.textLight} 
      />
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>
        {label}
      </Text>
    </View>
  );
};

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
            <TabIcon 
              iconName={focused ? 'home' : 'home-outline'} 
              label="Feed" 
              focused={focused}
              iconType="Ionicons"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Schedule"
        component={ProviderCalendarScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              iconName={focused ? 'calendar' : 'calendar-outline'} 
              label="Schedule" 
              focused={focused}
              iconType="Ionicons"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Bookings"
        component={BookingsScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              iconName={focused ? 'bookmark' : 'bookmark-outline'} 
              label="Bookings" 
              focused={focused}
              iconType="Ionicons"
            />
          ),
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon 
              iconName={focused ? 'person' : 'person-outline'} 
              label="Profile" 
              focused={focused}
              iconType="Ionicons"
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
    height: 70,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    paddingTop: 8,
    paddingBottom: 10,
  },

  tabBarItem: {
    paddingVertical: 1,
  },

  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  tabLabel: {
    fontSize: 10,
    color: Colors.textLight,
    fontWeight: '500',
    marginTop: 3,
  },

  tabLabelFocused: {
    color: Colors.primary,
    fontWeight: '600',
  },
});