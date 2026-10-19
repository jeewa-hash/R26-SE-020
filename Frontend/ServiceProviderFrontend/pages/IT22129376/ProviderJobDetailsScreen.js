import { sessionGuidance } from '../../utils/providerSessions';
import { COLORS } from './theme';
import React, { useCallback, useContext, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, TextInput } from 'react-native';
import { bookingActions } from '../../utils/providerFlowState';
import { confirm, notify, openProviderChat, openProviderTab } from '../../utils/providerFlowUi';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  getBookingEndDate, getBookingId, getBookingStartDate, getBookingStatus,
  getHumanLocation, getHumanSeekerName, getHumanServiceTitle,
  acceptBookingReschedule, getBookingReschedules, getProviderBookingById, openLocationInMaps,
  rejectBookingReschedule, requestBookingReschedule, statusLabel, updateBookingLifecycle,
} from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

const formatDateTime = (value) => value && !Number.isNaN(value.getTime())
  ? value.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
  : 'Not scheduled';

export default function ProviderJobDetailsScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = { bg: isDark ? COLORS.darkBg : COLORS.bg, card: isDark ? COLORS.darkCard : COLORS.card, text: isDark ? COLORS.darkText : COLORS.text, muted: isDark ? '#94A3B8' : '#4B5563', border: isDark ? COLORS.darkBorder : COLORS.border };
  const initialBooking = route?.params?.booking || {};
  const [booking, setBooking] = useState(initialBooking);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [delayReason, setDelayReason] = useState('');
  const [showDelayForm, setShowDelayForm] = useState(false);
  const [extraMinutes, setExtraMinutes] = useState('30');
  const [clockNow, setClockNow] = useState(Date.now());
  useEffect(() => { const timer = setInterval(() => setClockNow(Date.now()), 15000); return () => clearInterval(timer); }, []);
  const [pendingReschedule, setPendingReschedule] = useState(null);
  const bookingId = getBookingId(booking) || getBookingId(initialBooking) || route?.params?.bookingId;
  const allowed = bookingActions(booking);
  const status = getBookingStatus(booking);

  const loadBooking = useCallback(async () => {
    const { token, providerId } = await getStoredProviderAuth();
    if (!token || !providerId || !bookingId) {
      setError('Unable to load data right now. Please check your connection and try again.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const row = await getProviderBookingById(bookingId);
      if (row && typeof row === 'object') setBooking(row);
      try {
        const reschedules = await getBookingReschedules(bookingId);
        setPendingReschedule(reschedules.find((item) => ['PENDING', 'PENDING_PROVIDER_REVIEW'].includes(item?.status)) || null);
      } catch (e) { setPendingReschedule(null); setError('Booking loaded, but reschedule details could not be checked. Refresh to retry.'); }
    } catch (loadError) {
      console.log('Provider booking details load failed:', loadError?.message);
      setError('Unable to load data right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  useFocusEffect(useCallback(() => { loadBooking(); }, [loadBooking]));

  const runAction = async (action, body = {}) => {
    if (updating || !bookingId) return;
    if (action === 'report-delay' && (!delayReason.trim() || !Number.isInteger(Number(extraMinutes)) || Number(extraMinutes) <= 0)) {
      notify('Check delay details', 'Enter a reason and a positive whole number of extra minutes.'); return;
    }
    try {
      setUpdating(true);
      await updateBookingLifecycle(bookingId, action, body);
      const messages = { 'confirm-ready': 'Ready confirmed.', 'on-the-way': 'The seeker can now see that you are on the way.', start: 'Job started successfully.', 'report-delay': 'Delay reported successfully.', complete: 'Job completed successfully.' };
      notify('Success', messages[action]);
      if (action === 'report-delay') setShowDelayForm(false);
      await loadBooking();
    } catch (actionError) {
      notify('Update Failed', actionError?.message || 'Unable to update this job right now. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const confirmAction = (title, message, action) => confirm(title, message, () => runAction(action));

  const acceptSlot = async (slot) => {
    try {
      setUpdating(true);
      await acceptBookingReschedule(pendingReschedule?._id, slot);
      notify('Rescheduled', 'The selected time was validated and applied.');
      await loadBooking();
    } catch (actionError) {
      notify('Time Unavailable', actionError?.message || 'This time could not be validated.');
    } finally {
      setUpdating(false);
    }
  };

  const keepBooking = async () => {
    try {
      setUpdating(true);
      await rejectBookingReschedule(pendingReschedule?._id);
      notify('Time request declined', status === 'EXPIRED' ? 'The service remains expired. The customer can propose another time.' : 'The current booking time remains unchanged.');
      await loadBooking();
    } catch (actionError) {
      notify('Update Failed', actionError?.message || 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const requestReschedule = async () => {
    try {
      setUpdating(true);
      await requestBookingReschedule(bookingId);
      notify('Reschedule Requested', 'Choose a validated suggested slot in the review section.');
      await loadBooking();
    } catch (actionError) {
      notify('Reschedule Unavailable', actionError?.message || 'Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  if (loading && !getBookingId(booking)) {
    return <View style={[styles.container, { backgroundColor: C.bg }]}><ProviderPageHeader navigation={navigation} title="Job Details" subtitle="View and manage this booking" /><View style={styles.loading}><ActivityIndicator color="#15803D" /><Text style={[styles.row, { color: C.muted }]}>Loading...</Text></View></View>;
  }

  const guidance = sessionGuidance({ booking });
  const startWindowOpens = getBookingStartDate(booking);
  const canStartNow = startWindowOpens && clockNow >= startWindowOpens.getTime() - 30 * 60000 && clockNow <= startWindowOpens.getTime() + 45 * 60000;
  const disabled = loading || updating || Boolean(error);
  const start = getBookingStartDate(booking), end = getBookingEndDate(booking);
  const working = ['IN_PROGRESS', 'DELAY_REPORTED'].includes(status);
  const primary = working ? { label: 'Complete Job', action: 'complete', prompt: 'Confirm that all agreed work is finished.' }
    : ['CONFIRMED', 'RESCHEDULED', 'ON_THE_WAY'].includes(status) ? { label: 'Start Work', action: 'start', prompt: 'Start this job now? Only start when you have arrived and are ready to work.' } : null;
  const card = [styles.card, { backgroundColor: C.card, borderColor: C.border }];
  const text = { color: C.text }, muted = { color: C.muted };
  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <ProviderPageHeader navigation={navigation} title="Job Details" subtitle="Your booking, schedule and next step" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.toolbar}><Text style={[styles.badge, text]}>{statusLabel(status)}</Text><TouchableOpacity accessibilityRole="button" disabled={loading || updating} style={styles.refresh} onPress={loadBooking}>{loading || updating ? <ActivityIndicator size="small" color="#15803D" /> : <Ionicons name="refresh-outline" size={18} color="#15803D" />}<Text style={styles.mapButtonText}>Refresh</Text></TouchableOpacity></View>
        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
        <View style={card}>
          <Text style={[styles.title, text]}>{getHumanServiceTitle(booking)}</Text>
          <Text style={[styles.caption, muted]}>Agreed amount</Text><Text style={[styles.price, text]}>LKR {Number(booking?.finalAmount ?? booking?.amount ?? 0).toLocaleString()}</Text>
          {getHumanSeekerName(booking) !== 'Customer' ? <Text style={[styles.row, muted]}>Customer: {getHumanSeekerName(booking)}</Text> : null}
        </View>
        <View style={[...card, { borderLeftWidth: 4, borderLeftColor: '#15803D' }]}>
          <View style={styles.heading}><Ionicons name={working ? 'construct-outline' : allowed.closed ? 'checkmark-circle-outline' : 'calendar-outline'} size={23} color="#15803D" /><Text style={[styles.sectionTitle, text, { flex: 1 }]}>{guidance.title}</Text></View>
          <Text style={[styles.body, muted]}>{guidance.message}</Text>
          {booking?.providerReadyConfirmed && !allowed.closed ? <Text style={styles.success}>Readiness confirmed</Text> : null}
          {allowed.ready ? <TouchableOpacity accessibilityRole="button" disabled={disabled} style={[styles.secondary, { borderColor: C.border }]} onPress={() => confirmAction('Confirm Ready', 'Confirm you are ready for this booking?', 'confirm-ready')}><Text style={styles.mapButtonText}>Confirm Readiness</Text></TouchableOpacity> : null}
          {allowed.travel ? <TouchableOpacity accessibilityRole="button" disabled={disabled} style={[styles.secondary, { borderColor: C.border }]} onPress={() => confirmAction('On My Way', 'Tell the customer you are on the way?', 'on-the-way')}><Ionicons name="navigate-outline" size={18} color="#15803D" /><Text style={styles.mapButtonText}>I’m On My Way</Text></TouchableOpacity> : null}
          {['CONFIRMED', 'RESCHEDULED'].includes(status) && !pendingReschedule ? <TouchableOpacity disabled={disabled} style={styles.textLink} onPress={requestReschedule}><Text style={styles.mapButtonText}>Need another time? Request a change</Text></TouchableOpacity> : null}
        </View>
        <View style={card}>
          <Text style={[styles.sectionTitle, text]}>Schedule & location</Text>
          <View style={styles.scheduleGrid}><View style={styles.flex}><Text style={[styles.caption, muted]}>Scheduled start</Text><Text style={[styles.detailValue, text]}>{formatDateTime(start)}</Text></View><View style={styles.flex}><Text style={[styles.caption, muted]}>Planned finish</Text><Text style={[styles.detailValue, text]}>{formatDateTime(end)}</Text></View></View>
          <View style={[styles.divider, { borderColor: C.border }]}><Text style={[styles.caption, muted]}>Job location</Text><Text style={[styles.detailValue, text]}>{getHumanLocation(booking)}</Text>
          {getHumanLocation(booking) !== 'Location not provided' ? <TouchableOpacity style={styles.textLink} onPress={() => openLocationInMaps({ latitude: booking?.location?.lat, longitude: booking?.location?.lng, address: getHumanLocation(booking), label: getHumanServiceTitle(booking) })}><Ionicons name="map-outline" size={18} color="#15803D" /><Text style={styles.mapButtonText}>Open in Maps</Text></TouchableOpacity> : null}</View>
          {Number(booking?.estimatedTravelTimeMins) > 0 ? <Text style={[styles.body, muted]}>Estimated travel: {Math.round(booking.estimatedTravelTimeMins)} minutes{Number(booking?.distanceFromPreviousBookingKm) > 0 ? ` · ${Number(booking.distanceFromPreviousBookingKm).toFixed(1)} km` : ''}</Text> : null}
        </View>
        {status === 'DELAY_REPORTED' ? <View style={card}><Text style={[styles.sectionTitle, text]}>Reported delay</Text><Text style={[styles.body, muted]}>{booking?.delayInfo?.delayReason || 'Additional time needed'}</Text><Text style={[styles.body, text]}>Extra time: {booking?.delayInfo?.additionalDelayMins || booking?.delayInfo?.extraTimeMinutes || 0} minutes</Text>{booking?.delayInfo?.expectedEndTime ? <Text style={[styles.body, text]}>Updated finish: {formatDateTime(new Date(booking.delayInfo.expectedEndTime))}</Text> : null}{booking?.delayInfo?.delayImpactStatus === 'NEXT_BOOKING_AT_RISK' ? <Text style={styles.riskWarning}>This delay may affect your next scheduled job.</Text> : null}</View> : null}
          {pendingReschedule ? (
            <View style={styles.delayBox}>
              <Text style={[styles.title, { color: C.text, fontSize: 16 }]}>Reschedule Review</Text>
              <Text style={[styles.row, { color: C.muted }]}>{pendingReschedule.note || pendingReschedule.reason || 'A new service time was requested.'}</Text>
              {(pendingReschedule.suggestedSlots || []).map((slot, index) => (
                <TouchableOpacity key={`${slot.date}-${slot.startTime}-${index}`} disabled={updating || loading} style={styles.button} onPress={() => acceptSlot(slot)}>
                  <Text style={styles.buttonText}>Choose {slot.date} {slot.startTime}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity disabled={updating || loading} style={styles.warningButton} onPress={keepBooking}>
                <Text style={styles.warningButtonText}>{status === 'EXPIRED' ? 'Decline New Time' : 'Keep Current Time'}</Text>
              </TouchableOpacity>
            </View>
          ) : null}

        {allowed.delay ? <View style={card}>
          <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: showDelayForm }} style={styles.heading} onPress={() => setShowDelayForm(value => !value)}><Ionicons name="time-outline" size={22} color="#15803D" /><Text style={[styles.sectionTitle, text, { flex: 1 }]}>Need more time?</Text><Ionicons name={showDelayForm ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} /></TouchableOpacity>
          <Text style={[styles.body, muted]}>Let the customer know if the work will take longer.</Text>
          {showDelayForm ? <>
            <Text style={[styles.caption, muted]}>Reason for the delay</Text><TextInput accessibilityLabel="Reason for delay" editable={!disabled} style={[styles.input, text, { borderColor: C.border, backgroundColor: C.card }]} placeholderTextColor={C.muted} value={delayReason} onChangeText={setDelayReason} multiline placeholder="For example, additional repair work is needed" />
            <Text style={[styles.caption, muted]}>Additional time in minutes</Text><TextInput accessibilityLabel="Additional time in minutes" editable={!disabled} style={[styles.input, text, { borderColor: C.border, backgroundColor: C.card }]} placeholderTextColor={C.muted} value={extraMinutes} onChangeText={setExtraMinutes} keyboardType="numeric" placeholder="30" />
            <TouchableOpacity disabled={disabled} style={[styles.secondary, { borderColor: C.border }]} onPress={() => runAction('report-delay', { delayReason, extraTimeMinutes: Number(extraMinutes) })}><Text style={styles.mapButtonText}>Send Delay Update</Text></TouchableOpacity>
          </> : null}
        </View> : null}
        <View style={card}>
          <Text style={[styles.sectionTitle, text]}>Contact & details</Text>
          {booking.seekerId ? <TouchableOpacity style={[styles.secondary, { borderColor: C.border }]} onPress={() => openProviderChat(navigation, booking.seekerId, getHumanSeekerName(booking))}><Ionicons name="chatbubble-outline" size={18} color="#15803D" /><Text style={styles.mapButtonText}>Message Customer</Text></TouchableOpacity> : null}
          <TouchableOpacity style={styles.textLink} onPress={() => openProviderTab(navigation, 'Bookings', { tab: allowed.closed ? 'History' : 'Scheduled' })}><Text style={styles.mapButtonText}>My Jobs</Text><Ionicons name="arrow-forward" size={17} color="#15803D" /></TouchableOpacity>
          {status === 'COMPLETED' ? <TouchableOpacity style={styles.textLink} onPress={() => openProviderTab(navigation, 'Earnings')}><Text style={styles.mapButtonText}>View Earnings</Text><Ionicons name="arrow-forward" size={17} color="#15803D" /></TouchableOpacity> : null}
        </View>
        {(booking.timeline || []).length ? <View style={card}><Text style={[styles.sectionTitle, text]}>Job activity</Text>{(booking.timeline || []).slice().reverse().map((event, index) => <View key={event._id || index} style={[styles.activity, { borderColor: C.border }]}><View style={styles.dot} /><View style={styles.flex}><Text style={[styles.body, text]}>{event.message || statusLabel(event.status)}</Text>{event.at ? <Text style={[styles.caption, muted]}>{formatDateTime(new Date(event.at))}</Text> : null}</View></View>)}</View> : null}
      </ScrollView>
      {primary ? <View style={[styles.footer, { backgroundColor: C.card, borderColor: C.border }]}><TouchableOpacity accessibilityRole="button" disabled={disabled || (primary.action === 'start' && !canStartNow)} style={[styles.primary, (disabled || (primary.action === 'start' && !canStartNow)) && { opacity: .5 }]} onPress={() => confirmAction(primary.label, primary.prompt, primary.action)}>{updating ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.buttonText}>{primary.action === 'start' && !canStartNow ? 'Start opens 30 min before schedule' : primary.label}</Text><Ionicons name={working ? 'checkmark-circle-outline' : 'play-outline'} size={21} color="#FFFFFF" /></>}</TouchableOpacity></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, badge: { fontSize: 13, fontWeight: '600' }, refresh: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8 },
  caption: { fontSize: 12, lineHeight: 18, marginTop: 12 }, price: { fontSize: 27, fontWeight: '700', marginTop: 4 }, sectionTitle: { fontSize: 16, fontWeight: '700', lineHeight: 23 }, heading: { flexDirection: 'row', gap: 10, alignItems: 'center' }, body: { fontSize: 14, lineHeight: 22, marginTop: 7 },
  flex: { flex: 1 }, scheduleGrid: { flexDirection: 'row', gap: 18 }, detailValue: { fontSize: 14, fontWeight: '600', lineHeight: 22, marginTop: 4 }, divider: { borderTopWidth: 1, marginTop: 16 },
  secondary: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, padding: 13, marginTop: 15 }, textLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 13, marginTop: 4 },
  activity: { flexDirection: 'row', gap: 10, borderTopWidth: 1, marginTop: 14, paddingTop: 9 }, dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#15803D', marginTop: 15 }, footer: { borderTopWidth: 1, padding: 16 }, primary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 13, backgroundColor: '#15803D' },
  container: { flex: 1, backgroundColor: '#F5FAF6' }, content: { padding: 16, gap: 14, paddingBottom: 24 }, loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 18, padding: 18, borderWidth: 1 }, title: { fontSize: 20, fontWeight: '600', color: '#162C49' }, status: { marginTop: 8, color: '#15803D', fontWeight: '500' }, row: { marginTop: 12, color: '#4B5563', fontSize: 14, fontWeight: '400' },
  info: { marginTop: 12, color: '#15803D', fontWeight: '600' }, success: { marginTop: 12, color: '#047857', fontWeight: '600' }, delayBox: { marginTop: 12, backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10 }, warning: { color: '#B45309', marginBottom: 5 }, riskWarning: { marginTop: 12, color: '#B45309', backgroundColor: '#FFFBEB', padding: 10, borderRadius: 10, fontWeight: '600' },
  error: { color: '#B91C1C', backgroundColor: '#FEE2E2', padding: 12, borderRadius: 10, marginBottom: 12 }, input: { marginTop: 12, borderWidth: 1, borderColor: '#D8E8DC', borderRadius: 10, padding: 12, color: '#162C49' }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  button: { backgroundColor: '#15803D', borderRadius: 10, padding: 12 }, buttonText: { color: '#fff', fontWeight: '600' }, warningButton: { backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12 }, warningButtonText: { color: '#B45309', fontWeight: '600' }, successButton: { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12 }, successButtonText: { color: '#047857', fontWeight: '600' },
  mapButton: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: '#EAF7EE', borderRadius: 10 }, mapButtonText: { color: '#166534', fontWeight: '600' },
});
