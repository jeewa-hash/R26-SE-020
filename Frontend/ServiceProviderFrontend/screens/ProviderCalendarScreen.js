import React, { useCallback, useContext, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../context/ThemeContext';
import { confirm, notify, openProviderInbox } from '../utils/providerFlowUi';
import { buildProviderSessions, sessionGuidance } from '../utils/providerSessions';
import { canQuoteRequest } from '../utils/providerFlowState';
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

const TABS = ['Sessions', 'Ongoing', 'Requests', 'Quotes', 'Scheduled', 'History'];

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
  if (value === 'ON_THE_WAY' || value === 'IN_PROGRESS' || value === 'QUOTED' || value === 'SENT') return { bg: '#DBEAFE', color: '#15803D' };
  if (value === 'DELAY_REPORTED' || value === 'RESCHEDULE_REQUESTED' || value === 'RESCHEDULING_REQUIRED') return { bg: '#FEF3C7', color: '#D97706' };
  if (value === 'REJECTED' || value === 'CANCELLED' || value === 'EXPIRED') return { bg: '#FEE2E2', color: '#DC2626' };
  if (value === 'COMPLETED' || value === 'RESCHEDULED') return { bg: '#F3F4F6', color: '#4B5563' };
  return { bg: '#EAF7EE', color: '#15803D' };
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
    return 'Your job starts within 15 minutes. Open the booking to confirm readiness and check the start window.';
  }
  if (minutesUntilStart < 0) {
    return 'The scheduled start time has passed. Open the booking to check whether it can still be started.';
  }
  return '';
};

export default function ProviderCalendarScreen({ navigation, route }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = {
    bg: isDark ? '#0C0F0D' : '#F5FAF6',
    card: isDark ? '#161C18' : '#FFFFFF',
    text: isDark ? '#F5FAF6' : '#161C18',
    muted: isDark ? '#94A3B8' : '#64748B',
    border: isDark ? '#303C33' : '#D8E8DC',
    soft: isDark ? '#273449' : '#F1F5F9',
  };
  const [providerId, setProviderId] = useState(null);
  const [activeTab, setActiveTab] = useState('Sessions');
  const [updating, setUpdating] = useState(false);
  useEffect(() => { if (TABS.includes(route?.params?.tab)) setActiveTab(route.params.tab); }, [route?.params?.tab]);
  const [selectedDate, setSelectedDate] = useState(dateKey(new Date()));
  const [requests, setRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [ongoingBookings, setOngoingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [sessionFilter, setSessionFilter] = useState('All');
  const [filterVisible, setFilterVisible] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const sessions = useMemo(() => buildProviderSessions(requests, quotations, [...bookings, ...ongoingBookings]).filter(session => !session.booking || getBookingStatus(session.booking) !== 'COMPLETED'), [requests, quotations, bookings, ongoingBookings]);

  const dates = useMemo(() => nextSevenDays(), []);

  const loadProviderFlow = useCallback(async (id) => {
    try {
      setError('');
      let failedRequests = 0;
      const failed = {};
      const [requestRows, quotationRows, bookingRows, ongoingRows] = await Promise.all([
        getProviderRequests(id).catch((error) => {
          failed.requests = true;
          failedRequests += 1;
          console.log('Provider requests load failed:', error?.message);
          return [];
        }),
        getProviderQuotations().catch((error) => {
          failed.quotations = true;
          failedRequests += 1;
          console.log('Provider quotations load failed:', error?.message);
          return [];
        }),
        getProviderBookings(id).catch((error) => {
          failed.bookings = true;
          failedRequests += 1;
          console.log('Provider jobs load failed:', error?.message);
          return [];
        }),
        getProviderOngoingBookings(id).catch((error) => {
          failed.ongoing = true;
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


      if (failedRequests > 0) {
        setError(failedRequests === 4 ? 'Unable to load your jobs. Please try again.' : 'Some requests, quotations or bookings could not be loaded. Refresh to retry.');
      }

      if (!failed.requests) setRequests(myRequests);
      if (!failed.quotations) setQuotations(myQuotations);
      if (!failed.bookings) setBookings(myBookings);
      if (!failed.ongoing || !failed.bookings) setOngoingBookings(myOngoing);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const initialize = useCallback(async () => {
    setLoading(true);
    const { token, providerId: id, role } = await getStoredProviderAuth();
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
      .filter((booking) => ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(getBookingStatus(booking)))
      .sort((a, b) => (getBookingStartDate(b)?.getTime() || 0) - (getBookingStartDate(a)?.getTime() || 0));
  }, [bookings]);

  const pendingRequests = useMemo(() => {
    return requests.filter((item) => String(item?.status || '').toLowerCase() === 'pending' && !quotations.some(quote => idsEqual(quote.providerRequestId, item._id || item.id) || (item.sessionId && quote.externalSessionId && item.sessionId === quote.externalSessionId)));
  }, [requests, quotations]);

  const submitQuote = (request) => {
    navigation.navigate('IT22129376ProviderQuotationForm', { request });
  };

  const updateBooking = async (booking, action, body = {}) => {
    if (updating) return;
    setUpdating(true);
    try {
      const bookingId = getBookingId(booking);
      if (!bookingId) {
        Alert.alert('Unable to update', 'Booking ID is missing.');
        return;
      }
      await updateBookingLifecycle(bookingId, action, body);
      const messages = {
        'confirm-ready': 'Ready confirmed.',
        'on-the-way': 'The seeker can now see that you are on the way.',
        start: 'Job started successfully.',
        'report-delay': 'Delay reported successfully.',
        complete: 'Job completed successfully.',
      };
      notify('Success', messages[action] || 'Job updated successfully.');
      await loadProviderFlow(providerId);
      if (action === 'complete') setActiveTab('History');
    } catch (error) {
      notify('Update Failed', error?.message || 'Unable to update this job right now. Please try again.');
    } finally { setUpdating(false); }
  };

  const confirmStart = booking => confirm('Start Job', 'Start this job now?', () => updateBooking(booking, 'start'));
  const confirmDelay = booking => openBooking(booking);
  const confirmComplete = booking => confirm('Complete Job', 'Mark this job as completed?', () => updateBooking(booking, 'complete'));

  const openBooking = (booking) => {
    navigation.navigate('IT22129376ProviderJobDetails', { booking });
  };

  const renderGuidance = guidance => (
    <View style={[styles.guidance, { backgroundColor: C.soft }]}>
      <Text style={[styles.guidanceTitle, { color: C.text }]}>{guidance.title}</Text>
      <Text style={[styles.guidanceOwner, { color: guidance.owner === 'You' ? '#15803D' : C.muted }]}>Next: {guidance.owner}</Text>
      <Text style={[styles.guidanceMessage, { color: C.muted }]}>{guidance.message}</Text>
    </View>
  );
  const openSession = session => {
    if (session.booking) return openBooking(session.booking);
    if (session.quotation) return navigation.navigate('IT22129376ProviderQuotationDetails', { quotation: session.quotation });
    navigation.navigate('IT22129376ProviderRequestDetails', { request: session.request });
  };
  const renderSessions = () => {
    const filters = { All: null, 'Needs you': 'attention', 'Waiting for seeker': 'waiting', Booked: 'booked', 'In progress': 'working', Closed: 'closed' };
    const visible = sessions.filter(session => !filters[sessionFilter] || session.guidance.group === filters[sessionFilter]);
    return <>
      <View style={styles.sessionOverview}>
        {[['Needs you', 'attention', 'alert-circle-outline'], ['In progress', 'working', 'construct-outline'], ['Waiting for seeker', 'waiting', 'time-outline']].map(([label, group, icon]) => <TouchableOpacity key={group} accessibilityRole="button" accessibilityLabel={`${label}, ${sessions.filter(item => item.guidance.group === group).length} sessions`} onPress={() => setSessionFilter(label)} style={[styles.overviewTile, { backgroundColor: sessionFilter === label ? (isDark ? '#24402C' : '#E8F4EC') : C.card, borderColor: sessionFilter === label ? '#15803D' : C.border }]}><Ionicons name={icon} size={18} color="#15803D" /><Text style={[styles.overviewCount, { color: C.text }]}>{sessions.filter(item => item.guidance.group === group).length}</Text><Text style={[styles.overviewLabel, { color: C.muted }]}>{label === 'Waiting for seeker' ? 'With customer' : label}</Text></TouchableOpacity>)}
      </View>
      <View style={styles.filterToolbar}>
        <Text style={{ color: C.muted, fontSize: 13 }}>{visible.length} {visible.length === 1 ? 'session' : 'sessions'}</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Filter sessions. Showing ${sessionFilter}`} accessibilityState={{ expanded: filterVisible }} onPress={() => setFilterVisible(true)} style={[styles.filterSelector, { backgroundColor: C.card, borderColor: C.border }]}>
          <Ionicons name="options-outline" size={17} color={C.text} />
          <Text style={{ color: C.text, fontSize: 13, fontWeight: '600' }}>Show: {sessionFilter === 'All' ? 'All sessions' : sessionFilter}</Text>
          <Ionicons name="chevron-down" size={15} color={C.muted} />
        </TouchableOpacity>
      </View>
      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View style={styles.filterOverlay}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close session filters" onPress={() => setFilterVisible(false)} style={StyleSheet.absoluteFillObject} />
          <View accessibilityViewIsModal style={[styles.filterSheet, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.filterSheetHeader}>
              <Text accessibilityRole="header" style={{ color: C.text, fontSize: 19, fontWeight: '700' }}>Show sessions</Text>
              <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close filters" style={{ padding: 10 }} onPress={() => setFilterVisible(false)}><Ionicons name="close" size={22} color={C.text} /></TouchableOpacity>
            </View>
            <ScrollView>
              {Object.entries(filters).map(([label, group]) => {
                const selected = sessionFilter === label;
                const count = group ? sessions.filter(session => session.guidance.group === group).length : sessions.length;
                return <TouchableOpacity key={label} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => { setSessionFilter(label); setFilterVisible(false); }} style={[styles.filterOption, { borderBottomColor: C.border }]}>
                  <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={22} color={selected ? '#15803D' : C.muted} />
                  <Text style={{ flex: 1, color: C.text, fontSize: 15, fontWeight: selected ? '700' : '400' }}>{label === 'All' ? 'All sessions' : label}</Text>
                  <Text style={{ color: C.muted }}>{count}</Text>
                </TouchableOpacity>;
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
      {visible.length === 0 ? renderEmpty('layers-outline', sessionFilter === 'All' ? 'No service sessions yet' : `No sessions: ${sessionFilter.toLowerCase()}`, sessionFilter === 'All' ? 'Apply to a service post on Home. When a seeker requests your quotation, its progress will appear here.' : 'Choose another filter to see your other sessions.') : visible.map(session => {
        const row = session.request || session.booking || session.quotation;
        const start = session.booking ? getBookingStartDate(session.booking) : new Date(session.quotation?.proposedStartTime || session.request?.preferredStartTime || '');
        return <View key={session.key} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sessionHeading}>
            <View style={[styles.sessionStateIcon, { backgroundColor: isDark ? '#24402C' : '#EAF6EE' }]}><Ionicons name={session.booking ? 'calendar-outline' : session.quotation ? 'document-text-outline' : 'mail-outline'} size={21} color="#15803D" /></View>
            <View style={{ flex: 1 }}><Text style={[styles.sessionEyebrow, { color: C.muted }]}>{session.booking ? 'CONFIRMED SERVICE' : session.quotation ? 'QUOTATION' : 'NEW REQUEST'}</Text><Text style={[styles.cardTitle, { color: C.text }]}>{getHumanServiceTitle(row)}</Text></View>
          </View>
          {getHumanSeekerName(session.booking || row) !== 'Customer' ? <Text style={[styles.cardSubText, { color: C.muted }]}>{getHumanSeekerName(session.booking || row)}</Text> : null}
          <View style={[styles.sessionStatus, { borderColor: C.border }]}>
            <View style={styles.sessionDot} /><Text style={[styles.sessionStatusTitle, { color: C.text }]}>{session.guidance.title.replace(/seeker/gi, 'customer')}</Text>
          </View>
          <Text style={[styles.sessionExplanation, { color: C.muted }]}>{session.guidance.message.replace(/seeker/gi, 'customer')}</Text>
          <View style={styles.sessionMeta}><Ionicons name="time-outline" size={16} color={C.muted} /><Text style={[styles.detailText, { color: C.muted, flex: 1 }]}>{start && Number.isFinite(start.getTime()) ? start.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'Start time not chosen'}</Text></View>
          <View style={styles.sessionMeta}><Ionicons name="location-outline" size={16} color={C.muted} /><Text style={[styles.detailText, { color: C.muted, flex: 1 }]}>{getHumanLocation(session.booking || row)}</Text></View>
          <View style={[styles.sessionActionRow, { borderColor: C.border }]}>
            <View style={{ flex: 1 }}><Text style={[styles.sessionEyebrow, { color: C.muted }]}>{session.booking ? 'AGREED AMOUNT' : session.quotation ? 'YOUR PRICE' : 'NEXT STEP'}</Text><Text style={[styles.sessionAmount, { color: C.text }]}>{session.booking || session.quotation ? formatMoney(session.booking?.finalAmount ?? session.quotation?.price) : 'Prepare your quote'}</Text></View>
            <TouchableOpacity accessibilityRole="button" style={styles.sessionOpenButton} onPress={() => openSession(session)}><Text style={styles.primaryButtonText}>{session.booking ? 'Manage Job' : session.quotation ? 'View Quote' : 'Review'}</Text><Ionicons name="arrow-forward" size={16} color="#FFFFFF" /></TouchableOpacity>
          </View>
          {session.request && session.guidance.kind !== 'request' ? <TouchableOpacity accessibilityRole="button" style={styles.originalRequestLink} onPress={() => navigation.navigate('IT22129376ProviderRequestDetails', { request: session.request })}><Text style={[styles.secondaryButtonText, { fontSize: 12 }]}>View original request</Text></TouchableOpacity> : null}
        </View>;
      })}
    </>;
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
        {renderGuidance(sessionGuidance({ booking }))}
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
            {['CONFIRMED', 'RESCHEDULED'].includes(status) ? (
              <TouchableOpacity style={styles.primaryButton} disabled={updating} onPress={() => confirmStart(booking)}>
                <Text style={styles.primaryButtonText}>Start</Text>
              </TouchableOpacity>
            ) : null}
            {status === 'ON_THE_WAY' ? (
              <TouchableOpacity style={styles.primaryButton} disabled={updating} onPress={() => confirmStart(booking)}>
                <Text style={styles.primaryButtonText}>Start</Text>
              </TouchableOpacity>
            ) : null}
            {status === 'IN_PROGRESS' ? (
              <>
                <TouchableOpacity style={styles.warningButton} onPress={() => confirmDelay(booking)}>
                  <Text style={styles.warningButtonText}>Delay</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.successButton} disabled={updating} onPress={() => confirmComplete(booking)}>
                  <Text style={styles.successButtonText}>Complete</Text>
                </TouchableOpacity>
              </>
            ) : null}
            {status === 'DELAY_REPORTED' ? (
              <TouchableOpacity style={styles.successButton} disabled={updating} onPress={() => confirmComplete(booking)}>
                <Text style={styles.successButtonText}>Complete</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : <TouchableOpacity style={styles.fullSecondaryButton} onPress={() => openBooking(booking)}><Text style={styles.secondaryButtonText}>View Job Details</Text></TouchableOpacity>}
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
      {renderGuidance(sessionGuidance({ request }))}
      <TouchableOpacity disabled={!canQuoteRequest(request)} style={[styles.fullPrimaryButton, !canQuoteRequest(request) && { opacity: .5 }]} onPress={() => submitQuote(request)}>
        <Text style={styles.primaryButtonText}>{request.rescheduleRequestedAt ? 'Waiting for New Time' : 'Submit Quotation'}</Text>
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
        {renderGuidance(sessionGuidance({ quotation, request: requests.find(request => idsEqual(request._id || request.id, quotation.providerRequestId)) }))}
        {quotation?.coordinationStatus ? <Text style={[styles.detailText, { color: C.muted }]}>Availability: {statusLabel(quotation.coordinationStatus)}</Text> : null}
        <TouchableOpacity style={styles.fullPrimaryButton} onPress={() => navigation.navigate('IT22129376ProviderQuotationDetails', { quotation })}><Text style={styles.primaryButtonText}>View Quotation & Next Steps</Text></TouchableOpacity>
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

  const scheduledBookings = bookings.filter(booking => ['CONFIRMED', 'RESCHEDULED', 'RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED'].includes(getBookingStatus(booking)));
  const tabCounts = { Sessions: sessions.length, Ongoing: ongoingBookings.length, Requests: pendingRequests.length, Quotes: quotations.length, Scheduled: scheduledBookings.length, History: historyBookings.length };

  const renderBody = () => {
    if (activeTab === 'Sessions') return renderSessions();
    if (activeTab === 'Scheduled') return scheduledBookings.length ? scheduledBookings.map(booking => renderBookingCard(booking, true)) : renderEmpty('calendar-outline', 'No scheduled jobs.', 'Confirmed bookings will appear here.');
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
      <ScrollView
        style={styles.content}
        refreshControl={Platform.OS === 'web' ? undefined : (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        )}
      >
        <HeaderSection navigation={navigation} onInboxPress={() => openProviderInbox(navigation)} />
        <View style={[styles.header, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.headerTitle, { color: C.text }]}>My Jobs</Text>
            <Text style={[styles.headerSubtitle, { color: C.muted }]}>See what happens next for every service</Text>
            {lastUpdated ? <Text style={[styles.headerSubtitle, { color: C.muted }]}>Last checked {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Refresh for new decisions</Text> : null}
          </View>
          <TouchableOpacity style={[styles.refreshButton, { backgroundColor: C.soft }]} disabled={refreshing || loading} accessibilityLabel="Refresh all job statuses" onPress={onRefresh}>
            <Ionicons name="refresh" size={20} color="#166534" />
          </TouchableOpacity>
        </View>

        <View style={[styles.tabsWrap, { backgroundColor: C.bg, borderBottomColor: C.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TABS.map((tab) => {
              const active = activeTab === tab;
              return (
                <TouchableOpacity key={tab} style={[styles.tabPill, { backgroundColor: C.soft }, active && styles.tabPillActive]} onPress={() => setActiveTab(tab)}>
                  <Text style={[styles.tabText, { color: C.muted }, active && styles.tabTextActive]}>{{ Sessions: 'Sessions', Ongoing: 'Active Jobs', Requests: 'New Requests', Quotes: 'Quotations', Scheduled: 'Upcoming', History: 'History' }[tab]} ({tabCounts[tab]})</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.contentContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#15803D" />
              <Text style={[styles.loadingText, { color: C.muted }]}>Loading provider jobs...</Text>
            </View>
          ) : <>
            {error ? <View style={[styles.emptyContainer, { backgroundColor: C.card, borderColor: C.border }]}>
              <Text accessibilityRole="alert" style={[styles.emptyTitle, { color: C.text }]}>{error}</Text>
              <TouchableOpacity style={styles.fullPrimaryButton} onPress={onRefresh}><Text style={styles.primaryButtonText}>Retry Loading</Text></TouchableOpacity>
            </View> : null}
            {renderBody()}
          </>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sessionOverview: { flexDirection: 'row', gap: 8, marginBottom: 8 }, overviewTile: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, gap: 5 }, overviewCount: { fontSize: 23, fontWeight: '700' }, overviewLabel: { fontSize: 11, lineHeight: 16 },
  sessionHeading: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' }, sessionStateIcon: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }, sessionEyebrow: { fontSize: 9, fontWeight: '700', letterSpacing: .7, marginBottom: 4 },
  sessionStatus: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: 14, marginTop: 15, borderTopWidth: 1 }, sessionDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#15803D' }, sessionStatusTitle: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '600' }, sessionExplanation: { fontSize: 12, lineHeight: 19, marginTop: 7, marginBottom: 8 }, sessionMeta: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  sessionActionRow: { borderTopWidth: 1, marginTop: 16, paddingTop: 14, flexDirection: 'row', gap: 10, alignItems: 'center' }, sessionAmount: { fontSize: 16, fontWeight: '700' }, sessionOpenButton: { backgroundColor: '#15803D', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 11, flexDirection: 'row', alignItems: 'center', gap: 7 }, originalRequestLink: { alignSelf: 'flex-start', paddingTop: 14, paddingBottom: 3 },
  filterToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  filterSelector: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  filterOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet: { width: '100%', maxWidth: 560, maxHeight: '75%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderWidth: 1 },
  filterSheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  filterOption: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  guidance: { padding: 12, borderRadius: 12, marginTop: 12 }, guidanceTitle: { fontSize: 15, fontWeight: '700' }, guidanceOwner: { fontSize: 12, fontWeight: '700', marginTop: 5 }, guidanceMessage: { fontSize: 13, lineHeight: 19, marginTop: 5 },
  stageRow: { flexDirection: 'row', gap: 6, marginTop: 16, marginBottom: 4 }, stageItem: { flex: 1, gap: 5 }, stageLine: { height: 4, borderRadius: 3 },
  container: { flex: 1, minHeight: 0, backgroundColor: '#F5FAF6' },
  header: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.5 },
  headerTextWrap: { flex: 1 },
  headerTitle: { fontSize: 24, fontWeight: '600', color: '#161C18' },
  headerSubtitle: { fontSize: 12, fontWeight: '400', color: '#64748B', marginTop: 3 },
  refreshButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabsWrap: { flexShrink: 0, backgroundColor: '#F5FAF6', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#D8E8DC' },
  tabPill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, backgroundColor: '#F3F4F6', marginLeft: 10 },
  tabPillActive: { backgroundColor: '#15803D' },
  tabText: { color: '#6B7280', fontWeight: '500', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, minHeight: 0 },
  contentContainer: { padding: 16, paddingBottom: 120 },
  loadingContainer: { alignItems: 'center', padding: 32 },
  loadingText: { fontSize: 15, color: '#6B7280', marginTop: 8 },
  dateStrip: { flexGrow: 0, flexShrink: 0, marginBottom: 14 },
  datePill: { width: 86, paddingVertical: 12, borderRadius: 16, backgroundColor: '#fff', marginRight: 10, alignItems: 'center', borderWidth: 1, borderColor: '#EEF2F7' },
  datePillActive: { backgroundColor: '#15803D', borderColor: '#15803D' },
  datePillLabel: { color: '#6B7280', fontSize: 12, fontWeight: '500' },
  datePillDay: { color: '#162C49', fontSize: 20, fontWeight: '600', marginTop: 3 },
  datePillTextActive: { color: '#fff' },
  sectionTitle: { fontSize: 20, fontWeight: '600', color: '#162C49', marginTop: 6 },
  summaryText: { color: '#6B7280', marginTop: 4, marginBottom: 14, fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 16, marginBottom: 13, borderWidth: 1, borderColor: '#EEF2F7', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  cardTitleWrap: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#162C49' },
  cardSubText: { marginTop: 4, fontSize: 13, color: '#6B7280' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  statusText: { fontSize: 11, fontWeight: '600' },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  detailText: { fontSize: 13, color: '#4B5563', marginLeft: 7, flex: 1 },
  warningText: { marginTop: 8, color: '#B45309', backgroundColor: '#FFFBEB', borderRadius: 10, padding: 9, fontSize: 12, fontWeight: '600' },
  reminderBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB', borderRadius: 12, padding: 10, marginBottom: 12 },
  reminderText: { color: '#92400E', fontSize: 12, fontWeight: '500', marginLeft: 8, flex: 1 },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  secondaryButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#EAF7EE' },
  secondaryButtonText: { color: '#166534', fontWeight: '600', fontSize: 12 },
  primaryButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#15803D' },
  primaryButtonText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  fullPrimaryButton: { marginTop: 14, paddingVertical: 12, borderRadius: 12, backgroundColor: '#15803D', alignItems: 'center' },
  fullSecondaryButton: { marginTop: 8, paddingVertical: 12, borderRadius: 12, backgroundColor: '#EAF7EE', alignItems: 'center' },
  warningButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#FEF3C7' },
  warningButtonText: { color: '#B45309', fontWeight: '600', fontSize: 12 },
  successButton: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, backgroundColor: '#D1FAE5' },
  successButtonText: { color: '#047857', fontWeight: '600', fontSize: 12 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderRadius: 18, padding: 30, borderWidth: 1, borderColor: '#EEF2F7' },
  emptyTitle: { marginTop: 12, color: '#4B5563', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  emptySubText: { marginTop: 5, color: '#9CA3AF', fontSize: 13, textAlign: 'center' },
});
