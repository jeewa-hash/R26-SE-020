import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  StatusBar,
  View,
  Text,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../../hooks/useTheme';

import JobsHeader from './components/JobsHeader';
import JobsTabBar from './components/JobsTabBar';

import ActiveJobsSection from './sections/ActiveJobsSection';
import QuotesSection from './sections/QuotesSection';
import ScheduledJobsSection from './sections/ScheduledJobsSection';
import JobHistorySection from './sections/JobHistorySection';

import { COLORS } from './theme';

import { getStoredSeekerAuth } from './services/seekerAuthStorage';
import {
  getSeekerRequestQuotations,
  getProviderQuotationsForSeeker,
  getSeekerBookings,
} from './services/myJobsApi';

const getRequestId = (request) => {
  return (
    request?._id ||
    request?.id ||
    request?.requestQuotationId ||
    request?.externalRequestQuotationId ||
    ''
  );
};

const getQuotationId = (quotation) => {
  return quotation?._id || quotation?.id || quotation?.externalQuotationId || '';
};

const getQuotationRequestId = (quotation) => {
  return (
    quotation?.externalRequestQuotationId ||
    quotation?.requestQuotationId ||
    quotation?.providerRequestId ||
    quotation?.requestId ||
    ''
  );
};

const getBookingStatus = (booking) => {
  return String(booking?.bookingStatus || 'CONFIRMED').toUpperCase();
};

const isCompletedOrCancelled = (booking) => {
  const status = getBookingStatus(booking);

  return (
    status.includes('COMPLETED') ||
    status.includes('CANCELLED') ||
    status.includes('REJECTED') ||
    status.includes('EXPIRED')
  );
};

const isActiveRequest = (request, bookings) => {
  if (!["pending", "quoted"].includes(String(request?.status || "pending").toLowerCase())) {
    return false;
  }
  const requestId = getRequestId(request);

  const hasBooking = bookings.some((booking) => {
    return (
      booking?.externalRequestQuotationId === requestId ||
      booking?.requestQuotationId === requestId ||
      booking?.requestId === requestId
    );
  });

  return !hasBooking;
};

const normalizeActiveJob = (request, quotations = []) => {
  const requestId = getRequestId(request);

  const relatedQuotes = quotations.filter((quotation) => {
    return getQuotationRequestId(quotation) === requestId;
  });

  return {
    ...request,
    id: requestId,
    _id: requestId,
    externalRequestQuotationId: requestId,
    title:
      request?.serviceSubcategory ||
      request?.subcategory ||
      request?.object ||
      request?.detectedObject ||
      request?.serviceCategory ||
      request?.category ||
      'Service Request',
    description:
      request?.description ||
      request?.problemDescription ||
      request?.summary ||
      request?.object ||
      'Service request created from diagnosis.',
    category:
      request?.serviceCategory ||
      request?.category ||
      request?.detectedCategory ||
      'General',
    subcategory:
      request?.serviceSubcategory ||
      request?.subcategory ||
      request?.object ||
      request?.detectedObject ||
      'Service',
    location:
      request?.serviceLocation ||
      request?.location ||
      request?.district ||
      'Location not available',
    status:
      relatedQuotes.length > 0
        ? 'Quotes Received'
        : request?.status || 'Quotation Requested',
    providerCount: relatedQuotes.length,
    quotesCount: relatedQuotes.length,
    relatedQuotes: relatedQuotes.map((quotation) => normalizeQuote(quotation, [request])),
  };
};

const normalizeQuote = (quotation, requests = []) => {
  const requestId = getQuotationRequestId(quotation);

  const relatedRequest = requests.find((request) => {
    return getRequestId(request) === requestId;
  });

  const quoteId = getQuotationId(quotation);
  const price = quotation?.price || quotation?.quotedPrice || quotation?.finalAmount || 0;

  return {
    ...quotation,
    id: quoteId,
    _id: quoteId,
    externalQuotationId: quoteId,
    externalRequestQuotationId: requestId,
    request: relatedRequest || null,
    title:
      quotation?.serviceSubcategory ||
      quotation?.serviceSubCategory ||
      quotation?.subcategory ||
      relatedRequest?.serviceSubcategory ||
      relatedRequest?.subcategory ||
      relatedRequest?.object ||
      relatedRequest?.detectedObject ||
      relatedRequest?.detectedCategory ||
      'Provider Quote',
    category:
      quotation?.serviceCategory ||
      quotation?.category ||
      relatedRequest?.serviceCategory ||
      relatedRequest?.category ||
      'General',
    quotedPrice: price,
    price,
    seekerBudget:
      relatedRequest?.seekerBudgetAmount ||
      relatedRequest?.budgetAmount ||
      relatedRequest?.budget ||
      quotation?.seekerBudget ||
      0,
    providerName:
      quotation?.providerSnapshot?.businessName ||
      quotation?.providerSnapshot?.name ||
      quotation?.provider?.businessName ||
      quotation?.provider?.name ||
      quotation?.provider?.fullName ||
      quotation?.providerName ||
      quotation?.businessName ||
      'Selected Provider',
    note: quotation?.notes || quotation?.note || 'Provider quotation received.',
    status: quotation?.status || 'SENT',
    proposedStartTime: quotation?.proposedStartTime || quotation?.coordinatedStartTime,
    estimatedDurationHours: quotation?.estimatedDurationHours || quotation?.durationHours,
    externalSessionId: quotation?.externalSessionId || relatedRequest?.sessionId,
    serviceLocation: relatedRequest?.serviceLocation || quotation?.serviceLocation || '',
    preferredTimeLabel: relatedRequest?.preferredTimeLabel || '',
    coordinationDecision: quotation?.coordinationStatus || quotation?.coordinationDecision || 'NOT_CHECKED',
  };
};

const normalizeScheduledBooking = (booking) => {
  const id = booking?._id || booking?.id || booking?.bookingId;

  return {
    ...booking,
    id,
    _id: id,
    title:
      booking?.serviceSubcategory ||
      booking?.serviceSubCategory ||
      booking?.subcategory ||
      booking?.serviceCategory ||
      'Scheduled Service',
    category:
      booking?.serviceCategory ||
      booking?.category ||
      'General',
    providerName:
      booking?.providerSnapshot?.name ||
      booking?.providerName ||
      booking?.providerId ||
      'Provider',
    location:
      booking?.serviceLocation ||
      booking?.location ||
      booking?.district ||
      'Location not available',
    scheduledStartTime:
      booking?.scheduledStartTime ||
      booking?.startTime ||
      booking?.coordinatedStartTime ||
      booking?.scheduledDateTime,
    scheduledEndTime:
      booking?.scheduledEndTime ||
      booking?.endTime ||
      booking?.coordinatedEndTime ||
      booking?.estimatedEndTime,
    finalAmount:
      booking?.finalAmount ||
      booking?.amount ||
      booking?.price ||
      booking?.quotedPrice ||
      0,
    bookingStatus: booking?.bookingStatus || 'CONFIRMED',
  };
};

export default function MyJobsScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  const [activeTab, setActiveTab] = useState('Active');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [seekerId, setSeekerId] = useState(null);
  const [activeJobs, setActiveJobs] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [requestQuotations, setRequestQuotations] = useState([]);
  const [scheduledJobs, setScheduledJobs] = useState([]);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [error, setError] = useState(null);

  const counts = useMemo(
    () => ({
      Active: activeJobs.length,
      Quotes: quotes.length,
      Scheduled: scheduledJobs.length,
      History: historyJobs.length,
    }),
    [activeJobs.length, quotes.length, scheduledJobs.length, historyJobs.length]
  );

  const loadMyJobs = async () => {
    try {
      setError(null);

      const auth = await getStoredSeekerAuth();

      console.log('MY JOBS AUTH:', auth);

      if (!auth?.isLoggedIn || !auth?.seekerId) {
        setSeekerId(null);
        setActiveJobs([]);
        setQuotes([]);
        setScheduledJobs([]);
        setHistoryJobs([]);
        setError('Please login again. Seeker details were not found.');
        return;
      }

      setSeekerId(auth.seekerId);
      console.log('Logged seekerId:', auth.seekerId);

      const [requestsResult, quotationsResult, bookingsResult] =
        await Promise.allSettled([
          getSeekerRequestQuotations(auth.seekerId),
          getProviderQuotationsForSeeker(),
          getSeekerBookings(auth.seekerId),
        ]);

      if (requestsResult.status === 'rejected') {
        console.log('Requests load failed:', requestsResult.reason?.message);
      }

      if (quotationsResult.status === 'rejected') {
        console.log('Quotations load failed:', quotationsResult.reason?.message);
      }

      if (bookingsResult.status === 'rejected') {
        console.log('Bookings load failed:', bookingsResult.reason?.message);
      }

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

      console.log('REAL REQUESTS:', realRequests.length);
      console.log('REAL QUOTATIONS:', realQuotations.length);
      console.log('REAL BOOKINGS:', realBookings.length);

      const normalizedQuotes = realQuotations.map((quotation) =>
        normalizeQuote(quotation, realRequests)
      );

      const normalizedActiveJobs = realRequests
        .filter((request) => isActiveRequest(request, realBookings))
        .map((request) => normalizeActiveJob(request, realQuotations));

      const normalizedScheduled = realBookings
        .filter((booking) => !isCompletedOrCancelled(booking))
        .map(normalizeScheduledBooking);

      const normalizedHistory = realBookings
        .filter((booking) => isCompletedOrCancelled(booking))
        .map(normalizeScheduledBooking);

      setActiveJobs(normalizedActiveJobs);
      setQuotes(normalizedQuotes);
      setRequestQuotations(realRequests);
      setScheduledJobs(normalizedScheduled);
      setHistoryJobs(normalizedHistory);

      const allFailed =
        requestsResult.status === 'rejected' &&
        quotationsResult.status === 'rejected' &&
        bookingsResult.status === 'rejected';

      if (allFailed) {
        setError(
          'Could not connect to My Jobs backend. Please check your backend services and routes.'
        );
      }
    } catch (err) {
      console.log('Load My Jobs error:', err);
      setError(err?.message || 'Failed to load My Jobs.');
      setActiveJobs([]);
      setQuotes([]);
      setScheduledJobs([]);
      setHistoryJobs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadMyJobs();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMyJobs();
  };

  const renderLoading = () => {
    return (
      <View style={[styles.stateCard, isDarkMode && styles.stateCardDark]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.stateTitle, isDarkMode && styles.textDark]}>
          Loading My Jobs...
        </Text>
        <Text style={[styles.stateMessage, isDarkMode && styles.textMutedDark]}>
          Fetching real seeker data from backend.
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
          Real Data Not Loaded
        </Text>

        <Text style={[styles.stateMessage, isDarkMode && styles.textMutedDark]}>
          {error}
        </Text>

        {seekerId && (
          <Text style={[styles.debugText, isDarkMode && styles.textMutedDark]}>
            Current seekerId: {seekerId}
          </Text>
        )}

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

  const renderSection = () => {
    if (loading) {
      return renderLoading();
    }

    if (error) {
      return renderError();
    }

    switch (activeTab) {
      case 'Quotes':
        return (
          <QuotesSection
            quotes={quotes}
            requests={requestQuotations}
            navigation={navigation}
            isDarkMode={isDarkMode}
          />
        );

      case 'Scheduled':
        return (
          <ScheduledJobsSection
            bookings={scheduledJobs}
            navigation={navigation}
            isDarkMode={isDarkMode}
          />
        );

      case 'History':
        return (
          <JobHistorySection
            history={historyJobs}
            navigation={navigation}
            isDarkMode={isDarkMode}
          />
        );

      case 'Active':
      default:
        return (
          <ActiveJobsSection
            jobs={activeJobs}
            navigation={navigation}
            isDarkMode={isDarkMode}
          />
        );
    }
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

      <JobsHeader
        isDarkMode={isDarkMode}
        activeCount={counts.Active}
        quotesCount={counts.Quotes}
        scheduledCount={counts.Scheduled}
      />

      <JobsTabBar
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
        {renderSection()}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
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
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
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
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
