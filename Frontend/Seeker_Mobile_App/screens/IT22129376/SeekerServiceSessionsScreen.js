import React, { useCallback, useMemo, useState } from 'react';
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
} from './services/myJobsApi';

import { CONFIG } from '../../config';

const SEEKER_SERVICE_URL = CONFIG.SEEKER_SERVICE_URL;

const TABS = ['Active', 'Scheduled', 'Ongoing', 'History'];

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

const getIdText = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value._id || value.id || value.$oid || '';
  }
  return String(value);
};

const getSessionId = (item) => {
  return (
    item?.sessionId ||
    item?.externalSessionId ||
    item?.serviceSessionId ||
    item?.session?._id ||
    item?.session?.id ||
    item?.serviceSession?._id ||
    item?._id ||
    item?.id ||
    ''
  ).toString();
};

const getRequestId = (request) => {
  return (
    request?._id ||
    request?.id ||
    request?.requestQuotationId ||
    request?.externalRequestQuotationId ||
    ''
  ).toString();
};

const getQuotationRequestId = (quotation) => {
  return (
    quotation?.externalRequestQuotationId ||
    quotation?.requestQuotationId ||
    quotation?.providerRequestId ||
    quotation?.requestId ||
    ''
  ).toString();
};

const getQuotationId = (quotation) => {
  return (
    quotation?._id ||
    quotation?.id ||
    quotation?.quotationId ||
    quotation?.externalQuotationId ||
    ''
  ).toString();
};

const getBookingStatus = (booking) => {
  return String(booking?.bookingStatus || booking?.status || '').toUpperCase();
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

const normalizeQuote = (quotation, requests = []) => {
  const requestId = getQuotationRequestId(quotation);

  const relatedRequest = requests.find((request) => getRequestId(request) === requestId);

  const quoteId = getQuotationId(quotation);

  const price =
    quotation?.price ||
    quotation?.quotedPrice ||
    quotation?.finalAmount ||
    quotation?.amount ||
    0;

  return {
    ...quotation,
    id: quoteId,
    _id: quoteId,
    externalQuotationId: quoteId,
    externalRequestQuotationId: requestId,
    externalSessionId: quotation?.externalSessionId || relatedRequest?.sessionId || getSessionId(quotation),
    request: relatedRequest || null,
    title:
      quotation?.serviceSubcategory ||
      quotation?.subcategory ||
      relatedRequest?.detectedObject ||
      relatedRequest?.serviceSubcategory ||
      'Provider Quote',
    category:
      quotation?.serviceCategory ||
      relatedRequest?.detectedCategory ||
      relatedRequest?.serviceCategory ||
      'General',
    subcategory:
      quotation?.serviceSubcategory ||
      relatedRequest?.detectedObject ||
      relatedRequest?.serviceSubcategory ||
      'Service',
    quotedPrice: price,
    price,
    providerName:
      quotation?.providerSnapshot?.businessName ||
      quotation?.providerSnapshot?.name ||
      quotation?.provider?.businessName ||
      quotation?.provider?.name ||
      quotation?.providerName ||
      quotation?.businessName ||
      'Provider',
    note: quotation?.notes || quotation?.note || 'Provider quotation received.',
    status: quotation?.status || 'SENT',
    coordinationDecision:
      quotation?.coordinationStatus ||
      quotation?.coordinationDecision ||
      'NOT_CHECKED',
    proposedStartTime: quotation?.proposedStartTime || quotation?.coordinatedStartTime,
    estimatedDurationHours: quotation?.estimatedDurationHours || quotation?.durationHours,
    serviceLocation:
      relatedRequest?.serviceLocation ||
      quotation?.serviceLocation ||
      '',
    preferredTimeLabel: relatedRequest?.preferredTimeLabel || '',
  };
};

const fetchServiceSessions = async (seekerId) => {
  if (!seekerId) return [];

  const headers = await buildAuthHeaders();

  const possibleUrls = [
    `${SEEKER_SERVICE_URL}/service-sessions/seeker/${seekerId}`,
    `${SEEKER_SERVICE_URL}/service-sessions/my`,
    `${SEEKER_SERVICE_URL}/service-sessions`,
    `${SEEKER_SERVICE_URL}/sessions/seeker/${seekerId}`,
  ];

  for (const url of possibleUrls) {
    try {
      console.log('Trying service sessions URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      const data = await parseResponse(response);
      const sessions = normalizeList(data);

      console.log('Service sessions loaded from:', url, sessions.length);

      return sessions;
    } catch (error) {
      console.log('Service sessions URL failed:', url, error.message);
    }
  }

  return [];
};

const findBookingForSession = (sessionId, bookings = []) => {
  return bookings.find((booking) => {
    const bookingSessionId = getSessionId(booking);

    return String(bookingSessionId) === String(sessionId);
  });
};

const buildGroupedSessions = ({ serviceSessions = [], requests = [], quotations = [], bookings = [] }) => {
  const map = new Map();

  serviceSessions.forEach((session) => {
    const sessionId = getSessionId(session);

    if (!sessionId) return;

    map.set(sessionId, {
      ...session,
      sessionId,
      requests: [],
      quotations: [],
      booking: null,
      bookings: [],
      createdAt: session?.createdAt || session?.created_at || new Date().toISOString(),
    });
  });

  requests.forEach((request) => {
    const sessionId = getSessionId(request) || getRequestId(request);

    if (!sessionId) return;

    const existing = map.get(sessionId) || {
      sessionId,
      requests: [],
      quotations: [],
      booking: null,
      bookings: [],
      createdAt: request?.createdAt || request?.created_at || new Date().toISOString(),
    };

    existing.requests.push(request);

    existing.title = existing.title || request?.title || request?.detectedObject || request?.briefDescription;
    existing.detectedCategory = existing.detectedCategory || request?.detectedCategory || request?.serviceCategory;
    existing.detectedObject = existing.detectedObject || request?.detectedObject || request?.serviceSubcategory;
    existing.serviceCategory = existing.serviceCategory || request?.serviceCategory;
    existing.serviceSubcategory = existing.serviceSubcategory || request?.serviceSubcategory;
    existing.briefDescription = existing.briefDescription || request?.briefDescription || request?.description;
    existing.serviceLocation = existing.serviceLocation || request?.serviceLocation;
    existing.location = existing.location || request?.location;
    existing.preferredStartTime = existing.preferredStartTime || request?.preferredStartTime;
    existing.preferredTimeLabel = existing.preferredTimeLabel || request?.preferredTimeLabel;
    existing.status = existing.status || request?.status || 'REQUEST_SENT';
    existing.createdAt = existing.createdAt || request?.createdAt || request?.created_at;

    map.set(sessionId, existing);
  });

  quotations.forEach((quotation) => {
    const sessionId = getSessionId(quotation);
    const requestId = getQuotationRequestId(quotation);

    const relatedRequest = requests.find((request) => getRequestId(request) === requestId);

    const finalSessionId = sessionId || relatedRequest?.sessionId || requestId;

    if (!finalSessionId) return;

    const existing = map.get(finalSessionId) || {
      sessionId: finalSessionId,
      requests: relatedRequest ? [relatedRequest] : [],
      quotations: [],
      booking: null,
      bookings: [],
      createdAt: quotation?.createdAt || quotation?.created_at || new Date().toISOString(),
    };

    const normalizedQuote = normalizeQuote(quotation, requests);

    existing.quotations.push(normalizedQuote);

    existing.title = existing.title || relatedRequest?.detectedObject || normalizedQuote.title;
    existing.detectedCategory = existing.detectedCategory || relatedRequest?.detectedCategory || normalizedQuote.category;
    existing.detectedObject = existing.detectedObject || relatedRequest?.detectedObject || normalizedQuote.subcategory;
    existing.serviceCategory = existing.serviceCategory || normalizedQuote.category;
    existing.serviceSubcategory = existing.serviceSubcategory || normalizedQuote.subcategory;
    existing.serviceLocation = existing.serviceLocation || relatedRequest?.serviceLocation || normalizedQuote.serviceLocation;
    existing.preferredStartTime = existing.preferredStartTime || relatedRequest?.preferredStartTime || normalizedQuote.proposedStartTime;
    existing.preferredTimeLabel = existing.preferredTimeLabel || relatedRequest?.preferredTimeLabel || normalizedQuote.preferredTimeLabel;
    existing.status = existing.status || 'QUOTES_RECEIVED';

    map.set(finalSessionId, existing);
  });

  bookings.forEach((booking) => {
    const sessionId = getSessionId(booking);

    if (!sessionId) return;

    const existing = map.get(sessionId) || {
      sessionId,
      requests: [],
      quotations: [],
      booking: null,
      bookings: [],
      createdAt: booking?.createdAt || booking?.created_at || new Date().toISOString(),
    };

    existing.bookings = Array.isArray(existing.bookings) ? existing.bookings : [];
    existing.bookings.push(booking);
    existing.booking = existing.booking || booking;
    existing.bookingStatus = booking?.bookingStatus || booking?.status;
    existing.title = existing.title || booking?.serviceSubcategory || booking?.serviceCategory || 'Booked Service';
    existing.detectedCategory = existing.detectedCategory || booking?.serviceCategory;
    existing.detectedObject = existing.detectedObject || booking?.serviceSubcategory;
    existing.serviceLocation = existing.serviceLocation || booking?.serviceLocation || booking?.location;
    existing.preferredStartTime = existing.preferredStartTime || booking?.scheduledStartTime || booking?.startTime;
    existing.status = existing.status || booking?.bookingStatus || booking?.status;

    map.set(sessionId, existing);
  });

  return Array.from(map.values())
    .map((session) => {
      const sessionId = session.sessionId;
      const booking = session.booking || findBookingForSession(sessionId, bookings);
      const requestCount = session.requests?.length || 0;
      const quoteCount = session.quotations?.length || 0;

      return {
        ...session,
        booking,
        requestedProvidersCount: requestCount,
        quoteCount,
        bookingCount: session.bookings?.length || (booking ? 1 : 0),
      };
    })
    .sort((a, b) => {
      const aTime = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const bTime = new Date(b.createdAt || b.updatedAt || 0).getTime();

      return bTime - aTime;
    });
};

const getSessionStatusMeta = (session) => {
  const bookingStatus = getBookingStatus(session.booking || session);
  const rawStatus = String(session?.status || '').toUpperCase();
  const quoteCount = Number(session?.quoteCount || session?.quotations?.length || 0);
  const requestCount = Number(session?.requestedProvidersCount || session?.requests?.length || 0);

  if (bookingStatus === 'COMPLETED' || rawStatus === 'COMPLETED') {
    return {
      tab: 'History',
      label: 'Completed',
      message: 'Service completed',
      tone: toneColors.success,
      icon: 'checkmark-circle',
    };
  }

  if (['CANCELLED', 'EXPIRED'].includes(bookingStatus) || ['CANCELLED', 'EXPIRED'].includes(rawStatus)) {
    return {
      tab: 'History',
      label: bookingStatus === 'EXPIRED' ? 'Expired' : 'Cancelled',
      message: bookingStatus === 'EXPIRED' ? 'This booking expired before it was started' : 'This service session was cancelled',
      tone: toneColors.danger,
      icon: 'close-circle',
    };
  }

  if (
    bookingStatus === 'IN_PROGRESS' ||
    bookingStatus === 'ON_THE_WAY' ||
    bookingStatus === 'DELAY_REPORTED' ||
    rawStatus === 'IN_PROGRESS' ||
    rawStatus === 'ONGOING'
  ) {
    return {
      tab: 'Ongoing',
      label: bookingStatus === 'DELAY_REPORTED' ? 'Delay Reported' : bookingStatus === 'ON_THE_WAY' ? 'On the Way' : 'Ongoing',
      message: bookingStatus === 'ON_THE_WAY' ? 'Provider is travelling to your location' : 'Provider is working on this service',
      tone: toneColors.warning,
      icon: 'construct',
    };
  }

  if (
    bookingStatus === 'CONFIRMED' ||
    bookingStatus === 'RESCHEDULE_REQUESTED' ||
    bookingStatus === 'RESCHEDULING_REQUIRED' ||
    bookingStatus === 'RESCHEDULED' ||
    rawStatus === 'BOOKED' ||
    rawStatus === 'SCHEDULED' ||
    rawStatus === 'CONFIRMED'
  ) {
    return {
      tab: 'Scheduled',
      label: ['RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED'].includes(bookingStatus) ? 'Reschedule Pending' : bookingStatus === 'RESCHEDULED' ? 'Rescheduled' : 'Scheduled',
      message: ['RESCHEDULE_REQUESTED', 'RESCHEDULING_REQUIRED'].includes(bookingStatus) ? 'A new schedule is awaiting review' : 'Booking confirmed',
      tone: toneColors.info,
      icon: 'calendar',
    };
  }

  if (quoteCount > 0 || rawStatus === 'QUOTES_RECEIVED' || rawStatus === 'QUOTED') {
    return {
      tab: 'Active',
      label: 'Quotes Received',
      message: 'Tap to compare provider quotations',
      tone: toneColors.info,
      icon: 'document-text',
    };
  }

  if (requestCount > 0 || rawStatus === 'REQUESTING_QUOTES' || rawStatus === 'REQUEST_SENT') {
    return {
      tab: 'Active',
      label: 'Request Sent',
      message: 'Waiting for provider quotations',
      tone: toneColors.warning,
      icon: 'send',
    };
  }

  return {
    tab: 'Active',
    label: 'Session Created',
    message: 'Service session created',
    tone: toneColors.neutral,
    icon: 'albums',
  };
};

function ServiceSessionsHeader({ isDarkMode, activeCount, scheduledCount, ongoingCount }) {
  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a1a2e', '#16213e'] : [COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.headerTitle}>My Service Sessions</Text>
          <Text style={styles.headerSubtitle}>
            Grouped service sessions with requests, quotes and bookings
          </Text>
        </View>

        <View style={styles.iconCircle}>
          <MaterialIcons name="assignment" size={28} color="#fff" />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{scheduledCount}</Text>
          <Text style={styles.summaryLabel}>Scheduled</Text>
        </View>

        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{ongoingCount}</Text>
          <Text style={styles.summaryLabel}>Ongoing</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function SessionTabBar({ activeTab, onTabChange, counts, isDarkMode }) {
  return (
    <View style={[styles.tabWrapper, isDarkMode && styles.tabWrapperDark]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContent}
      >
        {TABS.map((tab) => {
          const active = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tab,
                active && styles.tabActive,
                isDarkMode && styles.tabDark,
              ]}
              onPress={() => onTabChange(tab)}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabText,
                  isDarkMode && styles.tabTextDark,
                  active && styles.tabTextActive,
                ]}
              >
                {tab}
              </Text>

              <View style={[styles.countPill, active && styles.countPillActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>
                  {counts[tab] || 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

function EmptySessionState({ title, message, icon, isDarkMode, onRefresh }) {
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

      <TouchableOpacity style={styles.retryButton} onPress={onRefresh} activeOpacity={0.85}>
        <Ionicons name="refresh" size={18} color="#fff" />
        <Text style={styles.retryButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );
}

function ServiceSessionCard({ session, isDarkMode, onPress }) {
  const meta = getSessionStatusMeta(session);
  const providerCount = session?.requestedProvidersCount || session?.requests?.length || 0;
  const quoteCount = session?.quoteCount || session?.quotations?.length || 0;
  const preferredTime = getPreferredTime(session);

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
            Service Session ID: {String(session.sessionId).slice(-8)}
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
          <Text style={styles.openButtonText}>View</Text>
          <Ionicons name="chevron-forward" size={16} color="#fff" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function SeekerServiceSessionsScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  const [activeTab, setActiveTab] = useState('Active');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [sessions, setSessions] = useState([]);
  const [seekerId, setSeekerId] = useState(null);
  const [error, setError] = useState(null);

  const counts = useMemo(() => {
    const result = {
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
      return meta.tab === activeTab;
    });
  }, [sessions, activeTab]);

  const loadSessions = async () => {
    try {
      setError(null);

      const auth = await getStoredSeekerAuth();

      if (!auth?.isLoggedIn || !auth?.seekerId) {
        setSeekerId(null);
        setSessions([]);
        setError('Please login again. Seeker details were not found.');
        return;
      }

      setSeekerId(auth.seekerId);

      const [serviceSessionsResult, requestsResult, quotationsResult, bookingsResult] =
        await Promise.allSettled([
          fetchServiceSessions(auth.seekerId),
          getSeekerRequestQuotations(auth.seekerId),
          getProviderQuotationsForSeeker(),
          getSeekerBookings(auth.seekerId),
        ]);

      const realServiceSessions =
        serviceSessionsResult.status === 'fulfilled'
          ? serviceSessionsResult.value || []
          : [];

      const realRequests =
        requestsResult.status === 'fulfilled'
          ? requestsResult.value.requests || []
          : [];

      const realQuotations =
        quotationsResult.status === 'fulfilled'
          ? quotationsResult.value.quotations || []
          : [];

      const realBookings =
        bookingsResult.status === 'fulfilled'
          ? bookingsResult.value.bookings || []
          : [];

      const grouped = buildGroupedSessions({
        serviceSessions: realServiceSessions,
        requests: realRequests,
        quotations: realQuotations,
        bookings: realBookings,
      });

      setSessions(grouped);

      const allEmpty =
        realServiceSessions.length === 0 &&
        realRequests.length === 0 &&
        realQuotations.length === 0 &&
        realBookings.length === 0;

      if (allEmpty) {
        setError(null);
      }
    } catch (err) {
      console.log('Load service sessions error:', err);
      setError(err?.message || 'Failed to load service sessions.');
      setSessions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadSessions();
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
          Fetching service sessions, requests, quotations and bookings from backend.
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

        {seekerId ? (
          <Text style={[styles.debugText, isDarkMode && styles.textMutedDark]}>
            Current seekerId: {seekerId}
          </Text>
        ) : null}

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

    if (error) return renderError();

    if (!filteredSessions.length) {
      return (
        <EmptySessionState
          title={`No ${activeTab.toLowerCase()} sessions`}
          message="Your service sessions will appear here after you request quotations from providers."
          icon="assignment"
          isDarkMode={isDarkMode}
          onRefresh={onRefresh}
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
              navigation.navigate('SeekerServiceSessionDetails', {
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
      edges={['top']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? COLORS.darkBg : COLORS.primary}
      />

      <ServiceSessionsHeader
        isDarkMode={isDarkMode}
        activeCount={counts.Active}
        scheduledCount={counts.Scheduled}
        ongoingCount={counts.Ongoing}
      />

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
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  containerDark: {
    backgroundColor: COLORS.darkBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    maxWidth: 275,
    lineHeight: 18,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    padding: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
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
