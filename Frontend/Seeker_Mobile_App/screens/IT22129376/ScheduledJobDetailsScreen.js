import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import InfoRow from './components/InfoRow';
import EmptyJobsState from './components/EmptyJobsState';
import { COLORS } from './theme';
import { formatCurrency, formatDateTime } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

const getBookingId = (booking) => booking?._id || booking?.id || booking?.bookingId;
const getTitle = (booking) => booking?.title || booking?.serviceSubcategory || booking?.serviceSubCategory || booking?.subcategory || 'Scheduled Service';
const getProvider = (booking) => booking?.providerSnapshot?.name || booking?.providerName || booking?.providerId || 'Provider';
const getStart = (booking) => booking?.scheduledStartTime || booking?.startTime || booking?.coordinatedStartTime || booking?.scheduledDateTime;
const getEnd = (booking) => booking?.scheduledEndTime || booking?.endTime || booking?.coordinatedEndTime || booking?.estimatedEndTime;
const getAmount = (booking) => booking?.finalAmount || booking?.amount || booking?.price || booking?.quotedPrice || 0;
const getLocation = (booking) => booking?.location || booking?.serviceLocation || booking?.district || 'Location not available';

export default function ScheduledJobDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const booking = route.params?.booking;

  if (!booking || !getBookingId(booking)) {
    return (
      <ScreenShell title="Scheduled Job" subtitle="No booking selected" navigation={navigation}>
        <EmptyJobsState
          title="No real booking selected"
          message="Open a booking from My Jobs → Scheduled to view real booking details."
          icon="event-busy"
          buttonLabel="Back to My Jobs"
          onButtonPress={() => navigation.navigate('MyJobsScreen')}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Scheduled Job" subtitle={booking.status || booking.bookingStatus || 'CONFIRMED'} navigation={navigation}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          {getTitle(booking)}
        </Text>

        <Text style={[styles.provider, isDarkMode && styles.mutedDark]}>
          {getProvider(booking)}
        </Text>

        <View style={styles.divider} />

        <InfoRow icon="event" label="Start Time" value={formatDateTime(getStart(booking))} isDarkMode={isDarkMode} />
        <InfoRow icon="event-available" label="End Time" value={formatDateTime(getEnd(booking))} isDarkMode={isDarkMode} />
        <InfoRow icon="payments" label="Final Amount" value={formatCurrency(getAmount(booking))} isDarkMode={isDarkMode} />
        <InfoRow icon="place" label="Location" value={getLocation(booking)} isDarkMode={isDarkMode} />
        <InfoRow icon="schedule-send" label="Schedule Source" value={booking.scheduleSource || 'Coordinated Booking'} isDarkMode={isDarkMode} />
      </View>

      <CoordinationSummaryCard
        decision={booking.coordinationDecision || booking.coordinationStatus || 'AVAILABLE_WITH_CAUTION'}
        recommendedAction="This scheduled job was created through availability-aware coordination."
        conflictDetected={false}
        delayRiskLevel={booking.delayRiskLevel || booking.predictedDelayRiskLevel}
        isDarkMode={isDarkMode}
      />

      <View style={styles.actions}>
        <ActionButton label="Chat Provider" icon="chat" onPress={() => navigation.navigate('ChatListScreen')} />
        <ActionButton label="Request Reschedule" variant="secondary" icon="update" onPress={() => navigation.navigate('RescheduleScreen', { booking })} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text },
  provider: { fontSize: 14, fontWeight: '700', color: COLORS.muted, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  actions: { gap: 10 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
