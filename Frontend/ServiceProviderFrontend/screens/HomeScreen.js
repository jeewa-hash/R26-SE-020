import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003`;

export default function HomeScreen({ navigation }) {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let intervalId;
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUnreadCount();
      intervalId = setInterval(fetchUnreadCount, 10000);
    });
    
    const unsubscribeBlur = navigation.addListener('blur', () => {
      if (intervalId) clearInterval(intervalId);
    });

    fetchUnreadCount();
    intervalId = setInterval(fetchUnreadCount, 10000);
    
    return () => {
      unsubscribe();
      unsubscribeBlur();
      if (intervalId) clearInterval(intervalId);
    };
  }, [navigation]);

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (response.ok) {
        const unread = data.filter(n => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.log('Error fetching notifications count:', err);
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.bellContainer} 
          onPress={() => navigation.navigate('Notifications')}
        >
          <MaterialIcons name="notifications-none" size={28} color="#333" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
      headerTitle: 'Work Wave',
      headerTitleStyle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
      },
    });
  }, [navigation, unreadCount]);

  const QuickAction = ({ icon, label, color, onPress }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const StatCard = ({ label, value, icon, color }) => (
    <View style={styles.statCard}>
      <View style={styles.statInfo}>
        <Text style={styles.statLabel}>{label}</Text>
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={20} color={color} />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeSection}>
          <Text style={styles.greeting}>Hello, Provider!</Text>
          <Text style={styles.subtitle}>Your account is verified and active.</Text>
        </View>

        <View style={styles.statsRow}>
          <StatCard label="Earnings" value="$1,240" icon="attach-money" color="#10b981" />
          <StatCard label="Jobs" value="12" icon="work" color="#6366f1" />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <QuickAction icon="add-task" label="New Job" color="#6366f1" />
          <QuickAction icon="history" label="History" color="#f59e0b" />
          <QuickAction icon="person" label="Profile" color="#10b981" onPress={() => navigation.navigate('Profile')} />
          <QuickAction icon="settings" label="Settings" color="#6b7280" onPress={() => navigation.navigate('Settings')} />
        </View>
        
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  welcomeSection: {
    marginBottom: 25,
    paddingTop: 10,
  },
  greeting: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 25,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statInfo: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginBottom: 25,
  },
  actionCard: {
    width: '47.5%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  bellContainer: {
    marginRight: 15,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
