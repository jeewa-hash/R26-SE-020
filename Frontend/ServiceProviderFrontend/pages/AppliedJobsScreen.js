import React from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { JOB_STATUS } from '../constants/jobStatus';
import { CATEGORY_COLORS } from '../constants/feedData';
import { Colors } from '../theme';
import i18n from '../locales';

export default function AppliedJobsScreen() {
  const { t } = useTranslation();
  const { appliedJobs, updateJobStatus } = useAppliedJobs();
  const isSi = i18n.language === 'si';

  // For testing — simulate status changes
  const cycleStatus = (job) => {
    const statuses = Object.values(JOB_STATUS).map((s) => s.key);
    const currentIndex = statuses.indexOf(job.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];
    updateJobStatus(job.id, nextStatus);
  };

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {isSi ? 'යොදන ලද රැකියා' : 'Applied Jobs'}
        </Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{appliedJobs.length}</Text>
        </View>
      </View>

      {appliedJobs.length === 0 ? (
        // Empty State
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>
            {isSi ? 'තවම අයදුම් කර නැත' : 'No Applications Yet'}
          </Text>
          <Text style={styles.emptySubtitle}>
            {isSi
              ? 'සේවා ඉල්ලීම් පිටුවෙන් රැකියා සොයා අයදුම් කරන්න'
              : 'Browse service requests and apply to jobs'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        >
          {appliedJobs.map((job) => {
            const status = Object.values(JOB_STATUS).find((s) => s.key === job.status);
            const categoryColor = CATEGORY_COLORS[job.category] || Colors.primary;
            const appliedDate = new Date(job.appliedAt).toLocaleDateString();

            return (
              <View key={job.id} style={styles.jobCard}>

                {/* Status Banner */}
                <View style={[styles.statusBanner, { backgroundColor: status.bg }]}>
                  <MaterialIcons name={status.icon} size={16} color={status.color} />
                  <Text style={[styles.statusLabel, { color: status.color }]}>
                    {isSi ? status.labelSi : status.label}
                  </Text>
                  <Text style={styles.statusDate}>• {appliedDate}</Text>
                </View>

                {/* Job Info */}
                <View style={styles.jobHeader}>
                  <Image source={{ uri: job.avatar }} style={styles.avatar} />
                  <View style={styles.jobMeta}>
                    <Text style={styles.customerName}>{job.customer}</Text>
                    <View style={styles.metaRow}>
                      <MaterialIcons name="location-on" size={12} color={Colors.textLight} />
                      <Text style={styles.metaText}>{job.location}</Text>
                    </View>
                  </View>
                  <View style={[styles.categoryPill, { backgroundColor: categoryColor + '20' }]}>
                    <Text style={[styles.categoryText, { color: categoryColor }]}>
                      {job.category}
                    </Text>
                  </View>
                </View>

                {/* Description */}
                <Text style={styles.description} numberOfLines={2}>
                  {job.description}
                </Text>

                {/* Budget + Action Row */}
                <View style={styles.bottomRow}>
                  <View>
                    <Text style={styles.budgetLabel}>
                      {isSi ? 'ඇස්තමේන්තු අයවැය' : 'EST. BUDGET'}
                    </Text>
                    <Text style={styles.budgetValue}>{job.budget}</Text>
                  </View>

                  {/* Status-based action */}
                  {job.status === JOB_STATUS.SELECTED.key && (
                    <TouchableOpacity style={styles.actionBtn}>
                      <MaterialIcons name="chat" size={16} color={Colors.white} />
                      <Text style={styles.actionBtnText}>
                        {isSi ? 'සම්බන්ධ වන්න' : 'Connect'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {job.status === JOB_STATUS.PENDING.key && (
                    <View style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}>
                      <MaterialIcons name="schedule" size={16} color={Colors.white} />
                      <Text style={styles.actionBtnText}>
                        {isSi ? 'බලා සිටිමින්' : 'Waiting'}
                      </Text>
                    </View>
                  )}
                  {job.status === JOB_STATUS.TAKEN.key && (
                    <View style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}>
                      <MaterialIcons name="cancel" size={16} color={Colors.white} />
                      <Text style={styles.actionBtnText}>
                        {isSi ? 'ගෙන ඇත' : 'Taken'}
                      </Text>
                    </View>
                  )}
                  {job.status === JOB_STATUS.EXPIRED.key && (
                    <View style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}>
                      <MaterialIcons name="hourglass-empty" size={16} color={Colors.white} />
                      <Text style={styles.actionBtnText}>
                        {isSi ? 'කල් ඉකුත්' : 'Expired'}
                      </Text>
                    </View>
                  )}
                </View>

                {/* DEV ONLY: Simulate status change */}
                <TouchableOpacity
                  style={styles.devBtn}
                  onPress={() => cycleStatus(job)}
                >
                  <Text style={styles.devBtnText}>🔄 Simulate Status Change (Dev)</Text>
                </TouchableOpacity>

              </View>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  countBadge: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  countText: { fontSize: 13, color: Colors.white, fontWeight: '700' },

  // Empty State
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 21 },

  // List
  listContent: { padding: 16, gap: 12 },

  // Job Card
  jobCard: {
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    elevation: 1, shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 10, padding: 10, marginBottom: 12,
  },
  statusLabel: { fontSize: 13, fontWeight: '700', flex: 1 },
  statusDate: { fontSize: 11, color: Colors.textLight },
  jobHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  jobMeta: { flex: 1 },
  customerName: { fontSize: 14, fontWeight: 'bold', color: Colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  metaText: { fontSize: 12, color: Colors.textLight },
  categoryPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  categoryText: { fontSize: 11, fontWeight: '700' },
  description: { fontSize: 13, color: Colors.textLight, lineHeight: 20, marginBottom: 12 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  budgetLabel: { fontSize: 10, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.5 },
  budgetValue: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  actionBtnText: { color: Colors.white, fontSize: 13, fontWeight: '700' },

  // Dev button - remove in production
  devBtn: {
    marginTop: 10, padding: 8, borderRadius: 8,
    backgroundColor: '#F1F5F9', alignItems: 'center',
  },
  devBtnText: { fontSize: 12, color: '#64748B' },
});