import React, { useState, useContext } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
  StatusBar,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { ThemeContext } from '../context/ThemeContext';
import { JOB_STATUS } from '../constants/jobStatus';
import ProviderPageHeader from '../components/ProviderPageHeader';
import { openProviderTab } from '../utils/providerFlowUi';
import { CATEGORY_COLORS } from '../constants/feedData';

const { width } = Dimensions.get('window');

const STATUS_FILTERS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'pending', label: 'Pending', icon: 'schedule', color: '#F59E0B' },
  { key: 'selected', label: 'Selected', icon: 'check-circle', color: '#10B981' },
  { key: 'rejected', label: 'Rejected', icon: 'cancel', color: '#EF4444' },
  { key: 'taken', label: 'Taken', icon: 'work', color: '#3B82F6' },
  { key: 'expired', label: 'Expired', icon: 'timer-off', color: '#6B7280' },
];

export default function AppliedJobsScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { t } = useTranslation();
  const { appliedJobs, getJobsByStatus, getStatusCounts } = useAppliedJobs();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const C = isDark
    ? {
        bg: '#0C0F0D',
        card: '#161C18',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#303C33',
        chipBg: '#2a2a2a',
        chipBorder: '#3a3a3c',
        searchBg: '#161C18',
        searchBorder: '#303C33',
      }
    : {
        bg: '#F5FAF6',
        card: '#FFFFFF',
        text: '#111111',
        textSub: '#6B7280',
        border: '#D8E8DC',
        chipBg: '#F3F4F6',
        chipBorder: '#D8E8DC',
        searchBg: '#FFFFFF',
        searchBorder: '#D8E8DC',
      };

  const isSi = require('../locales').default.language === 'si';
  const statusCounts = getStatusCounts();

  const filteredJobs = getJobsByStatus(selectedStatus).filter((job) =>
    [job.customer || job.user?.name || job.poster?.name, job.category || job.detectedCategory, job.title, typeof job.location === 'object' ? job.location?.address : job.location]
      .some(value => String(value || '').toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (appliedJobs.length === 0) {
    return (
      <View style={[styles.emptyState, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyStateIcon}>
          <MaterialIcons name="assignment" size={48} color="#B5DCC0" />
        </View>
        <Text style={[styles.emptyStateTitle, { color: C.text }]}>No applications yet</Text>
        <Text style={[styles.emptyStateText, { color: C.textSub }]}>
          Browse available jobs and apply to get started
        </Text>
        <TouchableOpacity style={styles.connectButton} onPress={() => openProviderTab(navigation, 'HomeTab', { screen: 'NewsFeedMain' })}><Text style={styles.connectButtonText}>Browse Jobs</Text></TouchableOpacity>
        <TouchableOpacity style={styles.similarJobsButton} onPress={() => navigation.goBack()}><Text style={styles.similarJobsButtonText}>Back</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: C.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ProviderPageHeader navigation={navigation} title="Applied Jobs" subtitle="Applications, quotation requests and next steps" />
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={[styles.searchContainer, { backgroundColor: C.searchBg, borderColor: C.searchBorder }]}>
          <MaterialIcons name="search" size={20} color={C.textSub} />
          <TextInput
            placeholder="Search applications..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: C.text }]}
            placeholderTextColor={C.textSub}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color={C.textSub} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContainer}
      >
        {STATUS_FILTERS.map((filter) => {
          const count = statusCounts[filter.key];
          const isActive = selectedStatus === filter.key;

          return (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterChip,
                { backgroundColor: C.chipBg, borderColor: C.chipBorder },
                isActive && styles.filterChipActive,
                filter.key !== 'all' && isActive && { backgroundColor: filter.color, borderColor: filter.color },
              ]}
              onPress={() => setSelectedStatus(filter.key)}
            >
              <MaterialIcons
                name={filter.icon}
                size={16}
                color={isActive ? '#FFFFFF' : filter.key !== 'all' ? filter.color : C.textSub}
              />
              <Text
                style={[
                  styles.filterChipText,
                  { color: C.textSub },
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {filter.label}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    { backgroundColor: isDark ? '#374151' : '#D8E8DC' },
                    isActive && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      { color: C.textSub },
                      isActive && styles.filterCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={[styles.resultsText, { color: C.textSub }]}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'application' : 'applications'}
        </Text>
      </View>

      {/* Applied Jobs List Container */}
      <View style={styles.appliedList}>
        {filteredJobs.map((job) => {
          const status =
            Object.values(JOB_STATUS).find((s) => s.key === job.status) || JOB_STATUS.PENDING;
          const categoryColor = CATEGORY_COLORS[job.category] || '#166534';
          const initials = String(job.customer || job.user?.name || job.poster?.name || 'Seeker')
            .split(' ')
            .map((n) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

          return (
            <View key={job.id} style={[styles.appliedCard, { backgroundColor: C.card, borderColor: C.border, borderWidth: isDark ? 1 : 0 }]}>
              <View style={[styles.appliedCardStatus, { backgroundColor: status.color }]} />

              <View style={styles.appliedCardContent}>
                <View style={styles.appliedCardHeader}>
                  <View style={[styles.appliedAvatar, { backgroundColor: categoryColor + '15' }]}>
                    <Text style={[styles.appliedAvatarText, { color: categoryColor }]}>
                      {initials}
                    </Text>
                  </View>

                  <View style={styles.appliedInfo}>
                    <Text style={[styles.appliedName, { color: C.text }]}>{job.customer || job.user?.name || job.poster?.name || 'Seeker'}</Text>
                    <View style={styles.appliedMeta}>
                      <MaterialIcons name="location-on" size={12} color={C.textSub} />
                      <Text style={[styles.appliedMetaText, { color: C.textSub }]}>
                        {typeof job.location === 'object'
                          ? job.location?.address ||
                            job.location?.city ||
                            job.location?.district ||
                            'Unknown location'
                          : job.location || 'Unknown location'}
                      </Text>
                      <View style={[styles.appliedMetaDot, { backgroundColor: C.border }]} />
                      <View
                        style={[
                          styles.appliedCategory,
                          { backgroundColor: categoryColor + '15' },
                        ]}
                      >
                        <Text style={[styles.appliedCategoryText, { color: categoryColor }]}>
                          {job.category}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={[styles.appliedBudget, { color: '#15803D' }]}>{job.budget}</Text>
                </View>

                <Text style={[styles.appliedDescription, { color: C.textSub }]} numberOfLines={2}>
                  {job.description}
                </Text>

                <View style={styles.appliedFooter}>
                  <View style={styles.appliedDate}>
                    <MaterialIcons name="access-time" size={12} color={C.textSub} />
                    <Text style={[styles.appliedDateText, { color: C.textSub }]}>
                      Applied{' '}
                      {new Date(job.appliedAt).toLocaleDateString('en-US', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </Text>
                  </View>

                  <View style={[styles.appliedStatusBadge, { backgroundColor: status.bg }]}>
                    <MaterialIcons name={status.icon} size={12} color={status.color} />
                    <Text style={[styles.appliedStatusText, { color: status.color }]}>
                      {isSi ? status.labelSi : status.label}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.connectButton} onPress={() => navigation.navigate('ProviderPostDetail', { post: { ...job, _id: job._id || job.id } })}>
                  <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                  <Text style={styles.connectButtonText}>View Post</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.similarJobsButton} onPress={() => openProviderTab(navigation, 'Bookings', { tab: 'Requests' })}>
                  <MaterialIcons name="receipt" size={16} color="#FFFFFF" />
                  <Text style={styles.similarJobsButtonText}>View Quotation Requests</Text>
                </TouchableOpacity>
                <Text style={{ color: C.textSub, marginTop: 10 }}>After you apply, the seeker can request your quotation. Track requests and bookings in My Jobs.</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cancelButton: { backgroundColor: '#DC2626', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10 },
  cancelButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  contentContainer: {
    paddingTop: 16,
    paddingBottom: 120, // Provides extra space at bottom to clear navigation bars
  },
  searchWrapper: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#D8E8DC',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#162C49',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D8E8DC',
  },
  filterChipActive: {
    backgroundColor: '#166534',
    borderColor: '#166534',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  filterCount: {
    backgroundColor: '#D8E8DC',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  filterCountText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterCountTextActive: {
    color: '#FFFFFF',
  },
  resultsHeader: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  resultsText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  appliedList: {
  paddingHorizontal: 20,
  paddingBottom: 120,
  gap: 12,
},
  appliedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flexDirection: 'row',
  },
  appliedCardStatus: {
    width: 4,
  },
  appliedCardContent: {
    flex: 1,
    padding: 16,
  },
  appliedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  appliedAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  appliedInfo: {
    flex: 1,
  },
  appliedName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#162C49',
    marginBottom: 4,
  },
  appliedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appliedMetaText: {
    fontSize: 11,
    color: '#6B7280',
  },
  appliedMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  appliedCategory: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  appliedCategoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  appliedBudget: {
    fontSize: 15,
    fontWeight: '700',
    color: '#166534',
  },
  appliedDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  appliedFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

  },
  appliedDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appliedDateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  appliedStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  appliedStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  connectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 10,
  },
  connectButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  similarJobsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#6B7280',
    borderRadius: 12,
    paddingVertical: 10,
  },
  similarJobsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EAF7EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#162C49',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
