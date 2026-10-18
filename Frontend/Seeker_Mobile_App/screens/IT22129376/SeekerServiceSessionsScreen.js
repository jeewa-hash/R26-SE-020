import { fetchSeekerWithTimeout as fetch } from '../../utils/seekerHttp';
import { buildSeekerSessions, seekerSessionGuidance } from '../../utils/seekerSessions';
import PageHeader from '../../components/PageHeader';
import React, { useCallback, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../hooks/useTheme';
import { COLORS, toneColors } from './theme';

import { getStoredSeekerAuth, buildAuthHeaders } from './services/seekerAuthStorage';
import {
  getSeekerRequestQuotations,
  getProviderQuotationsForSeeker,
  getSeekerBookings,
} from './services/seekerSessionApi';

import { CONFIG } from '../../config';

const SEEKER_SERVICE_URL = CONFIG.SEEKER_SERVICE_URL;

const TABS = ['All', 'Active', 'Scheduled', 'Ongoing', 'History'];

const normalizeList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.sessions)) return data.sessions;
  if (Array.isArray(data?.serviceSessions)) return data.serviceSessions;
  if (Array.isArray(data?.requests)) return data.requests;
  if (Array.isArray(data?.requestQuotations)) return data.requestQuotations;
  if (Array.isArray(data?.quotations)) return data.quotations;
  if (Array.isArray(data?.bookings)) return data.bookings;
  return [];
};

const parseResponse = async (response) => {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch (error) {
    data = {
      success: false,
      message: text || 'Invalid server response',
    };
  }

  if (!response.ok) {
    const err = new Error(data?.message || data?.error || `Request failed with ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};







const getTitle = (session) => {
  return (
    session?.title ||
    session?.detectedObject ||
    session?.serviceSubcategory ||
    session?.subcategory ||
    session?.briefDescription ||
    session?.description ||
    'Service Request'
  );
};

const getCategory = (session) => {
  return (
    session?.detectedCategory ||
    session?.serviceCategory ||
    session?.category ||
    'General'
  );
};

const getSubcategory = (session) => {
  return (
    session?.detectedObject ||
    session?.serviceSubcategory ||
    session?.subcategory ||
    session?.object ||
    'Service'
  );
};

const getLocation = (session) => {
  const location = session?.serviceLocation || session?.location || session?.district;

  if (typeof location === 'string') return location;
  if (location?.address) return location.address;

  return 'Location not available';
};

const getPreferredTime = (session) => {
  return (
    session?.preferredTimeLabel ||
    session?.preferredStartTime ||
    session?.proposedStartTime ||
    session?.scheduledStartTime ||
    ''
  );
};

const formatDateTime = (value) => {
  if (!value) return 'Flexible time';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatCreatedDate = (value) => {
  if (!value) return 'Recently';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Recently';
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};


const fetchServiceSessions = async (seekerId) => {
  if (!seekerId) return [];

  const headers = await buildAuthHeaders();

  const response = await fetch(`${SEEKER_SERVICE_URL}/service-sessions/seeker/${seekerId}`, { headers });
  return normalizeList(await parseResponse(response));
};

const buildGroupedSessions = buildSeekerSessions;
const getSessionStatusMeta = session => {
  const guidance = seekerSessionGuidance(session);
  return { ...guidance, tone: guidance.group === 'closed' ? toneColors.neutral : guidance.group === 'attention' ? toneColors.warning : toneColors.info, icon: guidance.target === 'booking' ? 'calendar-outline' : 'document-text-outline' };
};

function ServiceSessionsHeader({ isDarkMode, onBack }) {
  return (
    <PageHeader title={<>My Service Sessions</>} onBack={onBack} />
  );
}

function SessionTabBar({ activeTab, onTabChange, counts, isDarkMode }) {
  return (
    <View style={[styles.tabWrapper, isDarkMode && styles.tabWrapperDark]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContent}>
        {TABS.map(tab => {
          const selected = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${tab} sessions, ${counts[tab] || 0}`}
              onPress={() => onTabChange(tab)}
              style={[styles.tab, isDarkMode && styles.tabDark, selected && styles.tabActive, selected && isDarkMode && styles.tabActiveDark]}
            >
              <Text style={[styles.tabText, isDarkMode && styles.textMutedDark, selected && styles.tabTextActive]}>{tab}</Text>
              <View style={[styles.countPill, isDarkMode && styles.countPillDark, selected && styles.countPillActive]}>
                <Text style={[styles.countText, isDarkMode && styles.textMutedDark, selected && styles.countTextActive]}>{counts[tab] || 0}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EmptySessionState({ title, message, icon, isDarkMode, onRefresh, onStart }) {
  return (
    <View style={[styles.stateCard, isDarkMode && styles.stateCardDark]}>
      <View style={styles.emptyIconBox}>
        <MaterialIcons name={icon} size={32} color={COLORS.primary} />
      </View>

      <Text style={[styles.stateTitle, isDarkMode && styles.textDark]}>
        {title}
      </Text>

      <Text style={[styles.stateMessage, isDarkMode && styles.textMutedDark]}>
        {message}
      </Text>

      <TouchableOpacity style={styles.retryButton} onPress={onStart || onRefresh} activeOpacity={0.85}>
        <Ionicons name={onStart ? "search" : "refresh"} size={18} color="#fff" />
        <Text style={styles.retryButtonText}>{onStart ? 'Find a Service' : 'Refresh'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function ServiceSessionCard({ session, isDarkMode, onPress }) {
  const meta = getSessionStatusMeta(session);
  const providerCount = session?.requestedProvidersCount || session?.requests?.length || 0;
  const quoteCount = session?.quoteCount || session?.quotations?.length || 0;
  const preferredTime = session.booking?.scheduledStartTime || getPreferredTime(session);

  return (
    <TouchableOpacity
      style={[styles.sessionCard, isDarkMode && styles.sessionCardDark]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.cardTopRow}>
        <View style={styles.titleBlock}>
          <Text style={[styles.cardTitle, isDarkMode && styles.textDark]} numberOfLines={2}>
            {getTitle(session)}
          </Text>

          <Text style={[styles.cardSubtitle, isDarkMode && styles.textMutedDark]}>
            Next: {meta.owner}
          </Text>
        </View>

        <View style={[styles.statusPill, { backgroundColor: meta.tone.bg }]}>
          <Ionicons name={meta.icon} size={14} color={meta.tone.icon} />
          <Text style={[styles.statusText, { color: meta.tone.text }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      <Text style={[styles.statusMessage, isDarkMode && styles.textMutedDark]}>
        {meta.message}
      </Text>
      <View style={styles.progressRow}>{['Requested', 'Quoted', 'Booked', 'Completed'].map((label, index) => <View key={label} style={{ flex: 1 }}>
        <View style={[styles.progressTrack, index <= meta.step && { backgroundColor: COLORS.primary }]} />
        <Text style={[styles.progressLabel, isDarkMode && styles.textMutedDark]}>{label}</Text>
      </View>)}</View>

      <View style={styles.chipRow}>
        <View style={[styles.chip, isDarkMode && styles.chipDark]}>
          <Text style={styles.chipText}>{getCategory(session)}</Text>
        </View>

        <View style={[styles.chip, isDarkMode && styles.chipDark]}>
          <Text style={styles.chipText}>{getSubcategory(session)}</Text>
        </View>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="location-outline" size={17} color={COLORS.primary} />
        <Text style={[styles.infoText, isDarkMode && styles.textMutedDark]} numberOfLines={1}>
          {getLocation(session)}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={17} color={COLORS.primary} />
        <Text style={[styles.infoText, isDarkMode && styles.textMutedDark]} numberOfLines={1}>
          {formatDateTime(preferredTime)}
        </Text>
      </View>

      <View style={styles.metricsRow}>
        <View style={[styles.metricBox, isDarkMode && styles.metricBoxDark]}>
          <Text style={styles.metricNumber}>{providerCount}</Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.textMutedDark]}>
            Requests Sent
          </Text>
        </View>

        <View style={[styles.metricBox, isDarkMode && styles.metricBoxDark]}>
          <Text style={styles.metricNumber}>{quoteCount}</Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.textMutedDark]}>
            Quotes
          </Text>
        </View>

        <View style={[styles.metricBox, isDarkMode && styles.metricBoxDark]}>
          <Text style={styles.metricNumber}>
            {session?.bookingCount || session?.bookings?.length || (session?.booking ? 1 : 0)}
          </Text>
          <Text style={[styles.metricLabel, isDarkMode && styles.textMutedDark]}>
            Booking
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={[styles.createdText, isDarkMode && styles.textMutedDark]}>
          Created {formatCreatedDate(session.createdAt || session.created_at)}
        </Text>

        <View style={styles.openButton}>
          <Text style={styles.openButtonText}>{meta.action}</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SeekerServiceSessionsScreen({ navigation, embedded = false }) {
  const { isDarkMode } = useTheme();

  const [activeTab, setActiveTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [seekerId, setSeekerId] = useState(null);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const sourceCache = useRef({ serviceSessions: [], requests: [], quotations: [], bookings: [] });
  const loadingRef = useRef(false);
  const cacheOwner = useRef(null);

  const counts = useMemo(() => {
    const result = {
      All: sessions.length,
      Active: 0,
      Scheduled: 0,
      Ongoing: 0,
      History: 0,
    };

    sessions.forEach((session) => {
      const meta = getSessionStatusMeta(session);
      result[meta.tab] += 1;
    });

    return result;
  }, [sessions]);

  const filteredSessions = useMemo(() => {
    return sessions.filter((session) => {
      const meta = getSessionStatusMeta(session);
      return activeTab === 'All' || meta.tab === activeTab;
    });
  }, [sessions, activeTab]);

  const loadSessions = async () => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setError(null);

      const auth = await getStoredSeekerAuth();

      if (!auth?.isLoggedIn || !auth?.seekerId) {
        setSeekerId(null);
        setSessions([]);
        setError('Please login again. Seeker details were not found.');
        return;
      }

      if (cacheOwner.current !== auth.seekerId) {
        cacheOwner.current = auth.seekerId;
        sourceCache.current = { serviceSessions: [], requests: [], quotations: [], bookings: [] };
        setSessions([]);
      }
      setSeekerId(auth.seekerId);

      const [serviceSessionsResult, requestsResult, quotationsResult, bookingsResult] =
        await Promise.allSettled([
          fetchServiceSessions(auth.seekerId),
          getSeekerRequestQuotations(auth.seekerId),
          getProviderQuotationsForSeeker(),
          getSeekerBookings(auth.seekerId),
        ]);

      const results = [serviceSessionsResult, requestsResult, quotationsResult, bookingsResult];
      const keys = ['serviceSessions', 'requests', 'quotations', 'bookings'];
      let failures = 0;
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value?.raw !== null) {
          sourceCache.current[keys[index]] = index === 0 ? result.value : result.value[keys[index]] || [];
        } else failures++;
      });
      setSessions(buildGroupedSessions(sourceCache.current));
      if (!failures) setLastChecked(new Date());
      if (failures) setError('Some updates could not be loaded. Showing the latest available information. Pull down to retry.');

    } catch (err) {
      setError(err?.message || 'Failed to load service sessions.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSessions();
      const timer = setInterval(loadSessions, 30000);
      return () => clearInterval(timer);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSessions();
  };

  const renderLoading = () => {
    return (
      <View style={[styles.stateCard, isDarkMode && styles.stateCardDark]}>
        <ActivityIndicator size="large" color={COLORS.primary} />

        <Text style={[styles.stateTitle, isDarkMode && styles.textDark]}>
          Loading Sessions...
        </Text>

        <Text style={[styles.stateMessage, isDarkMode && styles.textMutedDark]}>
          Checking your requests, quotations and bookings.
        </Text>
      </View>
    );
  };

  const renderError = () => {
    return (
      <View style={[styles.stateCard, isDarkMode && styles.stateCardDark]}>
        <View style={styles.errorIconBox}>
          <Ionicons name="warning-outline" size={32} color="#EF4444" />
        </View>

        <Text style={[styles.stateTitle, isDarkMode && styles.textDark]}>
          Sessions Not Loaded
        </Text>

        <Text style={[styles.stateMessage, isDarkMode && styles.textMutedDark]}>
          {error}
        </Text>


        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRefresh}
          activeOpacity={0.85}
        >
          <Ionicons name="refresh" size={18} color="#fff" />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderSessions = () => {
    if (loading) return renderLoading();

    if (error && !sessions.length) return renderError();

    if (!filteredSessions.length) {
      return (
        <EmptySessionState
          title={activeTab === 'All' ? 'No service sessions yet' : `No ${activeTab.toLowerCase()} sessions`}
          message="Your service sessions will appear here after you request quotations from providers."
          icon="assignment"
          isDarkMode={isDarkMode}
          onRefresh={onRefresh}
          onStart={!sessions.length ? () => navigation.navigate('FindService') : undefined}
        />
      );
    }

    return (
      <View>
        {filteredSessions.map((session) => (
          <ServiceSessionCard
            key={session.sessionId}
            session={session}
            isDarkMode={isDarkMode}
            onPress={() =>
              session.guidance.target === 'providers' ? navigation.navigate('FindService') : navigation.navigate('SeekerServiceSessionDetails', {
                session,
                sessionId: session.sessionId,
              })
            }
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
      edges={embedded ? [] : ['top']}
    >
      {!embedded && <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? COLORS.darkBg : COLORS.primary}
      />

      <ServiceSessionsHeader
        onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SeekerServices')}
        isDarkMode={isDarkMode}
      />

      </>}

      {lastChecked && <Text style={[styles.updatedText, isDarkMode && styles.textMutedDark]}>Updated {lastChecked.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Pull down to refresh</Text>}
      {error && sessions.length > 0 ? <Text accessibilityRole="alert" style={[styles.updatedText, isDarkMode && styles.textMutedDark]}>{error}</Text> : null}
      <SessionTabBar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        counts={counts}
        isDarkMode={isDarkMode}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderSessions()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  updatedText: { color: COLORS.muted, paddingHorizontal: 18, paddingTop: 10, fontSize: 12 },
  progressRow: { flexDirection: 'row', gap: 7, marginTop: 12 },
  progressTrack: { height: 4, borderRadius: 4, backgroundColor: '#DDE1EA', marginBottom: 6 },
  progressLabel: { fontSize: 10, color: COLORS.muted },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  containerDark: {
    backgroundColor: COLORS.darkBg,
  },
  header: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    maxWidth: 275,
    lineHeight: 18,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabWrapper: {
    backgroundColor: COLORS.bg,
    paddingVertical: 14,
  },
  tabWrapperDark: {
    backgroundColor: COLORS.darkBg,
  },
  tabContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  tabDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
  },
  tabActiveDark: { backgroundColor: '#252e58', borderColor: COLORS.primary },
  countPillDark: { backgroundColor: COLORS.darkBorder },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextDark: {
    color: COLORS.darkMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  countPillActive: {
    backgroundColor: COLORS.primary,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  countTextActive: {
    color: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },
  sessionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionCardDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  titleBlock: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 24,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusMessage: {
    marginTop: 10,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  chip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipDark: {
    backgroundColor: '#ffffff10',
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 11,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  metricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  metricBoxDark: {
    backgroundColor: '#ffffff08',
    borderColor: COLORS.darkBorder,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.primary,
  },
  metricLabel: {
    marginTop: 3,
    fontSize: 11,
    color: COLORS.muted,
    textAlign: 'center',
  },
  cardFooter: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  createdText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  openButton: {
    height: 34,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stateCardDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
  },
  stateTitle: {
    marginTop: 14,
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  stateMessage: {
    marginTop: 8,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyIconBox: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconBox: {
    width: 58,
    height: 58,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugText: {
    marginTop: 10,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    height: 42,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  textDark: {
    color: COLORS.darkText,
  },
  textMutedDark: {
    color: COLORS.darkMuted,
  },
});
