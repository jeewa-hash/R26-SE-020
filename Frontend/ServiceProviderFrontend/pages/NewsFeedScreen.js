import React, { useState, useMemo, useEffect, useContext, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { CATEGORIES, CATEGORY_COLORS } from '../constants/feedData';
import { JOB_STATUS } from '../constants/jobStatus';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { CONFIG } from '../config';
import PostCard from '../components/feed/PostCard';
import AnnouncementSlideshow from '../components/feed/AnnouncementSlideshow';
import MidAnnouncementCard from '../components/feed/MidAnnouncementCard';
import HeaderSection from '../components/HeaderSection';
import i18n from '../locales';
import { ThemeContext } from '../context/ThemeContext';

import { getStoredProviderAuth } from './IT22129376/services/providerAuthStorage';
import {
  getProviderJobs,
  getProviderOngoingJobs,
  getProviderQuotations,
  getProviderRequests,
} from './IT22129376/services/providerFlowApi';

import {
  getBookingEndDate,
  getBookingId,
  getBookingStartDate,
  getHumanLocation,
  getHumanSeekerName,
  getHumanServiceTitle,
  getProviderLiveSummary,
  updateBookingLifecycle,
} from '../services/providerFlowApi';

const getProviderIdFromItem = (item) =>
  item?.providerId?._id ||
  item?.providerId ||
  item?.provider?._id ||
  item?.provider?.id ||
  item?.providerSnapshot?.providerId?._id ||
  item?.providerSnapshot?.providerId ||
  '';

const belongsToProvider = (item, providerId) => {
  const itemProviderId = getProviderIdFromItem(item);
  return !itemProviderId || String(itemProviderId) === String(providerId);
};

function AppliedJobsView({ isDark }) {
  const { appliedJobs, updateJobStatus } = useAppliedJobs();
  const isSi = i18n.language === 'si';

  const C = isDark
    ? {
        bg: '#1C1C1E',
        card: '#2C2C2E',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#3A3A3C',
      }
    : {
        bg: '#F9FAFB',
        card: '#FFFFFF',
        text: '#111827',
        textSub: '#6B7280',
        border: '#E5E7EB',
      };

  if (appliedJobs.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: C.bg }]}>
        <View style={styles.emptyIconBg}>
          <MaterialIcons name="assignment" size={40} color="#7C3AED" />
        </View>

        <Text style={[styles.emptyTitle, { color: C.text }]}>
          No Applications Yet
        </Text>

        <Text style={[styles.emptySubtitle, { color: C.textSub }]}>
          Switch to All Jobs and apply to service requests
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.appliedList, { backgroundColor: C.bg }]}>
      {appliedJobs.map((job) => {
        const status =
          Object.values(JOB_STATUS).find((s) => s.key === job.status) ||
          JOB_STATUS.PENDING;

        const initials = job.customer
          ? job.customer
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
          : 'U';

        const appliedDate = new Date(job.appliedAt).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
        });

        return (
          <View key={job.id} style={[styles.appliedCard, { backgroundColor: C.card }]}>
            <View
              style={[
                styles.appliedStatusStrip,
                { backgroundColor: status?.color || '#7C3AED' },
              ]}
            />

            <View style={styles.appliedCardContent}>
              <View style={[styles.statusBadge, { backgroundColor: status?.bg || '#F3E8FF' }]}>
                <MaterialIcons
                  name={status?.icon || 'info'}
                  size={14}
                  color={status?.color || '#7C3AED'}
                />

                <Text style={[styles.statusBadgeText, { color: status?.color || '#7C3AED' }]}>
                  {isSi ? status?.labelSi : status?.label}
                </Text>
              </View>

              <View style={styles.appliedHeader}>
                <View style={[styles.appliedAvatar, { backgroundColor: '#7C3AED' }]}>
                  <Text style={styles.appliedAvatarText}>{initials}</Text>
                </View>

                <View style={styles.appliedMeta}>
                  <Text style={[styles.appliedName, { color: C.text }]}>{job.customer}</Text>

                  <View style={styles.appliedMetaRow}>
                    <MaterialIcons name="location-on" size={11} color="#9CA3AF" />

                    <Text style={styles.appliedLocation}>
                      {typeof job.location === 'object'
                        ? job.location.address ||
                          job.location.city ||
                          job.location.district ||
                          'Unknown location'
                        : job.location || 'Unknown location'}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.appliedBudget, { color: C.text }]}>{job.budget}</Text>
              </View>

              <Text style={[styles.appliedDesc, { color: C.textSub }]} numberOfLines={2}>
                {job.description}
              </Text>

              <View style={styles.appliedFooter}>
                <View style={styles.appliedDateRow}>
                  <MaterialIcons name="access-time" size={12} color="#9CA3AF" />
                  <Text style={styles.appliedDate}>Applied {appliedDate}</Text>
                </View>

                {job.status === 'selected' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}>
                    <MaterialIcons name="chat" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Connect</Text>
                  </TouchableOpacity>
                )}

                {job.status === 'pending' && (
                  <View style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}>
                    <MaterialIcons name="schedule" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Pending</Text>
                  </View>
                )}

                {(job.status === 'taken' || job.status === 'expired') && (
                  <View style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}>
                    <MaterialIcons name="cancel" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>
                      {job.status === 'taken' ? 'Taken' : 'Expired'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function NewsFeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const { appliedJobs } = useAppliedJobs();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showApplied, setShowApplied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [applyingId, setApplyingId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [viewerId, setViewerId] = useState(null);
  const [userName, setUserName] = useState('Kasun');
  const [userAvatar, setUserAvatar] = useState(null);

  const [summary, setSummary] = useState({
    pending: 0,
    waiting: 0,
    scheduled: 0,
    ongoing: 0,
    completed: 0,
    rejected: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError] = useState(false);

  const [liveSummary, setLiveSummary] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [liveUpdating, setLiveUpdating] = useState(false);

  const [delayBooking, setDelayBooking] = useState(null);
  const [delayReason, setDelayReason] = useState('Provider needs additional time');
  const [additionalDelayMinutes, setAdditionalDelayMinutes] = useState('30');

  const C = isDark
    ? {
        bg: '#0F0F0F',
        card: '#1C1C1E',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#2C2C2E',
        subCard: '#2A2A2A',
      }
    : {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#111827',
        textSub: '#6B7280',
        border: '#E5E7EB',
        subCard: '#F9FAFB',
      };

  const loadProviderSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError(false);

    try {
      const auth = await getStoredProviderAuth();

      if (!auth.isLoggedIn || !auth.providerId) {
        throw new Error('Provider authentication required');
      }

      console.log('LOGGED PROVIDER ID:', auth.providerId);

      const results = await Promise.allSettled([
        getProviderRequests(auth.providerId),
        getProviderQuotations(auth.providerId),
        getProviderJobs(auth.providerId),
        getProviderOngoingJobs(auth.providerId),
      ]);

      if (results.some((result) => result.status === 'rejected')) {
        throw new Error('One or more provider summary APIs failed');
      }

      const requests = (results[0].value.rawList || []).filter((item) =>
        belongsToProvider(item, auth.providerId)
      );

      const quotations = (results[1].value.rawList || []).filter((item) =>
        belongsToProvider(item, auth.providerId)
      );

      const bookings = (results[2].value.rawList || []).filter((item) =>
        belongsToProvider(item, auth.providerId)
      );

      const ongoingBookings = (results[3].value.rawList || []).filter((item) =>
        belongsToProvider(item, auth.providerId)
      );

      setSummary({
        pending: requests.filter((item) => String(item.status || '').toLowerCase() === 'pending')
          .length,
        waiting: quotations.filter((item) => String(item.status || '').toUpperCase() === 'SENT')
          .length,
        scheduled: bookings.filter((item) => item.bookingStatus === 'CONFIRMED').length,
        ongoing: ongoingBookings.filter((item) =>
          ['IN_PROGRESS', 'DELAY_REPORTED'].includes(item.bookingStatus)
        ).length,
        completed: bookings.filter((item) => item.bookingStatus === 'COMPLETED').length,
        rejected: quotations.filter((item) => String(item.status || '').toUpperCase() === 'REJECTED')
          .length,
      });
    } catch (error) {
      console.log('Provider summary load error:', error?.message);
      setSummaryError(true);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProviderSummary();
    }, [loadProviderSummary])
  );

  const loadLiveSummary = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLiveLoading(true);
    }

    setLiveError(false);

    try {
      const auth = await getStoredProviderAuth();

      if (!auth?.providerId) {
        throw new Error('Provider authentication required');
      }

      const data = await getProviderLiveSummary(auth.providerId);
      setLiveSummary(data);
    } catch (error) {
      console.log('Provider live summary load error:', error?.message);
      setLiveError(true);
    } finally {
      setLiveLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLiveSummary(true);

      const interval = setInterval(() => {
        loadLiveSummary(false);
      }, 30000);

      return () => clearInterval(interval);
    }, [loadLiveSummary])
  );

  const openLiveJob = (booking) => {
    const rootNavigation = navigation.getParent()?.getParent();

    (rootNavigation || navigation).navigate('IT22129376ProviderJobDetails', {
      booking,
      bookingId: getBookingId(booking),
    });
  };

  const runLiveAction = async (booking, action, payload = {}) => {
    try {
      setLiveUpdating(true);

      await updateBookingLifecycle(getBookingId(booking), action, payload);

      const messages = {
        start: 'Job started successfully.',
        'report-delay': 'Delay reported successfully.',
        complete: 'Job completed successfully.',
      };

      Alert.alert('Success', messages[action] || 'Job updated successfully.');

      setDelayBooking(null);

      await Promise.all([loadLiveSummary(false), loadProviderSummary()]);
    } catch (error) {
      Alert.alert('Update Failed', 'Unable to update this job right now. Please try again.');
    } finally {
      setLiveUpdating(false);
    }
  };

  const submitDelay = () => {
    const minutes = Number(additionalDelayMinutes);

    if (!delayReason.trim() || !Number.isFinite(minutes) || minutes <= 0) {
      Alert.alert(
        'Delay details required',
        'Enter a delay reason and additional minutes greater than zero.'
      );
      return;
    }

    runLiveAction(delayBooking, 'report-delay', {
      delayReason: delayReason.trim(),
      extraTimeMinutes: minutes,
    });
  };

  const formatLiveTime = (value) => {
    const date = value instanceof Date ? value : new Date(value);

    return value && !Number.isNaN(date.getTime())
      ? date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
      : 'Not scheduled';
  };

  const getTimeRemainingLabel = (value) => {
    const target = new Date(value);

    if (!value || Number.isNaN(target.getTime())) {
      return '';
    }

    const minutes = Math.round((target.getTime() - Date.now()) / 60000);

    if (minutes <= 0) {
      return 'Starting now';
    }

    if (minutes < 60) {
      return `Starts in ${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours < 24) {
      return mins ? `Starts in ${hours}h ${mins}m` : `Starts in ${hours}h`;
    }

    const days = Math.floor(hours / 24);
    return `Starts in ${days} day${days > 1 ? 's' : ''}`;
  };

  const renderLiveStatus = () => {
    if (liveLoading) {
      return (
        <View style={[styles.liveState, { backgroundColor: C.card, borderColor: C.border }]}>
          <ActivityIndicator color="#7C3AED" />

          <Text style={[styles.liveStateText, { color: C.textSub }]}>
            Loading today’s work...
          </Text>
        </View>
      );
    }

    if (liveError) {
      return (
        <View style={[styles.liveState, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.liveErrorIcon}>
            <MaterialIcons name="error-outline" size={22} color="#EF4444" />
          </View>

          <Text style={[styles.liveStateText, { color: C.textSub }]}>
            Unable to load live job status right now.
          </Text>

          <TouchableOpacity onPress={() => loadLiveSummary(true)} activeOpacity={0.8}>
            <Text style={styles.liveRetry}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    const ongoing = liveSummary?.delayedJob || liveSummary?.currentJob || null;
    const next = liveSummary?.startingSoonBooking || liveSummary?.nextBooking || null;

    const renderSection = (booking, kind) => {
      const delayed = booking?.bookingStatus === 'DELAY_REPORTED';
      const soon = kind === 'next' && booking === liveSummary?.startingSoonBooking;

      const color = delayed
        ? '#D97706'
        : kind === 'current'
          ? '#2563EB'
          : soon
            ? '#7C3AED'
            : '#059669';

      const icon = delayed
        ? 'warning-amber'
        : kind === 'current'
          ? 'engineering'
          : soon
            ? 'notifications-active'
            : 'event-available';

      const start = getBookingStartDate(booking);
      const end = booking?.delayInfo?.expectedEndTime || getBookingEndDate(booking);

      const sectionTitle = kind === 'current' ? 'In Progress Booking' : 'Next Booking';

      const statusText =
        kind === 'current'
          ? delayed
            ? 'Delay reported'
            : 'Job in progress'
          : soon
            ? `Starting soon · ${getTimeRemainingLabel(start)}`
            : getTimeRemainingLabel(start);

      return (
        <View style={styles.liveInnerSection}>
          <View style={styles.liveSectionTop}>
            <View style={[styles.liveIconBubble, { backgroundColor: `${color}18` }]}>
              <MaterialIcons name={icon} size={18} color={color} />
            </View>

            <View style={styles.liveSectionTextWrap}>
              <Text style={[styles.liveInnerLabel, { color: C.text }]}>
                {sectionTitle}
              </Text>

              <Text style={[styles.liveInnerStatus, { color }]}>
                {statusText || 'Scheduled'}
              </Text>
            </View>
          </View>

          <Text style={[styles.liveServiceTitle, { color: C.text }]} numberOfLines={1}>
            {getHumanServiceTitle(booking)}
          </Text>

          <View style={styles.liveInfoRow}>
            <MaterialIcons name="person-outline" size={14} color={C.textSub} />
            <Text style={[styles.liveDetail, { color: C.textSub }]} numberOfLines={1}>
              Customer: {getHumanSeekerName(booking)}
            </Text>
          </View>

          <View style={styles.liveInfoRow}>
            <MaterialIcons name="place" size={14} color={C.textSub} />
            <Text style={[styles.liveDetail, { color: C.textSub }]} numberOfLines={1}>
              {getHumanLocation(booking)}
            </Text>
          </View>

          {kind === 'current' ? (
            delayed ? (
              <View style={styles.liveInfoRow}>
                <MaterialIcons name="info-outline" size={14} color={C.textSub} />
                <Text style={[styles.liveDetail, { color: C.textSub }]} numberOfLines={2}>
                  Reason: {booking?.delayInfo?.delayReason || 'Not provided'}
                </Text>
              </View>
            ) : (
              <View style={styles.liveInfoRow}>
                <MaterialIcons name="play-circle-outline" size={14} color={C.textSub} />
                <Text style={[styles.liveDetail, { color: C.textSub }]}>
                  Started: {formatLiveTime(booking.actualStartTime || start)}
                </Text>
              </View>
            )
          ) : (
            <View style={styles.liveInfoRow}>
              <MaterialIcons name="schedule" size={14} color={C.textSub} />
              <Text style={[styles.liveDetail, { color: C.textSub }]}>
                Starts: {formatLiveTime(start)}
              </Text>
            </View>
          )}

          {kind === 'current' ? (
            <View style={styles.liveInfoRow}>
              <MaterialIcons name="timer" size={14} color={C.textSub} />
              <Text style={[styles.liveDetail, { color: C.textSub }]}>
                Expected end: {formatLiveTime(end)}
              </Text>
            </View>
          ) : null}

          {booking?.delayInfo?.delayImpactStatus === 'NEXT_BOOKING_AT_RISK' ? (
            <View style={styles.liveRiskBox}>
              <MaterialIcons name="warning-amber" size={15} color="#DC2626" />
              <Text style={styles.liveRisk}>
                This delay may affect your next scheduled job.
              </Text>
            </View>
          ) : null}

          <View style={styles.liveActions}>
            <TouchableOpacity
              disabled={liveUpdating}
              style={[styles.liveButton, { backgroundColor: color }]}
              onPress={() => openLiveJob(booking)}
              activeOpacity={0.85}
            >
              <Text style={styles.liveButtonText}>View Job</Text>
            </TouchableOpacity>

            {kind === 'current' && !delayed ? (
              <TouchableOpacity
                disabled={liveUpdating}
                style={[styles.liveOutlineButton, { borderColor: `${color}55` }]}
                onPress={() => setDelayBooking(booking)}
                activeOpacity={0.85}
              >
                <Text style={[styles.liveOutlineText, { color }]}>Report Delay</Text>
              </TouchableOpacity>
            ) : null}

            {kind === 'current' ? (
              <TouchableOpacity
                disabled={liveUpdating}
                style={[styles.liveOutlineButton, { borderColor: `${color}55` }]}
                onPress={() => runLiveAction(booking, 'complete')}
                activeOpacity={0.85}
              >
                <Text style={[styles.liveOutlineText, { color }]}>Complete</Text>
              </TouchableOpacity>
            ) : null}

            {soon ? (
              <TouchableOpacity
                disabled={liveUpdating}
                style={[styles.liveOutlineButton, { borderColor: `${color}55` }]}
                onPress={() => runLiveAction(booking, 'start')}
                activeOpacity={0.85}
              >
                <Text style={[styles.liveOutlineText, { color }]}>Start Job</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      );
    };

    const emptySection = (title, message, icon) => (
      <View style={styles.liveInnerSection}>
        <View style={styles.liveSectionTop}>
          <View
            style={[
              styles.liveIconBubble,
              { backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9' },
            ]}
          >
            <MaterialIcons name={icon} size={18} color={C.textSub} />
          </View>

          <View style={styles.liveSectionTextWrap}>
            <Text style={[styles.liveInnerLabel, { color: C.text }]}>{title}</Text>

            <Text style={[styles.liveInnerStatus, { color: C.textSub }]}>
              Not active
            </Text>
          </View>
        </View>

        <Text style={[styles.liveDetail, styles.liveEmptyText, { color: C.textSub }]}>
          {message}
        </Text>
      </View>
    );

    return (
      <View style={[styles.liveCard, { backgroundColor: C.card, borderColor: C.border }]}>
        {ongoing
          ? renderSection(ongoing, 'current')
          : emptySection('In Progress Booking', 'No in-progress booking', 'work-outline')}

        <View style={[styles.liveDivider, { backgroundColor: C.border }]} />

        {next
          ? renderSection(next, 'next')
          : emptySection('Next Booking', 'No upcoming confirmed booking', 'event-note')}
      </View>
    );
  };

  const openMyJobs = () => navigation.getParent()?.navigate('Bookings');

  const summaryCards = [
    { key: 'pending', label: 'Pending Requests', icon: 'pending-actions', color: '#F59E0B' },
    { key: 'waiting', label: 'Waiting for Seeker', icon: 'hourglass-top', color: '#8B5CF6' },
    { key: 'scheduled', label: 'Scheduled', icon: 'event-available', color: '#10B981' },
    { key: 'ongoing', label: 'Ongoing', icon: 'engineering', color: '#3B82F6' },
    { key: 'completed', label: 'Completed', icon: 'task-alt', color: '#059669' },
    { key: 'rejected', label: 'Not Selected', icon: 'cancel', color: '#EF4444' },
  ];

  const getCategoryIcon = (category) => {
    const icons = {
      All: 'apps',
      Plumbing: 'plumbing',
      Electrical: 'bolt',
      Cleaning: 'cleaning-services',
      Painting: 'brush',
      Gardening: 'grass',
      Carpentry: 'handyman',
      Moving: 'local-shipping',
      Renovation: 'construction',
      Maintenance: 'build',
      Repair: 'build',
      default: 'category',
    };

    return icons[category] || icons.default;
  };

  useEffect(() => {
    const loadUserData = async () => {
      const name = await AsyncStorage.getItem('userName');
      const avatar = await AsyncStorage.getItem('userAvatar');

      if (name) setUserName(name);
      if (avatar) setUserAvatar(avatar);
    };

    loadUserData();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchNotificationsCount = async () => {
      try {
        const auth = await getStoredProviderAuth();
        const token = auth.token;
        const userId = auth.providerId;

        let count = 0;

        if (CONFIG.ADMIN_SERVICE_URL && userId) {
          try {
            const res = await fetch(
              `${CONFIG.ADMIN_SERVICE_URL}/api/inquiries/notifications/${userId}`
            );

            const data = await res.json();

            if (res.ok && data.data) {
              count = data.data.filter((item) => !item.isRead).length;
            }
          } catch (error) {
            console.log('Admin notification count error:', error?.message);
          }
        }

        if (count === 0 && token && CONFIG.AUTH_SERVICE_URL) {
          try {
            const authRes = await fetch(`${CONFIG.AUTH_SERVICE_URL}/notifications`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            const authData = await authRes.json();

            if (authRes.ok && Array.isArray(authData)) {
              count = authData.filter((item) => !item.isRead).length;
            }
          } catch (error) {
            console.log('Auth notification count error:', error?.message);
          }
        }

        if (isMounted) {
          setUnreadCount(count);
        }
      } catch (error) {
        // silent
      }
    };

    fetchNotificationsCount();

    const interval = setInterval(fetchNotificationsCount, 3000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const auth = await getStoredProviderAuth();
        const token = auth.token;
        const storedProviderId = auth.providerId;

        if (mounted) {
          setViewerId(storedProviderId);
        }

        if (!token) {
          Alert.alert('Error', 'No authentication token. Please login again.');
          setLoadingPosts(false);
          return;
        }

        const url = `${CONFIG.SEEKER_SERVICE_URL}/posts/${
          storedProviderId ? `?viewerId=${storedProviderId}` : ''
        }`;

        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          throw new Error(`Server returned ${res.status}`);
        }

        const data = await res.json();

        if (!mounted) return;

        if (data && data.posts) {
          const mapped = data.posts.map((post) => {
            const userObj = post.user || post.poster || post.seeker || post.author || {};

            const customerName =
              userObj.name ||
              userObj.fullName ||
              (userObj.firstName ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() : null) ||
              post.userName ||
              post.customerName ||
              'Unknown User';

            const customerAvatar =
              userObj.avatar || userObj.profilePicture || userObj.image || null;

            return {
              id: post._id,
              _id: post._id,
              seekerId: post.seekerId || post.userId,
              userId: post.userId || post.seekerId,
              title: post.title || '',
              customer: customerName,
              avatar: customerAvatar,
              customerId: userObj._id || post.seekerId || post.userId || null,
              poster: userObj,
              user: userObj,
              postImage: post.image || null,
              image: post.image || '',
              location:
                (typeof post.location === 'string' ? post.location : '') ||
                post.location?.city ||
                post.location?.district ||
                post.location?.address ||
                userObj.district ||
                userObj.city ||
                'Location N/A',
              locationAddress: post.location?.address || '',
              locationDistrict: post.location?.district || userObj.district || '',
              locationCity: post.location?.city || userObj.city || '',
              locationLat: post.location?.lat || null,
              locationLng: post.location?.lng || null,
              time: post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '',
              postedAt: post.createdAt || null,
              updatedAt: post.updatedAt || null,
              category: post.category || 'Other',
              description: post.description || '',
              tags: post.tags || [],
              urgency: post.urgency || 'medium',
              budget: post.budget || '',
              applied: Number(post.appliedCount ?? 0),
              appliedCount: Number(post.appliedCount ?? 0),
              applicants: post.applicants || post.appliedBy || [],
              isOwner: post.isOwner || false,
              views: post.views || 0,
              urgent: String(post.urgency || '').toLowerCase() === 'high',
              aiMatch: post.aiMatch || null,
              lang: 'en',
            };
          });

          setPosts(mapped);
        } else {
          setPosts([]);
        }
      } catch (error) {
        Alert.alert('Error', `Failed to load posts\n${error.message}`);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredPosts = useMemo(
    () =>
      posts.filter((post) => {
        const matchCat = selectedCategory === 'All' || post.category === selectedCategory;
        const lowerSearch = search.toLowerCase();

        const matchSearch =
          (post.description || '').toLowerCase().includes(lowerSearch) ||
          (post.category || '').toLowerCase().includes(lowerSearch) ||
          (post.location || '').toLowerCase().includes(lowerSearch);

        return matchCat && matchSearch;
      }),
    [search, selectedCategory, posts]
  );

  const feedItems = useMemo(() => {
    const items = [];

    filteredPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });

      if ((index + 1) % 2 === 0 && index !== filteredPosts.length - 1) {
        items.push({ type: 'mid' });
      }
    });

    return items;
  }, [filteredPosts]);

  const handleApply = async (post) => {
    const params = {
      post: {
        ...post,
        _id: post._id || post.id,
      },
    };

    const rootNavigation = navigation.getParent()?.getParent();
    (rootNavigation || navigation).navigate('ProviderPostDetail', params);
  };

  const quickCategories = ['All', 'Plumbing', 'Electrical', 'Cleaning', 'Maintenance', 'Repair'];

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <HeaderSection
        navigation={navigation}
        userName={userName}
        avatarUrl={userAvatar}
        search={search}
        onSearchChange={setSearch}
        unreadCount={unreadCount}
        onInboxPress={() => navigation.navigate('InboxScreen')}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.summarySection}>
          <Text style={[styles.summaryTitle, { color: C.text }]}>My Work Summary</Text>

          {summaryLoading ? (
            <Text style={[styles.summaryMessage, { color: C.textSub }]}>
              Loading provider summary...
            </Text>
          ) : summaryError ? (
            <Text style={[styles.summaryMessage, { color: C.textSub }]}>
              Unable to load provider summary right now.
            </Text>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.summaryCards}
              >
                {summaryCards.map((card) => (
                  <TouchableOpacity
                    key={card.key}
                    style={[styles.summaryCard, { backgroundColor: C.card, borderColor: C.border }]}
                    onPress={openMyJobs}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.summaryIcon, { backgroundColor: `${card.color}18` }]}>
                      <MaterialIcons name={card.icon} size={20} color={card.color} />
                    </View>

                    <Text style={[styles.summaryCount, { color: C.text }]}>
                      {summary[card.key]}
                    </Text>

                    <Text style={[styles.summaryLabel, { color: C.textSub }]}>
                      {card.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {Object.values(summary).every((count) => count === 0) ? (
                <Text style={[styles.summaryEmpty, { color: C.textSub }]}>
                  No active provider work yet. New requests, quotations, and bookings will appear here.
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.slideshowContainer}>
          <AnnouncementSlideshow />
        </View>

        <View style={styles.liveSection}>
          <View style={styles.unlockHeader}>
            

            <Text style={[styles.summaryTitle, styles.liveTitle, { color: C.text }]}>
              Live Job Status
            </Text>

            <Text style={[styles.liveSubtitle, { color: C.textSub }]}>
              Track your current job and next confirmed booking in real time.
            </Text>
          </View>

          {renderLiveStatus()}
        </View>

        <View style={styles.quickCategoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickCategoriesScroll}
          >
            {quickCategories.map((category) => {
              const isActive = selectedCategory === category;
              const color = category === 'All' ? '#7C3AED' : CATEGORY_COLORS[category] || '#7C3AED';
              const icon = getCategoryIcon(category);

              return (
                <TouchableOpacity
                  key={category}
                  onPress={() => setSelectedCategory(category)}
                  style={[
                    styles.quickCategoryChip,
                    isActive && styles.quickCategoryChipActive,
                    !isActive && {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[color, `${color}BB`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.chipGradient}
                    >
                      <MaterialIcons name={icon} size={17} color="#FFF" />

                      <Text style={[styles.quickCategoryText, styles.quickCategoryTextActive]}>
                        {category}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <>
                      <MaterialIcons
                        name={icon}
                        size={17}
                        color={isDark ? '#94A3B8' : '#64748B'}
                      />

                      <Text
                        style={[
                          styles.quickCategoryText,
                          { color: isDark ? '#CBD5E1' : '#374151' },
                        ]}
                      >
                        {category}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.toggleSection}>
          <Surface
            style={[
              styles.toggleContainer,
              { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
            ]}
          >
            <TouchableOpacity
              style={[styles.toggleOption, !showApplied && styles.toggleOptionActive]}
              onPress={() => setShowApplied(false)}
            >
              <MaterialIcons
                name="apps"
                size={18}
                color={!showApplied ? '#FFFFFF' : isDark ? '#8E8E93' : '#6B7280'}
              />

              <Text style={[styles.toggleOptionText, !showApplied && styles.toggleOptionTextActive]}>
                All Jobs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleOption, showApplied && styles.toggleOptionActive]}
              onPress={() => setShowApplied(true)}
            >
              <MaterialIcons
                name="assignment-turned-in"
                size={18}
                color={showApplied ? '#FFFFFF' : isDark ? '#8E8E93' : '#6B7280'}
              />

              <Text style={[styles.toggleOptionText, showApplied && styles.toggleOptionTextActive]}>
                Applied
              </Text>

              {appliedJobs.length > 0 && (
                <View style={styles.toggleCount}>
                  <Text style={styles.toggleCountText}>{appliedJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Surface>
        </View>

        {showApplied ? (
          <AppliedJobsView isDark={isDark} />
        ) : (
          <View style={styles.contentArea}>
            <View style={[styles.recentSection, { paddingHorizontal: 20 }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <View style={styles.sectionAccentRow}>
                    <LinearGradient
                      colors={['#7C3AED', '#4F46E5']}
                      style={styles.sectionAccent}
                    />

                    <Text style={[styles.sectionTitle, { color: C.text }]}>
                      Recent Opportunities
                    </Text>
                  </View>

                  <Text style={[styles.sectionSubtitle, { color: C.textSub }]}>
                    Latest service requests near you
                  </Text>
                </View>

                <View style={[styles.resultBadge, { backgroundColor: isDark ? '#1E293B' : '#F3E8FF' }]}>
                  <Text style={[styles.resultBadgeText, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                    {filteredPosts.length} jobs
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.feedContainer}>
              {feedItems.length > 0 ? (
                feedItems.map((item, index) =>
                  item.type === 'post' ? (
                    <PostCard
                      key={item.data.id}
                      post={item.data}
                      onApply={handleApply}
                      applying={applyingId === item.data.id}
                    />
                  ) : (
                    <MidAnnouncementCard key={`mid_${index}`} />
                  )
                )
              ) : (
                <View style={[styles.noJobsContainer, { backgroundColor: C.card }]}>
                  <MaterialIcons name="check-circle" size={64} color="#C4B5FD" />

                  <Text style={[styles.noJobsTitle, { color: C.text }]}>
                    All caught up!
                  </Text>

                  <Text style={[styles.noJobsText, { color: C.textSub }]}>
                    No service requests found
                  </Text>
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
          </View>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(delayBooking)}
        transparent
        animationType="fade"
        onRequestClose={() => setDelayBooking(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.delayModal, { backgroundColor: C.card }]}>
            <Text style={[styles.delayModalTitle, { color: C.text }]}>Report Delay</Text>

            <TextInput
              style={[styles.delayInput, { color: C.text, borderColor: C.border }]}
              placeholder="Delay reason"
              placeholderTextColor={C.textSub}
              value={delayReason}
              onChangeText={setDelayReason}
            />

            <TextInput
              style={[styles.delayInput, { color: C.text, borderColor: C.border }]}
              placeholder="Additional delay minutes"
              placeholderTextColor={C.textSub}
              keyboardType="numeric"
              value={additionalDelayMinutes}
              onChangeText={setAdditionalDelayMinutes}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setDelayBooking(null)}>
                <Text style={{ color: C.textSub, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                disabled={liveUpdating}
                style={styles.modalSubmit}
                onPress={submitDelay}
              >
                <Text style={styles.liveButtonText}>
                  {liveUpdating ? 'Submitting...' : 'Submit'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  summarySection: {
    paddingTop: 16,
    marginBottom: 4,
  },

  summaryTitle: {
    paddingHorizontal: 20,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },

  summaryMessage: {
    paddingHorizontal: 20,
    fontSize: 13,
    marginBottom: 12,
  },

  summaryCards: {
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 8,
  },

  summaryCard: {
    width: 132,
    borderWidth: 1,
    borderRadius: 16,
    padding: 13,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },

  summaryCount: {
    fontSize: 22,
    fontWeight: '600',
  },

  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 3,
  },

  summaryEmpty: {
    paddingHorizontal: 20,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 8,
  },

  liveSection: {
    paddingTop: 16,
    paddingHorizontal: 20,
    marginBottom: 18,
  },

  unlockHeader: {
    marginBottom: 12,
  },

  unlockFeatureLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },

  liveTitle: {
    paddingHorizontal: 0,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },

  liveSubtitle: {
    fontSize: 13,
    lineHeight: 19,
  },

  liveState: {
    minHeight: 120,
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveStateText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  liveErrorIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveRetry: {
    color: '#7C3AED',
    fontSize: 13,
    fontWeight: '600',
  },

  liveCard: {
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 3,
  },

  liveInnerSection: {
    paddingVertical: 2,
  },

  liveSectionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },

  liveIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  liveSectionTextWrap: {
    flex: 1,
  },

  liveInnerLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },

  liveInnerStatus: {
    fontSize: 12,
    fontWeight: '500',
  },

  liveDivider: {
    height: 1,
    marginVertical: 16,
    opacity: 0.8,
  },

  liveServiceTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
  },

  liveInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 6,
  },

  liveDetail: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },

  liveEmptyText: {
    marginTop: 2,
    paddingLeft: 46,
  },

  liveRiskBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },

  liveRisk: {
    flex: 1,
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },

  liveActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },

  liveButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },

  liveButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },

  liveOutlineButton: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },

  liveOutlineText: {
    fontSize: 13,
    fontWeight: '600',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },

  delayModal: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 20,
    padding: 20,
  },

  delayModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 15,
  },

  delayInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginBottom: 11,
  },

  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 4,
  },

  modalCancel: {
    paddingHorizontal: 15,
    paddingVertical: 11,
  },

  modalSubmit: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 17,
    paddingVertical: 11,
    borderRadius: 10,
  },

  slideshowContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },

  quickCategoriesWrapper: {
    marginBottom: 16,
  },

  quickCategoriesScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },

  quickCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    position: 'relative',
  },

  quickCategoryChipActive: {
    borderWidth: 0,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },

  chipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
  },

  quickCategoryText: {
    fontSize: 13,
    fontWeight: '500',
  },

  quickCategoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  toggleSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
  },

  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
  },

  toggleOptionActive: {
    backgroundColor: '#7C3AED',
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  toggleOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  toggleOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  toggleCount: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },

  toggleCountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  contentArea: {
    flex: 1,
  },

  recentSection: {
    marginBottom: 16,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  sectionAccentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  sectionAccent: {
    width: 4,
    height: 22,
    borderRadius: 4,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },

  sectionSubtitle: {
    fontSize: 13,
  },

  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  feedContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },

  noJobsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 20,
  },

  noJobsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  noJobsText: {
    fontSize: 14,
    textAlign: 'center',
  },

  appliedList: {
    paddingHorizontal: 20,
    gap: 12,
  },

  appliedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 4,
  },

  appliedStatusStrip: {
    width: 4,
  },

  appliedCardContent: {
    flex: 1,
    padding: 14,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },

  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },

  appliedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },

  appliedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },

  appliedAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  appliedMeta: {
    flex: 1,
  },

  appliedName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },

  appliedMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },

  appliedLocation: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  appliedBudget: {
    fontSize: 14,
    fontWeight: '500',
  },

  appliedDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },

  appliedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  appliedDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  appliedDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  actionBtnText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },

  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 60,
  },

  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },

  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
  },
});