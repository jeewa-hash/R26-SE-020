// pages/IT22129376/ProviderMyJobsScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ThemeContext } from '../../context/ThemeContext';
import { COLORS } from './theme';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import { getProviderJobs, getProviderQuotations, getProviderRequests } from './services/providerFlowApi';
import { formatDate, formatFullDate, formatTime, isSameDay } from './utils/dateTimeFormatter';
import {
  getBookingStart,
  getBookingEnd,
  getBookingId,
  getQuotationId,
  getRequestId,
  getRiskStyle,
  getServiceCategory,
  getServiceTitle,
  getSeekerName,
  getStatus,
  getStatusStyle,
  isClosedBooking,
  normalizeBooking,
  normalizeQuotation,
  normalizeRequest,
} from './utils/providerFlowMapper';

const TABS = ['Today', 'Requests', 'Quotes', 'Scheduled', 'History'];

const toComparableId = (value) => {
  if (!value) return '';

  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (typeof value === 'object') {
    return String(
      value?._id?.$oid ||
        value?._id ||
        value?.id ||
        value?.providerId ||
        value?.provider?._id ||
        value?.provider?.id ||
        value?.userId ||
        ''
    );
  }

  return String(value);
};

const idMatches = (value, targetId) => {
  if (!value || !targetId) return false;

  if (Array.isArray(value)) {
    return value.some((item) => idMatches(item, targetId));
  }

  return toComparableId(value) === String(targetId);
};

const belongsToLoggedProvider = (item, providerId) => {
  if (!item || !providerId) return false;

  return (
    idMatches(item.providerId, providerId) ||
    idMatches(item.selectedProviderId, providerId) ||
    idMatches(item.assignedProviderId, providerId) ||
    idMatches(item.serviceProviderId, providerId) ||
    idMatches(item.provider, providerId) ||
    idMatches(item.serviceProvider, providerId) ||
    idMatches(item.providerIds, providerId) ||
    idMatches(item.selectedProviderIds, providerId) ||
    idMatches(item.assignedProviderIds, providerId) ||
    idMatches(item.providers, providerId) ||
    idMatches(item.selectedProviders, providerId) ||
    idMatches(item.assignedProviders, providerId) ||
    idMatches(item.providerSnapshot?.id, providerId) ||
    idMatches(item.providerSnapshot?._id, providerId) ||
    idMatches(item.providerSnapshot?.providerId, providerId)
  );
};

const filterForLoggedProvider = (items, providerId) => {
  if (!Array.isArray(items)) return [];
  if (!providerId) return [];

  return items.filter((item) => belongsToLoggedProvider(item, providerId));
};

const Badge = ({ label, bg, color }) => (
  <View style={[styles.badge, { backgroundColor: bg }]}> 
    <Text style={[styles.badgeText, { color }]}>{label}</Text>
  </View>
);

const EmptyState = ({ icon, title, message, isDark }) => (
  <View style={[styles.emptyCard, isDark && styles.cardDark]}>
    <View style={styles.emptyIconBox}>
      <Ionicons name={icon} size={34} color={COLORS.muted} />
    </View>
    <Text style={[styles.emptyTitle, isDark && styles.textDark]}>{title}</Text>
    <Text style={[styles.emptyMessage, isDark && styles.textMutedDark]}>{message}</Text>
  </View>
);

const StatCard = ({ icon, value, label, color, bg, isDark }) => (
  <View style={[styles.statCard, isDark && styles.statCardDark]}>
    <View style={[styles.statIcon, { backgroundColor: bg }]}> 
      <Ionicons name={icon} size={20} color={color} />
    </View>
    <Text style={[styles.statValue, isDark && styles.textDark]}>{value}</Text>
    <Text style={[styles.statLabel, isDark && styles.textMutedDark]}>{label}</Text>
  </View>
);

const RequestCard = ({ request, onPress, onQuote, isDark }) => {
  const status = getStatusStyle(request.status || 'PENDING');
  return (
    <TouchableOpacity style={[styles.card, isDark && styles.cardDark]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>{getServiceTitle(request)}</Text>
          <Text style={[styles.cardSub, isDark && styles.textMutedDark]}>{getServiceCategory(request)}</Text>
        </View>
        <Badge label={status.label} bg={status.bg} color={status.color} />
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.infoLine}>👤 {getSeekerName(request)}</Text>
        <Text style={styles.infoLine}>📍 {request.locationText || 'Location not available'}</Text>
        <Text style={styles.infoLine}>🕒 Preferred: {formatDate(request.preferredStartTime || request.requestedDate || request.createdAt)} {formatTime(request.preferredStartTime || request.requestedStartTime)}</Text>
        <Text style={styles.infoLine}>💰 Budget: LKR {request.seekerBudgetAmount || request.budget || request.price || '-'}</Text>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.secondaryButton} onPress={onPress}>
          <Text style={styles.secondaryButtonText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton} onPress={onQuote}>
          <Ionicons name="send-outline" size={16} color="#fff" />
          <Text style={styles.primaryButtonText}>Submit Quote</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const QuoteCard = ({ quotation, onPress, isDark }) => {
  const status = getStatusStyle(quotation.status || quotation.coordinationStatus || 'SENT');
  return (
    <TouchableOpacity style={[styles.card, isDark && styles.cardDark]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>{quotation.title || getServiceTitle(quotation)}</Text>
          <Text style={[styles.cardSub, isDark && styles.textMutedDark]}>For {quotation.seekerName || getSeekerName(quotation)}</Text>
        </View>
        <Text style={styles.priceText}>LKR {quotation.price || quotation.quotedPrice || '-'}</Text>
      </View>
      <View style={styles.badgeRow}>
        <Badge label={status.label} bg={status.bg} color={status.color} />
        {quotation.coordinationStatus ? (
          <Badge label={quotation.coordinationStatus} bg={COLORS.infoSoft} color={COLORS.info} />
        ) : null}
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.infoLine}>🕒 Proposed: {formatDate(quotation.proposedStartTime)} {formatTime(quotation.proposedStartTime)}</Text>
        <Text style={styles.infoLine}>⏱ Duration: {quotation.estimatedDurationHours || '-'} hours</Text>
      </View>
    </TouchableOpacity>
  );
};

const BookingCard = ({ booking, onPress, isDark }) => {
  const start = getBookingStart(booking);
  const end = getBookingEnd(booking);
  const status = getStatusStyle(getStatus(booking));
  const risk = getRiskStyle(booking.delayRiskLevel || booking.predictedDelayRiskLevel);
  return (
    <TouchableOpacity style={[styles.card, isDark && styles.cardDark]} activeOpacity={0.85} onPress={onPress}>
      <View style={styles.cardTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, isDark && styles.textDark]}>{getServiceTitle(booking)}</Text>
          <Text style={[styles.cardSub, isDark && styles.textMutedDark]}>{getServiceCategory(booking)}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
      </View>
      <View style={styles.infoBlock}>
        <Text style={styles.infoLine}>👤 {getSeekerName(booking)}</Text>
        <Text style={styles.infoLine}>📅 {formatDate(start)}</Text>
        <Text style={styles.infoLine}>🕒 {formatTime(start)} - {formatTime(end)}</Text>
        <Text style={styles.infoLine}>📍 {booking.locationText || 'Location not available'}</Text>
      </View>
      <View style={styles.badgeRow}>
        <Badge label={status.label} bg={status.bg} color={status.color} />
        <Badge label={risk.label} bg={risk.bg} color={risk.color} />
      </View>
    </TouchableOpacity>
  );
};

const getTimelineTop = (value) => {
  if (!value) return 0;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 0;
  const startHour = 7;
  const hourHeight = 72;
  return Math.max(0, (d.getHours() - startHour) * hourHeight + (d.getMinutes() / 60) * hourHeight);
};

const getTimelineHeight = (startValue, endValue) => {
  if (!startValue || !endValue) return 72;
  const start = new Date(startValue);
  const end = new Date(endValue);
  const diff = Math.max(45, (end.getTime() - start.getTime()) / 60000);
  return Math.max(58, (diff / 60) * 72);
};

export default function ProviderMyJobsScreen({ navigation }) {
  const themeContext = React.useContext(ThemeContext);
  const isDark = themeContext?.isDark || false;
  const [activeTab, setActiveTab] = useState('Today');
  const [providerId, setProviderId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [backendWarning, setBackendWarning] = useState(null);

  const normalizedRequests = useMemo(() => requests.map(normalizeRequest), [requests]);
  const normalizedQuotes = useMemo(() => quotations.map((q) => normalizeQuotation(q, normalizedRequests)), [quotations, normalizedRequests]);
  const normalizedJobs = useMemo(() => jobs.map(normalizeBooking), [jobs]);

  const todayJobs = useMemo(() => normalizedJobs.filter((job) => isSameDay(getBookingStart(job), new Date()) && !isClosedBooking(job)), [normalizedJobs]);
  const scheduledJobs = useMemo(() => normalizedJobs.filter((job) => !isClosedBooking(job)), [normalizedJobs]);
  const historyJobs = useMemo(() => normalizedJobs.filter(isClosedBooking), [normalizedJobs]);

  const loadAll = async () => {
    try {
      setError(null);
      setBackendWarning(null);
      const auth = await getStoredProviderAuth();
      if (!auth.isLoggedIn || !auth.providerId) {
        setProviderId(null);
        setRequests([]);
        setQuotations([]);
        setJobs([]);
        setError('Provider login details were not found. Please login again.');
        return;
      }
      setProviderId(auth.providerId);
      console.log('Provider My Jobs providerId:', auth.providerId);

      const [reqResult, quoteResult, jobsResult] = await Promise.allSettled([
        getProviderRequests(auth.providerId),
        getProviderQuotations(auth.providerId),
        getProviderJobs(auth.providerId),
      ]);

      if (reqResult.status === 'fulfilled') {
        const rawRequests = reqResult.value.requests || [];
        const providerRequests = filterForLoggedProvider(rawRequests, auth.providerId);

        console.log('RAW PROVIDER REQUESTS:', rawRequests.length);
        console.log('FILTERED PROVIDER REQUESTS:', providerRequests.length);

        setRequests(providerRequests);
      } else {
        console.log('Provider requests failed:', reqResult.reason?.message);
        setRequests([]);
      }

      if (quoteResult.status === 'fulfilled') {
        const rawQuotations = quoteResult.value.quotations || [];
        const providerQuotations = filterForLoggedProvider(rawQuotations, auth.providerId);

        console.log('RAW PROVIDER QUOTATIONS:', rawQuotations.length);
        console.log('FILTERED PROVIDER QUOTATIONS:', providerQuotations.length);

        setQuotations(providerQuotations);
      } else {
        console.log('Provider quotations failed:', quoteResult.reason?.message);
        setQuotations([]);
      }

      if (jobsResult.status === 'fulfilled') {
        const rawJobs = jobsResult.value.jobs || [];
        const providerJobs = filterForLoggedProvider(rawJobs, auth.providerId);

        console.log('RAW PROVIDER JOBS:', rawJobs.length);
        console.log('FILTERED PROVIDER JOBS:', providerJobs.length);

        setJobs(providerJobs);
      } else {
        console.log('Provider jobs failed:', jobsResult.reason?.message);
        setJobs([]);
      }

      if (reqResult.status === 'rejected' && quoteResult.status === 'rejected' && jobsResult.status === 'rejected') {
        setBackendWarning('No provider flow data loaded yet. Check backend routes only if requests, quotes or bookings should already exist.');
      }
    } catch (err) {
      console.log('Provider My Jobs load error:', err);
      setError(err.message || 'Failed to load provider flow.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAll();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
  };

  const openJob = (booking) => navigation.navigate('IT22129376ProviderJobDetails', { booking, bookingId: getBookingId(booking) });
  const openRequest = (request) => navigation.navigate('IT22129376ProviderRequestDetails', { request, providerId });
  const openQuoteForm = (request) => navigation.navigate('IT22129376ProviderQuotationForm', { request, providerId });

  const renderTimeline = () => {
    const hours = Array.from({ length: 14 }, (_, i) => i + 7);
    return (
      <View style={[styles.timelineCard, isDark && styles.cardDark]}>
        <View style={styles.timelineHeader}>
          <View>
            <Text style={[styles.sectionTitle, isDark && styles.textDark]}>Today’s Calendar</Text>
            <Text style={[styles.sectionSub, isDark && styles.textMutedDark]}>{formatFullDate(new Date())}</Text>
          </View>
          <Badge label={`${todayJobs.length} jobs`} bg={COLORS.primarySoft} color={COLORS.primary} />
        </View>
        {todayJobs.length === 0 ? (
          <EmptyState isDark={isDark} icon="calendar-clear-outline" title="No jobs today" message="Confirmed seeker bookings scheduled for today will appear here." />
        ) : (
          <View style={styles.timelineBody}>
            <View style={styles.timeColumn}>
              {hours.map((h) => <View key={h} style={styles.timeSlot}><Text style={styles.timeLabel}>{h > 12 ? h - 12 : h}:00 {h >= 12 ? 'PM' : 'AM'}</Text></View>)}
            </View>
            <View style={styles.scheduleColumn}>
              {hours.map((h) => <View key={h} style={styles.scheduleLine} />)}
              {todayJobs.map((job) => {
                const status = getStatusStyle(getStatus(job));
                return (
                  <TouchableOpacity
                    key={getBookingId(job)}
                    style={[styles.timelineJob, { top: getTimelineTop(getBookingStart(job)), height: getTimelineHeight(getBookingStart(job), getBookingEnd(job)), borderLeftColor: status.color }]}
                    onPress={() => openJob(job)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.timelineJobTitle} numberOfLines={1}>{getServiceTitle(job)}</Text>
                    <Text style={styles.timelineJobTime}>{formatTime(getBookingStart(job))} - {formatTime(getBookingEnd(job))}</Text>
                    <Text style={styles.timelineJobCustomer} numberOfLines={1}>{getSeekerName(job)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderContent = () => {
    if (loading) {
      return <View style={[styles.stateCard, isDark && styles.cardDark]}><ActivityIndicator size="large" color={COLORS.primary} /><Text style={[styles.stateTitle, isDark && styles.textDark]}>Loading provider flow...</Text></View>;
    }
    if (error) {
      return <View style={[styles.stateCard, isDark && styles.cardDark]}><Ionicons name="warning-outline" size={34} color={COLORS.danger} /><Text style={[styles.stateTitle, isDark && styles.textDark]}>Real Data Not Loaded</Text><Text style={styles.stateMsg}>{error}</Text>{providerId ? <Text style={styles.debugText}>providerId: {providerId}</Text> : null}<TouchableOpacity style={styles.primaryButton} onPress={onRefresh}><Text style={styles.primaryButtonText}>Try Again</Text></TouchableOpacity></View>;
    }

    const warningBlock = backendWarning ? <View style={[styles.warningCard, isDark && styles.warningCardDark]}><Ionicons name="information-circle-outline" size={20} color="#F59E0B" /><Text style={[styles.warningText, isDark && styles.textMutedDark]}>{backendWarning}</Text></View> : null;

    if (activeTab === 'Today') {
      return <>{warningBlock}{renderTimeline()}{todayJobs.map((job) => <BookingCard key={getBookingId(job)} booking={job} onPress={() => openJob(job)} isDark={isDark} />)}</>;
    }
    if (activeTab === 'Requests') {
      return <>{warningBlock}{normalizedRequests.length === 0 ? <EmptyState isDark={isDark} icon="mail-open-outline" title="No incoming requests" message="Requests assigned to this provider will appear here before quotation submission." /> : normalizedRequests.map((r) => <RequestCard key={getRequestId(r)} request={r} isDark={isDark} onPress={() => openRequest(r)} onQuote={() => openQuoteForm(r)} />)}</>;
    }
    if (activeTab === 'Quotes') {
      return <>{warningBlock}{normalizedQuotes.length === 0 ? <EmptyState isDark={isDark} icon="receipt-outline" title="No quotations sent" message="After submitting a quotation, its seeker decision and coordination status will appear here." /> : normalizedQuotes.map((q) => <QuoteCard key={getQuotationId(q)} quotation={q} isDark={isDark} onPress={() => Alert.alert('Quotation', `Status: ${q.status || 'SENT'}\nPrice: LKR ${q.price || '-'}`)} />)}</>;
    }
    if (activeTab === 'Scheduled') {
      return <>{warningBlock}{scheduledJobs.length === 0 ? <EmptyState isDark={isDark} icon="briefcase-outline" title="No scheduled jobs" message="Bookings appear here only after the seeker confirms a coordinated quotation." /> : scheduledJobs.map((job) => <BookingCard key={getBookingId(job)} booking={job} onPress={() => openJob(job)} isDark={isDark} />)}</>;
    }
    return <>{warningBlock}{historyJobs.length === 0 ? <EmptyState isDark={isDark} icon="checkmark-done-outline" title="No history yet" message="Completed or cancelled jobs will appear here." /> : historyJobs.map((job) => <BookingCard key={getBookingId(job)} booking={job} onPress={() => openJob(job)} isDark={isDark} />)}</>;
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDark && styles.safeAreaDark]}>
      <StatusBar barStyle="light-content" backgroundColor={isDark ? COLORS.darkBg : COLORS.primary} />
      <LinearGradient colors={isDark ? ['#0F1121', '#16213E'] : ['#5B6EF5', '#8B5CF6']} style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>My Jobs</Text>
            <Text style={styles.headerSubtitle}>Requests, quotations and scheduled bookings</Text>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}><Ionicons name="refresh" size={21} color="#fff" /></TouchableOpacity>
        </View>
        <View style={styles.statsRow}>
          <StatCard isDark={isDark} icon="mail-outline" value={normalizedRequests.length} label="Requests" color={COLORS.primary} bg={COLORS.primarySoft} />
          <StatCard isDark={isDark} icon="receipt-outline" value={normalizedQuotes.length} label="Quotes" color={COLORS.info} bg={COLORS.infoSoft} />
          <StatCard isDark={isDark} icon="briefcase-outline" value={scheduledJobs.length} label="Jobs" color={COLORS.success} bg={COLORS.successSoft} />
        </View>
      </LinearGradient>
      <View style={[styles.tabBar, isDark && styles.tabBarDark]}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return <TouchableOpacity key={tab} style={[styles.tab, active && styles.tabActive]} onPress={() => setActiveTab(tab)}><Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text></TouchableOpacity>;
        })}
      </View>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} showsVerticalScrollIndicator={false}>
        {renderContent()}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.bg },
  safeAreaDark: { backgroundColor: COLORS.darkBg },
  header: { paddingHorizontal: 20, paddingTop: Platform.OS === 'android' ? 22 : 16, paddingBottom: 26, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 31, fontWeight: '900', letterSpacing: -0.8 },
  headerSubtitle: { color: 'rgba(255,255,255,0.82)', fontSize: 13, marginTop: 4, fontWeight: '600' },
  refreshButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', marginTop: 20, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 18, padding: 12, alignItems: 'center' },
  statCardDark: { backgroundColor: COLORS.darkCard },
  statIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 22, fontWeight: '900', color: COLORS.text },
  statLabel: { color: COLORS.muted, fontSize: 11, fontWeight: '800', marginTop: 2 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 12, marginTop: -18, padding: 5, borderRadius: 18, elevation: 5, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12 },
  tabBarDark: { backgroundColor: COLORS.darkCard },
  tab: { flex: 1, height: 36, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  tabActive: { backgroundColor: COLORS.primary },
  tabText: { fontSize: 11, fontWeight: '900', color: COLORS.muted },
  tabTextActive: { color: '#fff' },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 18 },
  contentContainer: { paddingBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 22, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardTitle: { flex: 1, color: COLORS.text, fontSize: 16, fontWeight: '900' },
  cardSub: { color: COLORS.muted, fontSize: 12, marginTop: 3, fontWeight: '700' },
  priceText: { color: COLORS.primary, fontSize: 17, fontWeight: '900' },
  infoBlock: { backgroundColor: '#F9FAFB', borderRadius: 16, padding: 12, marginTop: 12, gap: 6 },
  infoLine: { color: COLORS.text, fontSize: 12, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  primaryButton: { backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryButtonText: { color: '#fff', fontSize: 13, fontWeight: '900' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  secondaryButtonText: { color: COLORS.text, fontSize: 13, fontWeight: '900' },
  timelineCard: { backgroundColor: '#fff', borderRadius: 22, padding: 16, marginBottom: 18, borderWidth: 1, borderColor: COLORS.border },
  timelineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 17, color: COLORS.text, fontWeight: '900' },
  sectionSub: { color: COLORS.muted, fontSize: 12, marginTop: 3, fontWeight: '600' },
  timelineBody: { flexDirection: 'row', minHeight: 1008 },
  timeColumn: { width: 58 },
  timeSlot: { height: 72 },
  timeLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800' },
  scheduleColumn: { flex: 1, position: 'relative' },
  scheduleLine: { height: 72, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  timelineJob: { position: 'absolute', left: 4, right: 0, backgroundColor: '#F8FAFF', borderRadius: 14, borderLeftWidth: 4, padding: 10, borderWidth: 1, borderColor: '#E0E7FF' },
  timelineJobTitle: { color: COLORS.text, fontWeight: '900', fontSize: 13 },
  timelineJobTime: { color: COLORS.primary, fontSize: 11, fontWeight: '800', marginTop: 4 },
  timelineJobCustomer: { color: COLORS.muted, fontSize: 11, fontWeight: '700', marginTop: 3 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 22, padding: 24, marginBottom: 16, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  emptyIconBox: { width: 58, height: 58, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  emptyMessage: { color: COLORS.muted, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 6, lineHeight: 18 },
  stateCard: { backgroundColor: '#fff', borderRadius: 22, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
  stateTitle: { marginTop: 12, color: COLORS.text, fontWeight: '900', fontSize: 17, textAlign: 'center' },
  stateMsg: { color: COLORS.muted, textAlign: 'center', marginTop: 8, lineHeight: 19 },
  debugText: { color: COLORS.muted, fontSize: 11, marginTop: 10 },
  warningCard: { backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 18, padding: 12, marginBottom: 14, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  warningCardDark: { backgroundColor: '#2A2112', borderColor: '#92400E' },
  warningText: { flex: 1, color: '#92400E', fontSize: 12, fontWeight: '700', lineHeight: 17 },
  textDark: { color: COLORS.darkText },
  textMutedDark: { color: COLORS.darkMuted },
});
