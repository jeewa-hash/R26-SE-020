import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  acceptBidCoordination,
  checkBidCoordination,
  createBookingFromBid,
} from '../../services/coordinationApi';
import styles, { decisionMeta } from './styles';

const fallbackParams = {
  response: {
    providerId: '69fb3a89132f89ae69f1eaf0',
    providerName: 'Chaveen Provider',
    quotedPrice: 5500,
    estimatedDuration: 4,
    proposedStartTime: '2026-05-10T10:00:00.000Z',
    message: 'I can repair the pipe leak.',
  },
  serviceRequestId: '665f0c1a2b3c4d5e6f708192',
  externalPostId: 'POST-TEST-001',
  serviceCategory: 'Repairing Services',
  serviceSubCategory: 'Plumbing',
  description: 'Water tank pipe leaking and needs urgent repair.',
  distanceKm: 8.5,
  estimatedTravelTimeMins: 25,
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const formatSlot = (slot) => {
  if (!slot) return '-';
  if (typeof slot === 'string') return formatDateTime(slot);
  const start = slot?.startTime ? formatDateTime(slot.startTime) : '-';
  const end = slot?.endTime ? formatDateTime(slot.endTime) : '-';
  return `${start} -> ${end}`;
};

const toNumber = (value, fallback = 0) => {
  if (typeof value === 'number') return value;
  const parsed = Number(String(value).replace(/[^0-9.]/g, ''));
  return Number.isNaN(parsed) ? fallback : parsed;
};

export default function BidCoordinationResultScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const params = { ...fallbackParams, ...(route.params || {}) };

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [coordinationResult, setCoordinationResult] = useState(null);

  const response = params.response || fallbackParams.response;
  const providerName = response?.providerName || 'Provider';

  const payload = useMemo(
    () => ({
      serviceRequestId: params.serviceRequestId || fallbackParams.serviceRequestId,
      externalPostId: params.externalPostId || fallbackParams.externalPostId,
      providerId: response?.providerId || fallbackParams.response.providerId,
      serviceCategory: params.serviceCategory || fallbackParams.serviceCategory,
      serviceSubCategory:
        params.serviceSubCategory || fallbackParams.serviceSubCategory,
      description: params.description || fallbackParams.description,
      offeredPrice: toNumber(response?.quotedPrice, 5500),
      proposedStartTime:
        response?.proposedStartTime || fallbackParams.response.proposedStartTime,
      estimatedDurationHours: toNumber(response?.estimatedDuration, 4),
      distanceKm: toNumber(params.distanceKm, 8.5),
      estimatedTravelTimeMins: toNumber(params.estimatedTravelTimeMins, 25),
      providerScheduleDensity: params.providerScheduleDensity || 'High',
      gapBeforeNextBookingMins: toNumber(params.gapBeforeNextBookingMins, 30),
      startDelayMins: toNumber(params.startDelayMins, 0),
      bufferMinutes: toNumber(params.bufferMinutes, 30),
    }),
    [params, response]
  );

  const runCoordinationCheck = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await checkBidCoordination(payload);
      setCoordinationResult(res?.data || null);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to check bid coordination.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runCoordinationCheck();
  }, []);

  const handleAcceptAndBook = async () => {
    if (!coordinationResult?._id) return;
    try {
      setActionLoading(true);
      await acceptBidCoordination(coordinationResult._id);
      await createBookingFromBid(coordinationResult._id);
      Alert.alert(
        'Booking Created',
        'Provider accepted and booking created successfully.',
        [
          {
            text: 'View Schedule',
            onPress: () => navigation.navigate('SeekerSchedule'),
          },
        ]
      );
    } catch (err) {
      Alert.alert(
        'Action Failed',
        err?.response?.data?.message ||
          err?.message ||
          'Could not accept provider and create booking.'
      );
    } finally {
      setActionLoading(false);
    }
  };

  const decision = coordinationResult?.decision || 'DEFAULT';
  const badge = decisionMeta[decision] || decisionMeta.DEFAULT;
  const canAccept =
    decision === 'CAN_ACCEPT' || decision === 'AVAILABLE_WITH_CAUTION';
  const requiresReschedule =
    decision === 'RESCHEDULE_REQUIRED' || decision === 'REJECTED_DUE_TO_CONFLICT';

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#6366F1" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Schedule Check</Text>
        <TouchableOpacity style={styles.iconButton} onPress={runCoordinationCheck}>
          <Ionicons name="refresh" size={20} color="#6366F1" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text style={styles.centerText}>Running AI-based bid coordination...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
          {!!error && (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Provider Offer</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Provider</Text>
              <Text style={styles.rowValue}>{providerName}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Quoted Price</Text>
              <Text style={styles.rowValue}>{toNumber(response?.quotedPrice, 0)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Proposed Start</Text>
              <Text style={styles.rowValue}>
                {formatDateTime(response?.proposedStartTime)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Estimated Duration (hrs)</Text>
              <Text style={styles.rowValue}>
                {toNumber(response?.estimatedDuration, 0)}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <View
              style={[
                styles.decisionBadge,
                { backgroundColor: badge.bg, borderColor: badge.border },
              ]}
            >
              <Text style={[styles.decisionText, { color: badge.text }]}>
                {decision}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.rowLabel}>Predicted Actual Duration</Text>
              <Text style={styles.rowValue}>
                {coordinationResult?.predictedActualDurationHours ?? '-'} hrs
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Delay Risk Level</Text>
              <Text style={styles.rowValue}>
                {coordinationResult?.predictedDelayRiskLevel || '-'}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Required Window Start</Text>
              <Text style={styles.rowValue}>
                {formatDateTime(coordinationResult?.requiredWindowStart)}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Required Window End</Text>
              <Text style={styles.rowValue}>
                {formatDateTime(coordinationResult?.requiredWindowEnd)}
              </Text>
            </View>
            <View style={styles.conflictRow}>
              <Ionicons
                name={
                  coordinationResult?.conflictDetected
                    ? 'alert-circle'
                    : 'checkmark-circle'
                }
                size={18}
                color={coordinationResult?.conflictDetected ? '#DC2626' : '#16A34A'}
              />
              <Text
                style={[
                  styles.conflictText,
                  { color: coordinationResult?.conflictDetected ? '#DC2626' : '#16A34A' },
                ]}
              >
                {coordinationResult?.conflictDetected
                  ? 'Conflict detected in predicted service window'
                  : 'No conflicts in predicted service window'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recommended Action</Text>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {coordinationResult?.recommendedAction ||
                  'No recommendation available.'}
              </Text>
            </View>
          </View>

          {requiresReschedule && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Suggested Alternative Slots</Text>
              {Array.isArray(coordinationResult?.suggestedSlots) &&
              coordinationResult.suggestedSlots.length > 0 ? (
                coordinationResult.suggestedSlots.map((slot, idx) => (
                  <View key={`${slot?.startTime || 'slot'}-${idx}`} style={styles.slotItem}>
                    <Text style={styles.slotText}>{formatSlot(slot)}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>No alternative slots returned yet.</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.outlineButton}
                onPress={() =>
                  Alert.alert(
                    'Request Another Time',
                    'Please ask the provider to propose another available start time.'
                  )
                }
              >
                <Ionicons name="time-outline" size={18} color="#6366F1" />
                <Text style={styles.outlineButtonText}>Request Another Time</Text>
              </TouchableOpacity>
            </View>
          )}

          {canAccept && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleAcceptAndBook}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
              )}
              <Text style={styles.primaryButtonText}>
                Accept Provider and Create Booking
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
