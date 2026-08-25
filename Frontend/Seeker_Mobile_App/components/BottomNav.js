// components/BottomNav.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTheme } from '../hooks/useTheme';

const BottomNav = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { isDarkMode } = useTheme();

  const navItems = [
    {
      id: 'Home',
      label: 'Home',
      icon: 'home',
      onPress: () => navigation.navigate('Home'),
    },
    {
      id: 'Feed',
      label: 'Feed',
      icon: 'feed',
      onPress: () => navigation.navigate('FeedScreen'),
    },
    {
      id: 'Create',
      label: 'Create',
      icon: 'add',
      isCreateButton: true,
      onPress: () => navigation.navigate('CreatePostScreen'),
    },
    {
      id: 'Bookings',
      label: 'Bookings',
      icon: 'calendar-today',
      onPress: () => navigation.navigate('BookingsScreen'),
    },
    {
      id: 'Profile',
      label: 'Profile',
      icon: 'person',
      onPress: () => navigation.navigate('ProfileScreen'),
    },
  ];

  const isActive = (itemId) => {
    if (itemId === 'Home' && (route.name === 'Home' || route.name === 'HomeScreen')) return true;
    if (itemId === 'Feed' && route.name === 'FeedScreen') return true;
    if (itemId === 'Create' && route.name === 'CreatePostScreen') return true;
    if (itemId === 'Bookings' && route.name === 'BookingsScreen') return true;
    if (itemId === 'Profile' && route.name === 'ProfileScreen') return true;
    return false;
  };

  const inactiveColor = isDarkMode ? '#94A3B8' : '#999';
  const activeColor = isDarkMode ? '#818cf8' : '#667eea';

  return (
    <View style={[styles.bottomNav, isDarkMode && styles.bottomNavDark]}>
      {navItems.map((item) => {
        const active = isActive(item.id);
        
        if (item.isCreateButton) {
          return (
            <TouchableOpacity 
              key={item.id}
              style={styles.createNavItem} 
              onPress={item.onPress}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={isDarkMode ? ['#818cf8', '#6366f1'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createButton}
              >
                <MaterialIcons name={item.icon} size={28} color="#fff" />
              </LinearGradient>
              <Text style={[
                styles.navLabel,
                { color: inactiveColor },
                active && { color: activeColor, fontWeight: '600' }
              ]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }
        
        return (
          <TouchableOpacity 
            key={item.id}
            style={styles.navItem} 
            onPress={item.onPress}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={item.icon} 
              size={24} 
              color={active ? activeColor : inactiveColor} 
            />
            <Text style={[
              styles.navLabel,
              { color: inactiveColor },
              active && { color: activeColor, fontWeight: '600' }
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8ECF0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  bottomNavDark: {
    backgroundColor: '#16213e',
    borderTopColor: '#2d3561',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
  },
  navLabelActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  createNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -20,
  },
  createButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});

export default BottomNav;