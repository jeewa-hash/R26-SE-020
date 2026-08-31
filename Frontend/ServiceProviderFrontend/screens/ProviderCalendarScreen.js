import React, { useCallback, useContext, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import HeaderSection from '../components/HeaderSection';
import { getStoredProviderAuth } from '../pages/IT22129376/services/providerAuthStorage';
import {
  getProviderRequests,
  getProviderQuotations,
  getProviderBookings,
  getProviderOngoingBookings,
  updateBookingLifecycle,
  idsEqual,
  getBookingId,
  getBookingStatus,
  getBookingStartDate,
  getBookingEndDate,
  getBookingDateKey,
  getHumanSeekerName,
  getHumanServiceTitle,
  getHumanLocation,
  statusLabel,
  isOngoingBooking,
} from '../services/providerFlowApi';

const TABS = ['Calendar', 'Ongoing', 'Requests', 'Quotes', 'History'];

const dateKey = (date) => date.toISOString().slice(0, 10);

const nextSevenDays = () => {
  const today = new Date();
  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    const key = dateKey(date);
    const label = index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : date.toLocaleDateString('en-US', { weekday: 'short' });
    const day = date.toLocaleDateString('en-US', { day: '2-digit' });
    return { key, label, day, date };
  });
};

const formatDateTitle = (key) => {
  const date = new Date(`${key}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Selected date';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: '2-digit',
  });
};

const formatTime = (date) => {
  if (!date || Number.isNaN(date.getTime())) return 'Time not set';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatMoney = (amount) => {
  const value = Number(amount || 0);
  if (!value) return 'Amount not set';
  return `LKR ${value.toLocaleString()}`;
};

const getStatusStyle = (status) => {
  const value = String(status || '').toUpperCase();
  if (value === 'CONFIRMED' || value === 'ACCEPTED') return { bg: '#D1FAE5', color: '#047857' };
  if (value === 'IN_PROGRESS' || value === 'QUOTED' || value === 'SENT') return { bg: '#DBEAFE', color: '#2563EB' };
  if (value === 'DELAY_REPORTED' || value === 'RESCHEDULING_REQUIRED') return { bg: '#FEF3C7', color: '#D97706' };
  if (value === 'REJECTED' || value === 'CANCELLED') return { bg: '#FEE2E2', color: '#DC2626' };
  if (value === 'COMPLETED' || value === 'RESCHEDULED') return { bg: '#F3F4F6', color: '#4B5563' };
  return { bg: '#EEF2FF', color: '#6366F1' };
};

const matchesProvider = (item, providerId) => {
  if (!providerId) return true;
  const itemProviderId =
    item?.providerId?._id ||
    item?.providerId ||
    item?.provider?._id ||
    item?.provider?.id ||
    item?.providerSnapshot?.providerId?._id ||
    item?.providerSnapshot?.providerId;
  // `/provider/me` responses are already authenticated and may omit providerId.
  return !itemProviderId || idsEqual(itemProviderId, providerId);
};

const getReminderText = (booking) => {
  const status = getBookingStatus(booking);
  if (status !== 'CONFIRMED') return '';
  const start = getBookingStartDate(booking);
  if (!start) return '';
  const minutesUntilStart = (start.getTime() - Date.now()) / 60000;
  if (minutesUntilStart >= 0 && minutesUntilStart <= 15) {
    return 'Your job starts in 15 minutes. Please confirm readiness or report a delay.';
  }
  if (minutesUntilStart < 0) {
    return 'This job is scheduled to start now. Please start the job or report a delay.';
  }
  return '';
};

export default function ProviderCalendarScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    card: isDark ? '#1E293B' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#1E293B',
    muted: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#334155' : '#E2E8F0',
    soft: isDark ? '#273449' : '#F1F5F9',
  };
  const [providerId, setProviderId] = useState(null);
  const [activeTab, setActiveTab] = useState('Calendar');
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [requests, setRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [ongoingBookings, setOngoingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const dates = useMemo(() => nextSevenDays(), []);

  const loadProviderFlow = useCallback(async (id) => {
    try {
      setError('');
      let failedRequests = 0;
      const [requestRows, quotationRows, bookingRows, ongoingRows] = await Promise.all([
        getProviderRequests(id).catch((error) => {
          failedRequests += 1;
          console.log('Provider requests load failed:', error?.message);
          return [];
        }),
        getProviderQuotations().catch((error) => {
          failedRequests += 1;
          console.log('Provider quotations load failed:', error?.message);
          return [];
        }),
        getProviderBookings(id).catch((error) => {
          failedRequests += 1;
          console.log('Provider jobs load failed:', error?.message);
          return [];
        }),
        getProviderOngoingBookings(id).catch((error) => {
          failedRequests += 1;
          console.log('Provider ongoing load failed:', error?.message);
          return [];
        }),
      ]);

      const myRequests = requestRows.filter((item) => matchesProvider(item, id));
      const myQuotations = quotationRows.filter((item) => matchesProvider(item, id));
      const myBookings = bookingRows.filter((item) => matchesProvider(item, id));
      const myOngoing = ongoingRows.length > 0
        ? ongoingRows.filter((item) => matchesProvider(item, id))
        : myBookings.filter(isOngoingBooking);

      console.log('Provider requests raw count:', requestRows.length);
      console.log('Provider requests filtered count:', myRequests.length);
      console.log('Provider quotations raw count:', quotationRows.length);
      console.log('Provider quotations filtered count:', myQuotations.length);
      console.log('Provider bookings raw count:', bookingRows.length);
      console.log('Provider bookings filtered count:', myBookings.length);
      console.log('Provider ongoing raw count:', ongoingRows.length);
      console.log('Provider ongoing filtered count:', myOngoing.length);

      if (failedRequests === 4) {
        setError('Unable to load data right now. Please check your connection and try again.');
      }

      setRequests(myRequests);
      setQuotations(myQuotations);
      setBookings(myBookings);
      setOngoingBookings(myOngoing);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    const { token, providerId: id, role } = await getStoredProviderAuth();
    console.log('LOGGED PROVIDER ID:', id);
    if (!token || !id || !String(role || '').toLowerCase().includes('provider')) {
      setLoading(false);
      Alert.alert('Login Required', 'Provider ID not found. Please login again.');
      navigation.navigate('Login');
      return;
    }
    setProviderId(String(id));
    await loadProviderFlow(String(id));
  }, [loadProviderFlow, navigation]);

  useFocusEffect(useCallback(() => {
    initialize();
  }, [initialize]));

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProviderFlow(providerId);
  };

  const calendarBookings = useMemo(() => {
    return bookings
      .filter((booking) => getBookingDateKey(booking) === selectedDate)
      .sort((a, b) => (getBookingStartDate(a)?.getTime() || 0) - (getBookingStartDate(b)?.getTime() || 0));
  }, [bookings, selectedDate]);

  const historyBookings = useMemo(() => {
    return bookings
      .filter((booking) => ['COMPLETED', 'CANCELLED'].includes(getBookingStatus(booking)))
      .sort((a, b) => (getBookingStartDate(b)?.getTime() || 0) - (getBookingStartDate(a)?.getTime() || 0));
  }, [bookings]);

  const pendingRequests = useMemo(() => {
    return requests.filter((item) => String(item?.status || '').toLowerCase() === 'pending');
  }, [requests]);

  const submitQuote = (request) => {
    navigation.navigate('IT22129376ProviderQuotationForm', { request });
  };

  const updateBooking = async (booking, action, body = {}) => {
    try {
      const bookingId = getBookingId(booking);
      if (!bookingId) {
        Alert.alert('Unable to update', 'Booking ID is missing.');
        return;
      }
      await updateBookingLifecycle(bookingId, action, body);
      const messages = {
        'confirm-ready': 'Ready confirmed.',
        start: 'Job started successfully.',
        'report-delay': 'Delay reported successfully.',
        complete: 'Job completed successfully.',
      };
      Alert.alert('Success', messages[action] || 'Job updated successfully.');
      await loadProviderFlow(providerId);
    } catch (error) {
      Alert.alert('Update Failed', error?.message || 'Unable to update this job right now. Please try again.');
    }
  };

  const confirmStart = (booking) => {
    Alert.alert('Start Job', 'Start this job now?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => updateBooking(booking, 'start') },
    ]);
  };

  const confirmDelay = (booking) => {
    Alert.alert(
      'Report Delay',
      'Report a 30 minute delay for this job? You can edit this from backend later if needed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => updateBooking(booking, 'report-delay', {
            delayReason: 'Provider needs additional time',
            extraTimeMinutes: 30,
          }),
        },
      ]
    );
  };

  const confirmComplete = (booking) => {
    Alert.alert('Complete Job', 'Mark this job as completed?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => updateBooking(booking, 'complete') },
    ]);
  };

  const openBooking = (booking) => {
    navigation.navigate('IT22129376ProviderJobDetails', { booking });
  };

  const renderStatusBadge = (status) => {
    const colors = getStatusStyle(status);
    return (
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusText, { color: colors.color }]}>{statusLabel(status)}</Text>
      </View>
    );
  };

  const renderBookingCard = (booking, showActions = true) => {
    const status = getBookingStatus(booking);
    const start = getBookingStartDate(booking);
    const end = getBookingEndDate(booking);
    const reminder = getReminderText(booking);
    const delayImpact = booking?.delayInfo?.delayImpactStatus;

    return (
      <View key={getBookingId(booking)} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        {reminder ? (
          <View style={styles.reminderBanner}>
            <Ionicons name="notifications-outline" size={16} color="#B45309" />
            <Text style={styles.reminderText}>{reminder}</Text>
          </View>
        ) : null}

        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{getHumanServiceTitle(booking)}</Text>
            <Text style={[styles.cardSubText, { color: C.muted }]}>{formatTime(start)} - {formatTime(end)}</Text>
          </View>
          {renderStatusBadge(status)}
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={15} color="#6B7280" />
          <Text style={[styles.detailText, { color: C.muted }]}>{getHumanSeekerName(booking)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={15} color="#6B7280" />
          <Text style={[styles.detailText, { color: C.muted }]}>{getHumanLocation(booking)}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={15} color="#6B7280" />
          <Text style={[styles.detailText, { color: C.muted }]}>{formatMoney(booking?.finalAmount || booking?.amount || booking?.price)}</Text>
        </View>
        {booking?.delayRiskLevel ? (
          <View style={styles.detailRow}>
            <Ionicons name="speedometer-outline" size={15} color="#6B7280" />
            <Text style={[styles.detailText, { color: C.muted }]}>Delay risk: {booking.delayRiskLevel}</Text>
          </View>
        ) : null}
        {booking?.delayInfo?.expectedEndTime ? (
          <View style={styles.detailRow}>
            <Ionicons name="time-outline" size={15} color="#6B7280" />
            <Text style={[styles.detailText, { color: C.muted }]}>Expected end: {formatTime(new Date(booking.delayInfo.expectedEndTime))}</Text>
          </View>
        ) : null}
        {booking?.delayInfo?.delayReason ? (
          <Text style={styles.warningText}>Delay reason: {booking.delayInfo.delayReason}</Text>
        ) : null}
        {delayImpact === 'NEXT_BOOKING_AT_RISK' ? (
          <Text style={styles.warningText}>This delay may affect your next scheduled job.</Text>
        ) : null}

        {showActions ? (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => openBooking(booking)}>
              <Text style={styles.secondaryButtonText}>View Job</Text>
            </TouchableOpacity>
            {status === 'CONFIRMED' ? (
              <>
                <TouchableOpacity style={styles.primaryButton} onPress={() => updateBooking(booking, 'confirm-ready')}>
                  <Text style={styles.primaryButtonText}>Ready</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryButton} onPress={() => confirmStart(booking)}>
                  <Text style={styles.primaryButtonText}>Start</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.warningButton} onPress={() => confirmDelay(booking)}>
                  <Text style={styles.warningButtonText}>Delay</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {status === 'IN_PROGRESS' ? (
              <>
                <TouchableOpacity style={styles.warningButton} onPress={() => confirmDelay(booking)}>
                  <Text style={styles.warningButtonText}>Delay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.successButton} onPress={() => confirmComplete(booking)}>
                  <Text style={styles.successButtonText}>Complete</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {status === 'DELAY_REPORTED' ? (
              <TouchableOpacity style={styles.successButton} onPress={() => confirmComplete(booking)}>
                <Text style={styles.successButtonText}>Complete</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    );
  };

  const renderRequestCard = (request) => (
    <View key={request?._id || request?.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleWrap}>
          <Text style={[styles.cardTitle, { color: C.text }]}>{getHumanServiceTitle(request)}</Text>
          <Text style={[styles.cardSubText, { color: C.muted }]}>{request?.preferredTimeLabel || 'Preferred time not set'}</Text>
        </View>
        {renderStatusBadge(request?.status || 'pending')}
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="person-outline" size={15} color="#6B7280" />
        <Text style={[styles.detailText, { color: C.muted }]}>{getHumanSeekerName(request)}</Text>
      </View>
      <View style={styles.detailRow}>
        <Ionicons name="location-outline" size={15} color="#6B7280" />
        <Text style={[styles.detailText, { color: C.muted }]}>{getHumanLocation(request)}</Text>
      </View>
      {request?.seekerBudgetAmount ? (
        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={15} color="#6B7280" />
          <Text style={[styles.detailText, { color: C.muted }]}>Budget: {formatMoney(request.seekerBudgetAmount)}</Text>
        </View>
      ) : null}
      <TouchableOpacity style={styles.fullPrimaryButton} onPress={() => submitQuote(request)}>
        <Text style={styles.primaryButtonText}>Submit Quotation</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.fullSecondaryButton} onPress={() => navigation.navigate('IT22129376ProviderRequestDetails', { request })}>
        <Text style={styles.secondaryButtonText}>View Details</Text>
      </TouchableOpacity>
    </View>
  );

  const renderQuotationCard = (quotation) => {
    const price = Number(quotation?.price || quotation?.providerQuotedPrice || 0);
    const duration = Number(quotation?.estimatedDurationHours || quotation?.providerEstimatedDurationHours || 0);
    const hourly = price && duration ? price / duration : 0;
    return (
      <View key={quotation?._id || quotation?.id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.cardTitle, { color: C.text }]}>{getHumanServiceTitle(quotation)}</Text>
            <Text style={[styles.cardSubText, { color: C.muted }]}>{formatMoney(price)} · {duration || '-'} hour(s)</Text>
          </View>
          {renderStatusBadge(quotation?.status || quotation?.coordinationStatus || 'SENT')}
        </View>
        {hourly ? <Text style={[styles.detailText, { color: C.muted }]}>Rate: LKR {Math.round(hourly).toLocaleString()}/hr</Text> : null}
        {quotation?.notes ? <Text style={[styles.detailText, { color: C.muted }]}>Note: {quotation.notes}</Text> : null}
        {quotation?.coordinationStatus ? <Text style={[styles.detailText, { color: C.muted }]}>Availability: {statusLabel(quotation.coordinationStatus)}</Text> : null}
      </View>
    );
  };

  const renderEmpty = (icon, title, subtitle) => (
    <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }]}>
      <Ionicons name={icon} size={46} color="#9CA3AF" />
      <Text style={[styles.emptyTitle, { color: C.text }]}>{title}</Text>
      <Text style={[styles.emptySubText, { color: C.muted }]}>{subtitle}</Text>
    </View>
  );

  const renderCalendar = () => {
    const confirmed = calendarBookings.filter((item) => getBookingStatus(item) === 'CONFIRMED').length;
    const inProgress = calendarBookings.filter((item) => getBookingStatus(item) === 'IN_PROGRESS').length;
    const completed = calendarBookings.filter((item) => getBookingStatus(item) === 'COMPLETED').length;

    return (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateStrip}>
          {dates.map((item) => {
            const selected = selectedDate === item.key;
            return (
              <TouchableOpacity
                key={item.key}
                onPress={() => setSelectedDate(item.key)}
                style={[styles.datePill, { backgroundColor: C.card, borderColor: C.border }, selected && styles.datePillActive]}
              >
                <Text style={[styles.datePillLabel, { color: C.muted }, selected && styles.datePillTextActive]}>{item.label}</Text>
                <Text style={[styles.datePillDay, { color: C.text }, selected && styles.datePillTextActive]}>{item.day}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.sectionTitle, { color: C.text }]}>{formatDateTitle(selectedDate)}</Text>
        <Text style={[styles.summaryText, { color: C.muted }]}>
          {calendarBookings.length} jobs · {confirmed} confirmed · {inProgress} in progress · {completed} completed
        </Text>

        {calendarBookings.length === 0
          ? renderEmpty('calendar-outline', 'No jobs scheduled for this date.', 'Select another date or refresh your schedule.')
          : calendarBookings.map((booking) => renderBookingCard(booking, true))}
      </>
    );
  };

  const renderBody = () => {
    if (activeTab === 'Calendar') return renderCalendar();
    if (activeTab === 'Ongoing') {
      return ongoingBookings.length === 0
        ? renderEmpty('briefcase-outline', 'No ongoing jobs right now.', 'Jobs you start or jobs scheduled soon will appear here.')
        : ongoingBookings.map((booking) => renderBookingCard(booking, true));
    }
    if (activeTab === 'Requests') {
      return pendingRequests.length === 0
        ? renderEmpty('document-text-outline', 'No incoming requests yet.', 'New quotation requests assigned to you will appear here.')
        : pendingRequests.map(renderRequestCard);
    }
    if (activeTab === 'Quotes') {
      return quotations.length === 0
        ? renderEmpty('receipt-outline', 'No quotations sent yet.', 'Submitted quotations will appear here.')
        : quotations.map(renderQuotationCard);
    }
    return historyBookings.length === 0
      ? renderEmpty('time-outline', 'Completed and cancelled jobs will appear here.', 'Your job history is currently empty.')
      : historyBookings.map((booking) => renderBookingCard(booking, false));
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <HeaderSection navigation={navigation} onInboxPress={() => navigation.navigate('InboxScreen')} />
      <View style={[styles.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerTitle, { color: C.text }]}>My Jobs</Text>
          <Text style={[styles.headerSubtitle, { color: C.muted }]}>Calendar, requests, quotes and ongoing work</Text>
        </View>
        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: C.soft }]} onPress={onRefresh}>
          <Ionicons name="refresh" size={20} color="#7C3AED" />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabsWrap, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity key={tab} style={[styles.tabPill, { backgroundColor: C.soft }, active && styles.tabPillActive]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, { color: C.muted }, active && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={[styles.loadingText, { color: C.muted }]}>Loading provider jobs...</Text>
          </View>
        ) : error ? (
          <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }]}>
            <Ionicons name="cloud-offline-outline" size={46} color="#9CA3AF" />
            <Text style={[styles.emptyTitle, { color: C.text }]}>{error}</Text>
          </View>
        ) : renderBody()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#1E293B' },
  headerSubtitle: { fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 3 },
  refreshButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabsWrap: { backgroundColor: '#F8FAFC', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: '#F3F4F6', marginLeft: 10 },
  tabPillActive: { backgroundColor: '#667eea' },
  tabText: { color: '#6B7280', fontWeight: '500', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, padding: 16 },
  loadingContainer: { alignItems: 'center', padding: 32 },
  loadingText: { fontSize: 15, color: '#6B7280', marginTop: 8 },
  dateStrip: { marginBottom: 14 },
  datePill: { width: 86, paddingVertical: 12, borderRadius: 16, backgroundColor: '#fff', marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EEF2F7' },
  datePillActive: { backgroundColor: '#667eea', borderColor: '#667eea' },
  datePillLabel: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  datePillDay: { color: '#111827', fontSize: 20, fontWeight: '600', marginTop: 3 },
  datePillTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#111827', marginTop: 6 },
  summaryText: { color: '#6B7280', marginTop: 4, marginBottom: 14, fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: '#EEF2F7', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardTitleWrap: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardSubText: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  detailText: { fontSize: 13, color: '#4B5563', marginLeft: 7, flex: 1 },
  warningText: { marginTop: 8, color: '#B45309', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 9, fontSize: 12, fontWeight: '600' },
  reminderBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 10, marginBottom: 12 },
  reminderText: { color: '#92400E', fontSize: 12, fontWeight: '500', marginLeft: 8, flex: 1 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  secondaryButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#EEF2FF' },
  secondaryButtonText: { color: '#4F46E5', fontWeight: '600', fontSize: 12 },
  primaryButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#667eea' },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  fullPrimaryButton: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#667eea', alignItems: 'center' },
  fullSecondaryButton: { marginTop: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center' },
  warningButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#FEF3C7' },
  warningButtonText: { color: '#B45309', fontWeight: '600', fontSize: 12 },
  successButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#D1FAE5' },
  successButtonText: { color: '#047857', fontWeight: '600', fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 30, borderWidth: 1, borderColor: '#EEF2F7' },
  emptyTitle: { marginTop: 12, color: '#4B5563', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubText: { marginTop: 5, color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
});
