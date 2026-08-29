import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import CoordinationSummaryCard from './components/CoordinationSummaryCard';
import InfoRow from './components/InfoRow';
import { COLORS } from './theme';
import { scheduledJobs } from './mock/myJobsMockData';
import { formatCurrency, formatDateTime } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

export default function ScheduledJobDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const booking = route.params?.booking || scheduledJobs[0];

  return (
    <ScreenShell title="Scheduled Job" subtitle={booking.status} navigation={navigation}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{booking.title}</Text>
        <Text style={[styles.provider, isDarkMode && styles.mutedDark]}>{booking.providerName}</Text>

        <View style={styles.divider} />

        <InfoRow icon="event" label="Start Time" value={formatDateTime(booking.scheduledStartTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="event-available" label="End Time" value={formatDateTime(booking.scheduledEndTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="payments" label="Final Amount" value={formatCurrency(booking.finalAmount)} isDarkMode={isDarkMode} />
        <InfoRow icon="place" label="Location" value={booking.location} isDarkMode={isDarkMode} />
        <InfoRow icon="schedule-send" label="Schedule Source" value={booking.scheduleSource} isDarkMode={isDarkMode} />
      </View>

      <CoordinationSummaryCard
        decision="AVAILABLE_WITH_CAUTION"
        recommendedAction="This scheduled job was created through availability-aware coordination."
        conflictDetected={false}
        delayRiskLevel={booking.delayRiskLevel}
        isDarkMode={isDarkMode}
      />

      <View style={styles.actions}>
        <ActionButton label="Chat Provider" icon="chat" onPress={() => navigation.navigate('ChatListScreen')} />
        <ActionButton label="Request Reschedule" variant="secondary" icon="update" onPress={() => navigation.navigate('RescheduleScreen')} />
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
