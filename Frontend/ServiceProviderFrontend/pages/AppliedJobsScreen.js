import React, { useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { JOB_STATUS } from '../constants/jobStatus';
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

export default function AppliedJobsScreen() {
  const { t } = useTranslation();
  const { appliedJobs, getJobsByStatus, updateJobStatus, getStatusCounts } = useAppliedJobs();
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isSi = require('../locales').default.language === 'si';
  const statusCounts = getStatusCounts();
  
  const filteredJobs = getJobsByStatus(selectedStatus).filter(job =>
    job.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (appliedJobs.length === 0) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIcon}>
          <MaterialIcons name="assignment" size={48} color="#C4B5FD" />
        </View>
        <Text style={styles.emptyStateTitle}>No applications yet</Text>
        <Text style={styles.emptyStateText}>
          Browse available jobs and apply to get started
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={20} color="#9CA3AF" />
          <TextInput
            placeholder="Search applications..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.searchInput}
            placeholderTextColor="#9CA3AF"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialIcons name="close" size={20} color="#9CA3AF" />
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
                isActive && styles.filterChipActive,
                filter.key !== 'all' && isActive && { backgroundColor: filter.color }
              ]}
              onPress={() => setSelectedStatus(filter.key)}
            >
              <MaterialIcons
                name={filter.icon}
                size={16}
                color={isActive ? '#FFFFFF' : filter.key !== 'all' ? filter.color : '#6B7280'}
              />
              <Text style={[
                styles.filterChipText,
                isActive && styles.filterChipTextActive
              ]}>
                {filter.label}
              </Text>
              {count > 0 && (
                <View style={[
                  styles.filterCount,
                  isActive && styles.filterCountActive
                ]}>
                  <Text style={[
                    styles.filterCountText,
                    isActive && styles.filterCountTextActive
                  ]}>
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
        <Text style={styles.resultsText}>
          {filteredJobs.length} {filteredJobs.length === 1 ? 'application' : 'applications'}
        </Text>
      </View>

      {/* Applied Jobs List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.appliedList}
      >
        {filteredJobs.map((job) => {
          const status = Object.values(JOB_STATUS).find((s) => s.key === job.status);
          const categoryColor = CATEGORY_COLORS[job.category] || '#7C3AED';
          const initials = job.customer.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
          
          return (
            <View key={job.id} style={styles.appliedCard}>
              <View style={[styles.appliedCardStatus, { backgroundColor: status.color }]} />
              
              <View style={styles.appliedCardContent}>
                <View style={styles.appliedCardHeader}>
                  <View style={[styles.appliedAvatar, { backgroundColor: categoryColor + '15' }]}>
                    <Text style={[styles.appliedAvatarText, { color: categoryColor }]}>
                      {initials}
                    </Text>
                  </View>
                  
                  <View style={styles.appliedInfo}>
                    <Text style={styles.appliedName}>{job.customer}</Text>
                    <View style={styles.appliedMeta}>
                      <MaterialIcons name="location-on" size={12} color="#9CA3AF" />
                      <Text style={styles.appliedMetaText}>{job.location}</Text>
                      <View style={styles.appliedMetaDot} />
                      <View style={[styles.appliedCategory, { backgroundColor: categoryColor + '10' }]}>
                        <Text style={[styles.appliedCategoryText, { color: categoryColor }]}>
                          {job.category}
                        </Text>
                      </View>
                    </View>
                  </View>
                  
                  <Text style={styles.appliedBudget}>{job.budget}</Text>
                </View>

                <Text style={styles.appliedDescription} numberOfLines={2}>
                  {job.description}
                </Text>

                <View style={styles.appliedFooter}>
                  <View style={styles.appliedDate}>
                    <MaterialIcons name="access-time" size={12} color="#9CA3AF" />
                    <Text style={styles.appliedDateText}>
                      Applied {new Date(job.appliedAt).toLocaleDateString('en-US', {
                        day: 'numeric', month: 'short', year: 'numeric'
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

                {/* Action Buttons based on status */}
                {job.status === 'selected' && (
                  <TouchableOpacity style={styles.connectButton}>
                    <MaterialIcons name="chat" size={16} color="#FFFFFF" />
                    <Text style={styles.connectButtonText}>Message Client</Text>
                  </TouchableOpacity>
                )}

                {job.status === 'rejected' && (
                  <TouchableOpacity style={styles.similarJobsButton}>
                    <MaterialIcons name="search" size={16} color="#FFFFFF" />
                    <Text style={styles.similarJobsButtonText}>Find Similar Jobs</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#1F2937',
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
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: '#7C3AED',
    borderColor: '#7C3AED',
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
    backgroundColor: '#E5E7EB',
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
    color: '#1F2937',
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
    color: '#7C3AED',
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
    marginBottom: 12,
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
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});