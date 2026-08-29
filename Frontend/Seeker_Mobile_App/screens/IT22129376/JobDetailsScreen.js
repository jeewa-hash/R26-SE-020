import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import InfoRow from './components/InfoRow';
import StatusBadge from './components/StatusBadge';
import { COLORS } from './theme';
import { mapJobStatus } from './utils/jobStatusMapper';
import { formatDateTime } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

export default function JobDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const job = route.params?.job || {};
  const mapped = mapJobStatus(job.status);

  return (
    <ScreenShell title="Job Details" subtitle={job.externalSessionId} navigation={navigation}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{job.title || 'Service Job'}</Text>
        <Text style={[styles.description, isDarkMode && styles.mutedDark]}>{job.description}</Text>

        <View style={styles.divider} />

        <InfoRow icon="category" label="Category" value={`${job.category || 'N/A'} • ${job.subcategory || 'N/A'}`} isDarkMode={isDarkMode} />
        <InfoRow icon="place" label="Location" value={job.location} isDarkMode={isDarkMode} />
        <InfoRow icon="priority-high" label="Urgency" value={job.urgency} isDarkMode={isDarkMode} />
        <InfoRow icon="event" label="Preferred Start" value={formatDateTime(job.preferredStartTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="event-available" label="Preferred End" value={formatDateTime(job.preferredEndTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="groups" label="Provider Responses" value={`${job.providerCount || 0} response(s)`} isDarkMode={isDarkMode} />
      </View>

      <ActionButton label="View Quotes" icon="request-quote" onPress={() => navigation.navigate('IT22129376QuoteDetails')} />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#EEF2F7' },
  cardDark: { backgroundColor: COLORS.darkCard, borderColor: COLORS.darkBorder },
  title: { fontSize: 23, fontWeight: '900', color: COLORS.text, marginTop: 14, marginBottom: 8 },
  description: { fontSize: 14, lineHeight: 21, color: COLORS.muted },
  divider: { height: 1, backgroundColor: '#EEF2F7', marginVertical: 16 },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
