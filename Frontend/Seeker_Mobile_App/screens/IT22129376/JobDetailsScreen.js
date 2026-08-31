import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenShell from './ScreenShell';
import ActionButton from './components/ActionButton';
import InfoRow from './components/InfoRow';
import StatusBadge from './components/StatusBadge';
import EmptyJobsState from './components/EmptyJobsState';
import { COLORS } from './theme';
import { mapJobStatus } from './utils/jobStatusMapper';
import { formatDateTime } from './utils/dateTimeFormatter';
import { useTheme } from '../../hooks/useTheme';

const getJobId = (job) => job?._id || job?.id || job?.externalRequestQuotationId || job?.requestQuotationId;
const getTitle = (job) => job?.title || job?.serviceSubcategory || job?.subcategory || job?.object || 'Service Job';
const getDescription = (job) => job?.description || job?.problemDescription || job?.summary || 'Service request created from diagnosis.';
const getCategory = (job) => job?.category || job?.serviceCategory || job?.detectedCategory || 'General';
const getSubcategory = (job) => job?.subcategory || job?.serviceSubcategory || job?.object || job?.detectedObject || 'Service';
const getLocation = (job) => job?.location || job?.serviceLocation || job?.district || 'Location not available';

export default function JobDetailsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const job = route.params?.job;

  if (!job || !getJobId(job)) {
    return (
      <ScreenShell title="Job Details" subtitle="No job selected" navigation={navigation}>
        <EmptyJobsState
          title="No real job selected"
          message="Open a request from My Jobs → Active to view real job details."
          icon="work-outline"
          buttonLabel="Back to My Jobs"
          onButtonPress={() => navigation.navigate('MyJobsScreen')}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  const mapped = mapJobStatus(job.status || 'Quotation Requested');
  const firstQuote = job.relatedQuotes?.[0];

  return (
    <ScreenShell title="Job Details" subtitle={job.externalSessionId || job.sessionId || 'Service Request'} navigation={navigation}>
      <View style={[styles.card, isDarkMode && styles.cardDark]}>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />

        <Text style={[styles.title, isDarkMode && styles.textDark]}>
          {getTitle(job)}
        </Text>

        <Text style={[styles.description, isDarkMode && styles.mutedDark]}>
          {getDescription(job)}
        </Text>

        <View style={styles.divider} />

        <InfoRow icon="category" label="Category" value={`${getCategory(job)} • ${getSubcategory(job)}`} isDarkMode={isDarkMode} />
        <InfoRow icon="place" label="Location" value={getLocation(job)} isDarkMode={isDarkMode} />
        <InfoRow icon="priority-high" label="Urgency" value={job.urgency || job.priority || 'N/A'} isDarkMode={isDarkMode} />
        <InfoRow icon="event" label="Preferred Start" value={formatDateTime(job.preferredStartTime || job.startTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="event-available" label="Preferred End" value={formatDateTime(job.preferredEndTime || job.endTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="groups" label="Provider Responses" value={`${job.providerCount || job.quotesCount || 0} response(s)`} isDarkMode={isDarkMode} />
      </View>

      {firstQuote ? (
        <ActionButton
          label="View First Quote"
          icon="request-quote"
          onPress={() => navigation.navigate('IT22129376QuoteDetails', { quote: firstQuote })}
        />
      ) : (
        <ActionButton
          label="No Quotes Yet"
          icon="hourglass-empty"
          variant="secondary"
          disabled
          onPress={() => {}}
        />
      )}
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
