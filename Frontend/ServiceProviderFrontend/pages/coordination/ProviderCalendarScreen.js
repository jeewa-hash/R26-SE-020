import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserIdFromJwt } from '../../utils/jwtHelpers';
import { getProviderCalendar } from '../../services/coordinationApi';
import { styles, COLORS, getRiskStyle, getStatusStyle } from './styles';

const formatTime = (dateValue) => {
  if (!dateValue) return '-';

  return new Date(dateValue).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (dateValue) => {
  if (!dateValue) return '-';

  return new Date(dateValue).toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

export default function ProviderCalendarScreen({ navigation }) {
  const [bookings, setBookings] = useState([]);
  const [providerId, setProviderId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadCalendar = async (id) => {
    try {
      const response = await getProviderCalendar(id);
      setBookings(response.data || []);
    } catch (error) {
      console.log(error?.response?.data || error.message);
      Alert.alert(
        'Calendar Failed',
        'Could not load provider calendar. Check backend connection.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const initializeProviderCalendar = async () => {
    let id = await AsyncStorage.getItem('userId');
    if (!id) {
      const token = await AsyncStorage.getItem('userToken');
      id = getUserIdFromJwt(token);
      if (id) {
        await AsyncStorage.setItem('userId', String(id));
      }
    }

    setProviderId(id);
    if (!id) {
      setLoading(false);
      setRefreshing(false);
      Alert.alert(
        'Authentication Error',
        'Provider identity was not found. Please log in again.'
      );
      return;
    }

    await loadCalendar(id);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      initializeProviderCalendar();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (!providerId) {
      await initializeProviderCalendar();
      return;
    }
    await loadCalendar(providerId);
  };

  const totalBookings = bookings.length;
  const conflictCount = bookings.filter(
    (item) => item.conflictStatus === 'affected' || item.reschedulingRequired
  ).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.backButton}>
            <Ionicons name="calendar-outline" size={22} color={COLORS.primary} />
          </View>

          <View>
            <Text style={styles.headerTitle}>My Service Schedule</Text>
            <Text style={styles.headerSubtitle}>
              Delay-aware calendar for service bookings
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.sectionTitle}>Today’s Overview</Text>
              <Text style={styles.mutedText}>Provider: {providerId || 'Loading...'}</Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 28, fontWeight: '900', color: COLORS.primary }}>
                {totalBookings}
              </Text>
              <Text style={styles.mutedText}>Bookings</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', marginTop: 14, gap: 10 }}>
            <View
              style={{
                flex: 1,
                backgroundColor: COLORS.primarySoft,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text style={{ color: COLORS.primary, fontWeight: '900', fontSize: 20 }}>
                {totalBookings}
              </Text>
              <Text style={styles.mutedText}>Scheduled</Text>
            </View>

            <View
              style={{
                flex: 1,
                backgroundColor: conflictCount > 0 ? COLORS.dangerSoft : COLORS.successSoft,
                borderRadius: 16,
                padding: 12,
              }}
            >
              <Text
                style={{
                  color: conflictCount > 0 ? COLORS.danger : COLORS.success,
                  fontWeight: '900',
                  fontSize: 20,
                }}
              >
                {conflictCount}
              </Text>
              <Text style={styles.mutedText}>Conflicts</Text>
            </View>
          </View>
        </View>

        <Text
          style={{
            fontSize: 17,
            fontWeight: '900',
            color: COLORS.text,
            marginBottom: 12,
          }}
        >
          Timeline
        </Text>

        {loading ? (
          <View style={styles.card}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={[styles.mutedText, { textAlign: 'center', marginTop: 10 }]}>
              Loading schedule...
            </Text>
          </View>
        ) : bookings.length === 0 ? (
          <View style={styles.card}>
            <Ionicons name="calendar-clear-outline" size={38} color={COLORS.muted} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '800',
                color: COLORS.text,
                marginTop: 10,
              }}
            >
              No bookings found
            </Text>
            <Text style={[styles.mutedText, { marginTop: 6 }]}>
              Create bookings from Swagger first, then refresh this screen.
            </Text>
          </View>
        ) : (
          bookings.map((booking) => {
            const risk = getRiskStyle(booking.predictedDelayRiskLevel);
            const status = getStatusStyle(booking.bookingStatus);

            return (
              <TouchableOpacity
                key={booking.bookingId}
                style={[
                  styles.card,
                  booking.reschedulingRequired && {
                    borderColor: COLORS.danger,
                    borderWidth: 1.5,
                  },
                ]}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('ProviderBookingDetail', {
                    booking,
                  })
                }
              >
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: COLORS.text }}>
                      {booking.serviceSubCategory}
                    </Text>
                    <Text style={[styles.mutedText, { marginTop: 4 }]}>
                      {booking.serviceCategory}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
                </View>

                <View
                  style={{
                    marginTop: 14,
                    backgroundColor: '#F9FAFB',
                    borderRadius: 14,
                    padding: 12,
                  }}
                >
                  <View style={styles.rowBetween}>
                    <Text style={{ fontWeight: '800', color: COLORS.text }}>
                      {formatDate(booking.startTime)}
                    </Text>
                    <Text style={{ fontWeight: '800', color: COLORS.primary }}>
                      {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                    </Text>
                  </View>

                  <Text style={[styles.mutedText, { marginTop: 6 }]}>
                    Customer: {booking.customerSnapshot?.name || booking.customerId}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                  <View style={[styles.badge, { backgroundColor: risk.bg }]}>
                    <Text style={[styles.badgeText, { color: risk.color }]}>
                      {risk.label}
                    </Text>
                  </View>

                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>
                      {status.label}
                    </Text>
                  </View>

                  {booking.reschedulingRequired && (
                    <View style={[styles.badge, { backgroundColor: COLORS.dangerSoft }]}>
                      <Text style={[styles.badgeText, { color: COLORS.danger }]}>
                        Reschedule Needed
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}