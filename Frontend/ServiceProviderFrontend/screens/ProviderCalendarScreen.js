import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar } from 'react-native-calendars';
import { bookingsAPI } from '../services/api';
import { getStoredUserId } from '../utils/jwtHelpers';

export default function ProviderCalendarScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [providerId, setProviderId] = useState(null);
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    initializeCalendar();
  }, []);

  const initializeCalendar = async () => {
    try {
      const id = await getStoredUserId();
      if (!id) {
        Alert.alert('Error', 'Provider ID not found. Please login again.');
        navigation.navigate('Login');
        return;
      }
      setProviderId(id);
      await fetchBookings(id);
    } catch (error) {
      console.error('Error initializing calendar:', error);
      Alert.alert('Error', 'Failed to load calendar');
    }
  };

  const fetchBookings = async (id) => {
    try {
      const response = await bookingsAPI.getBookings();
      const myBookings = response.data.filter(book => book.providerId === id);
      setBookings(myBookings);

      // Mark dates with bookings
      const marked = {};
      myBookings.forEach(booking => {
        const date = booking.requestedDate;
        if (!marked[date]) {
          marked[date] = {
            marked: true,
            dotColor: getStatusColor(booking.status),
            selected: date === selectedDate,
            selectedColor: '#667eea'
          };
        }
      });
      setMarkedDates(marked);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      case 'completed':
        return '#6B7280';
      case 'cancelled':
        return '#DC2626';
      default:
        return '#667eea';
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (providerId) {
      fetchBookings(providerId);
    }
  };

  const onDayPress = (day) => {
    setSelectedDate(day.dateString);
    const updatedMarked = { ...markedDates };
    Object.keys(updatedMarked).forEach(date => {
      updatedMarked[date] = {
        ...updatedMarked[date],
        selected: date === day.dateString,
        selectedColor: date === day.dateString ? '#667eea' : undefined
      };
    });
    setMarkedDates(updatedMarked);
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(booking => booking.requestedDate === date);
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: { bg: '#D1FAE5', color: '#10B981', text: 'Confirmed' },
      pending: { bg: '#FEF3C7', color: '#F59E0B', text: 'Pending' },
      completed: { bg: '#F3F4F6', color: '#6B7280', text: 'Completed' },
      cancelled: { bg: '#FEE2E2', color: '#DC2626', text: 'Cancelled' },
    };
    return styles[status] || styles.pending;
  };

  const selectedDateBookings = getBookingsForDate(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading schedule...</Text>
          </View>
        ) : (
          <>
            {/* Calendar */}
            <View style={styles.calendarContainer}>
              <Calendar
                current={selectedDate}
                markedDates={markedDates}
                onDayPress={onDayPress}
                theme={{
                  backgroundColor: '#ffffff',
                  calendarBackground: '#ffffff',
                  textSectionTitleColor: '#b6c1cd',
                  selectedDayBackgroundColor: '#667eea',
                  selectedDayTextColor: '#ffffff',
                  todayTextColor: '#667eea',
                  dayTextColor: '#2d4150',
                  textDisabledColor: '#d9e1e8',
                  dotColor: '#667eea',
                  selectedDotColor: '#ffffff',
                  arrowColor: '#667eea',
                  monthTextColor: '#2d4150',
                  indicatorColor: '#667eea',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 14
                }}
              />
            </View>

            {/* Selected Date Bookings */}
            <View style={styles.bookingsSection}>
              <Text style={styles.sectionTitle}>
                {selectedDate === new Date().toISOString().split('T')[0]
                  ? 'Today'
                  : new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric'
                    })
                }
              </Text>

              {selectedDateBookings.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="calendar-outline" size={48} color="#9CA3AF" />
                  <Text style={styles.emptyText}>No bookings on this date</Text>
                </View>
              ) : (
                selectedDateBookings.map((booking) => {
                  const statusStyle = getStatusBadge(booking.status);
                  return (
                    <TouchableOpacity
                      key={booking.id}
                      style={styles.bookingCard}
                      onPress={() => navigation.navigate('BookingDetailScreen', { booking })}
                    >
                      <View style={styles.bookingHeader}>
                        <View style={styles.bookingInfo}>
                          <Text style={styles.serviceTitle}>{booking.serviceCategory}</Text>
                          <Text style={styles.bookingTime}>
                            {formatTime(booking.requestedStartTime)} - {booking.estimatedDurationHours}h
                          </Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                          <Text style={[styles.statusText, { color: statusStyle.color }]}>
                            {statusStyle.text}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bookingDetails}>
                        <View style={styles.detailRow}>
                          <Ionicons name="person-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            Client: {booking.seekerName || 'Client'}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Ionicons name="location-outline" size={14} color="#6B7280" />
                          <Text style={styles.detailText}>
                            Location: {booking.location || 'TBD'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.bookingActions}>
                        <TouchableOpacity style={styles.actionButton}>
                          <Ionicons name="chatbubble-outline" size={16} color="#667eea" />
                          <Text style={styles.actionText}>Message</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionButton}>
                          <Ionicons name="call-outline" size={16} color="#10B981" />
                          <Text style={styles.actionText}>Call</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  bookingTime: {
    fontSize: 14,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bookingDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  bookingActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    fontSize: 14,
    color: '#667eea',
    marginLeft: 4,
    fontWeight: '500',
  },
});