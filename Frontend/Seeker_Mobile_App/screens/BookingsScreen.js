import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';

export default function BookingsScreen({ navigation }) {
  const activeBookings = [
    { 
      id: 1, 
      title: "HVAC Repair & Cleaning", 
      provider: "John Miller", 
      providerId: "john_miller",
      time: "2:00 PM", 
      date: "Today", 
      status: "confirmed",
      image: "https://randomuser.me/api/portraits/men/1.jpg" 
    },
    { 
      id: 2, 
      title: "Kitchen Plumbing", 
      provider: "Home Services", 
      providerId: "home_services",
      time: "10:00 AM", 
      date: "Tomorrow", 
      status: "pending",
      image: "https://randomuser.me/api/portraits/men/2.jpg" 
    },
    { 
      id: 3, 
      title: "Garden Maintenance", 
      provider: "Green Thumb", 
      providerId: "green_thumb",
      time: "3:00 PM", 
      date: "Dec 20, 2024", 
      status: "confirmed",
      image: "https://randomuser.me/api/portraits/women/1.jpg" 
    },
  ];

  const getStatusStyle = (status) => {
    switch(status) {
      case 'confirmed':
        return { bg: '#D1FAE5', color: '#10B981', text: 'Confirmed' };
      case 'pending':
        return { bg: '#FEF3C7', color: '#F59E0B', text: 'Pending' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: status };
    }
  };

  const handleMessage = (booking) => {
    navigation.navigate('ChatScreen', { 
      provider: booking.provider,
      providerId: booking.providerId,
      bookingId: booking.id,
      title: booking.title
    });
  };

  const handleReschedule = (booking) => {
    navigation.navigate('RescheduleScreen', { 
      booking: booking
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>12</Text>
          <Text style={styles.statLabel}>Total Bookings</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>8</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>4</Text>
          <Text style={styles.statLabel}>Upcoming</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Upcoming Appointments</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Bookings List */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {activeBookings.map((booking) => {
          const status = getStatusStyle(booking.status);
          return (
            <TouchableOpacity key={booking.id} style={styles.bookingCard} activeOpacity={0.9}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.cardGradient}
              >
                <View style={styles.cardHeader}>
                  <Image source={{ uri: booking.image }} style={styles.bookingImage} />
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingTitle}>{booking.title}</Text>
                    <View style={styles.providerRow}>
                      <Ionicons name="person-outline" size={12} color="#6B7280" />
                      <Text style={styles.bookingProvider}>{booking.provider}</Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.detailText}>{booking.date}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="time-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.detailText}>{booking.time}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.messageBtn} 
                    onPress={() => handleMessage(booking)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#667eea" />
                    <Text style={styles.messageBtnText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.rescheduleBtn}
                    onPress={() => handleReschedule(booking)}
                  >
                    <Ionicons name="calendar-outline" size={18} color="#fff" />
                    <Text style={styles.rescheduleBtnText}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#667eea',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  bookingCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bookingImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  bookingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookingProvider: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  messageBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  messageBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  rescheduleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#667eea',
  },
  rescheduleBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
});