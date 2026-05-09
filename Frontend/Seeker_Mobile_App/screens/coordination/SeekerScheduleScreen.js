import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getSeekerCalendar } from '../../services/coordinationApi';
import styles from './styles';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

export default function SeekerScheduleScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const seekerId = route?.params?.seekerId || null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [bookings, setBookings] = useState([]);

  const loadCalendar = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const res = await getSeekerCalendar(seekerId);
      const items = res?.data?.bookings || res?.data || [];
      setBookings(Array.isArray(items) ? items : []);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to load seeker calendar.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCalendar();
  }, [seekerId]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#6366F1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Seeker Schedule</Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => {
            setRefreshing(true);
            loadCalendar(true);
          }}
        >
          <Ionicons name="refresh" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.centerText}>Loading confirmed bookings...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.body}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadCalendar(true);
              }}
              tintColor="#6366F1"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {error ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {bookings.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="calendar-outline" size={44} color="#9CA3AF" />
              <Text style={styles.emptyText}>
                No confirmed bookings found for this seeker yet.
              </Text>
            </View>
          ) : (
            bookings.map((booking, idx) => (
              <View
                key={booking?._id || booking?.id || `booking-${idx}`}
                style={styles.scheduleItem}
              >
                <View style={styles.scheduleTop}>
                  <Text style={styles.scheduleTitle}>
                    {booking?.serviceSubCategory ||
                      booking?.serviceCategory ||
                      'Service Booking'}
                  </Text>
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
                </View>
                <Text style={styles.scheduleTime}>
                  Start: {formatDateTime(booking?.startTime || booking?.bookingStart)}
                </Text>
                <Text style={styles.scheduleTime}>
                  End: {formatDateTime(booking?.endTime || booking?.bookingEnd)}
                </Text>
                <Text style={styles.scheduleTime}>
                  Provider: {booking?.providerName || booking?.providerId || '-'}
                </Text>
                <Text style={styles.scheduleTime}>
                  Status: {booking?.bookingStatus || booking?.status || 'Confirmed'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
