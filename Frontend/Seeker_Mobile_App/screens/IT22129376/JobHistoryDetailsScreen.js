import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import InfoRow from './components/InfoRow';
import StatusBadge from './components/StatusBadge';
import { COLORS } from './theme';
import { historyJobs } from './mock/myJobsMockData';
import { mapJobStatus } from './utils/jobStatusMapper';
import { formatCurrency, formatDateTime } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

export default function JobHistoryDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const job = route.params?.job || historyJobs[0];
  const mapped = mapJobStatus(job.status);

  return (
    <ScreenShell title="Job Summary" subtitle="History" navigation={navigation}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />
        <Text style={[styles.title, isDarkMode && styles.textDark]}>{job.title}</Text>
        <Text style={[styles.provider, isDarkMode && styles.mutedDark]}>{job.providerName}</Text>

        <View style={styles.divider} />

        <InfoRow icon="payments" label="Amount" value={formatCurrency(job.finalAmount)} isDarkMode={isDarkMode} />
        <InfoRow icon="event" label="Closed Date" value={formatDateTime(job.completedAt)} isDarkMode={isDarkMode} />
        <InfoRow icon="place" label="Location" value={job.location} isDarkMode={isDarkMode} />
      </View>

      <View style={styles.actions}>
        <ActionButton label="Book Similar Service" icon="replay" onPress={() => navigation.navigate('Home')} />
        <ActionButton label="Leave Review" variant="secondary" icon="star" onPress={() => navigation.navigate('FeedbackScreen')} />
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
