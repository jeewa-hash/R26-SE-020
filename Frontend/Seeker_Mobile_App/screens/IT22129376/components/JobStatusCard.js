import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import ActionButton from './ActionButton';
import InfoRow from './InfoRow';
import { COLORS } from '../theme';
import { mapJobStatus } from '../utils/jobStatusMapper';
import { formatDateTime } from '../utils/dateTimeFormatter';

export default function JobStatusCard({ job, onPress, isDarkMode }) {
  const mapped = mapJobStatus(job.status);

  return (
    <TouchableOpacity style={[styles.card, isDarkMode && styles.cardDark]} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.topRow}>
        <View style={styles.serviceIcon}>
          <MaterialIcons name="build-circle" size={30} color={COLORS.primary} />
        </View>
        <View style={styles.titleArea}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>{job.title}</Text>
          <Text style={[styles.subtitle, isDarkMode && styles.mutedDark]}>{job.category} • {job.subcategory}</Text>
        </View>
        <StatusBadge label={mapped.label} tone={mapped.tone} icon={mapped.icon} />
      </View>

      <Text style={[styles.description, isDarkMode && styles.mutedDark]} numberOfLines={2}>
        {job.description}
      </Text>

      <View style={styles.infoGrid}>
        <InfoRow icon="place" label="Location" value={job.location} isDarkMode={isDarkMode} />
        <InfoRow icon="priority-high" label="Urgency" value={job.urgency} isDarkMode={isDarkMode} />
        <InfoRow icon="event" label="Preferred Start" value={formatDateTime(job.preferredStartTime)} isDarkMode={isDarkMode} />
        <InfoRow icon="groups" label="Providers" value={`${job.providerCount || 0} response(s)`} isDarkMode={isDarkMode} />
      </View>

      <ActionButton label="View Job" variant="secondary" icon="arrow-forward" onPress={onPress} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  cardDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  serviceIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleArea: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '900',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
    fontWeight: '600',
  },
  description: {
    color: '#4B5563',
    fontSize: 13,
    lineHeight: 19,
    marginVertical: 14,
  },
  infoGrid: {
    marginBottom: 10,
  },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
