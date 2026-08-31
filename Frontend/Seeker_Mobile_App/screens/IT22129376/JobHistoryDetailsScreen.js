import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import InfoRow from './components/InfoRow';
import StatusBadge from './components/StatusBadge';
import EmptyJobsState from './components/EmptyJobsState';
import { COLORS } from './theme';
import { mapJobStatus } from './utils/jobStatusMapper';
import { formatCurrency, formatDateTime } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

const getJobId = (job) => job?._id || job?.id || job?.bookingId;
const getTitle = (job) => job?.title || job?.serviceSubcategory || job?.serviceSubCategory || job?.subcategory || 'Service Job';
const getProvider = (job) => job?.providerSnapshot?.name || job?.providerName || job?.providerId || 'Provider';
const getAmount = (job) => job?.finalAmount || job?.amount || job?.price || job?.quotedPrice || 0;
const getClosedDate = (job) => job?.completedAt || job?.cancelledAt || job?.updatedAt || job?.scheduledEndTime || job?.endTime;
const getLocation = (job) => job?.location || job?.serviceLocation || job?.district || 'Location not available';

export default function JobHistoryDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const job = route.params?.job;

  if (!job || !getJobId(job)) {
    return (
      <ScreenShell title="Job Summary" subtitle="History" navigation={navigation}>
        <EmptyJobsState
          title="No real history item selected"
          message="Open a job from My Jobs → History to view real completed or cancelled job details."
          icon="history"
          buttonLabel="Back to My Jobs"
          onButtonPress={() => navigation.navigate('MyJobsScreen')}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  const mapped = mapJobStatus(job.status || job.bookingStatus || 'COMPLETED');

  return (
    <ScreenShell title="Job Summary" subtitle="History" navigation={navigation}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />

        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          {getTitle(job)}
        </Text>

        <Text style={[styles.provider, isDarkMode && styles.mutedDark]}>
          {getProvider(job)}
        </Text>

        <View style={styles.divider} />

        <InfoRow icon="payments" label="Amount" value={formatCurrency(getAmount(job))} isDarkMode={isDarkMode} />
        <InfoRow icon="event" label="Closed Date" value={formatDateTime(getClosedDate(job))} isDarkMode={isDarkMode} />
        <InfoRow icon="place" label="Location" value={getLocation(job)} isDarkMode={isDarkMode} />
      </View>

      <View style={styles.actions}>
        <ActionButton label="Book Similar Service" icon="replay" onPress={() => navigation.navigate('Home')} />
        <ActionButton label="Leave Review" variant="secondary" icon="star" onPress={() => navigation.navigate('FeedbackScreen', { job })} />
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text, marginTop: 14 },
  provider: { fontSize: 14, fontWeight: '700', color: COLORS.muted, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  actions: { gap: 10 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
