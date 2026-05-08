import React from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Colors } from '../theme';

const RECENT_ACTIVITY = [
  { id: '1', icon: 'check-circle', iconColor: '#4CAF50', titleKey: 'newBidAccepted', timeKey: 'minsAgo' },
  { id: '2', icon: 'chat-bubble-outline', iconColor: '#2196F3', titleKey: 'messageFrom', timeKey: 'hourAgo' },
  { id: '3', icon: 'account-balance-wallet', iconColor: '#4CAF50', titleKey: 'paymentReceived', timeKey: 'hoursAgo' },
];

export default function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>⚡</Text>
          </View>
          <TouchableOpacity>
            <MaterialIcons name="auto-awesome" size={26} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* ── Profile ── */}
        <View style={styles.profileRow}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>Kasun Perera</Text>
            <Text style={styles.profileBadge}>{t('topRatedPro')}</Text>
          </View>
          <TouchableOpacity style={styles.statsButton}>
            <MaterialIcons name="trending-up" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ── Performance ── */}
        <Text style={styles.sectionLabel}>{t('yourPerformance')}</Text>
        <View style={styles.statsGrid}>

          {/* Total Jobs */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <MaterialIcons name="work-outline" size={20} color={Colors.textLight} />
              <Text style={styles.statChange}>↗ +12%</Text>
            </View>
            <Text style={styles.statLabel}>{t('totalJobs')}</Text>
            <Text style={styles.statValue}>124</Text>
          </View>

          {/* Earnings */}
          <View style={[styles.statCard, styles.statCardGreen]}>
            <View style={styles.statTop}>
              <MaterialIcons name="account-balance-wallet" size={20} color="#2E7D32" />
            </View>
            <Text style={[styles.statLabel, { color: '#2E7D32' }]}>{t('earnings')}</Text>
            <Text style={[styles.statValue, { color: '#1B5E20' }]}>45,200</Text>
          </View>

          {/* User Rating */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <MaterialIcons name="star-outline" size={20} color={Colors.textLight} />
            </View>
            <Text style={styles.statLabel}>{t('userRating')}</Text>
            <Text style={styles.statValue}>4.9</Text>
          </View>

          {/* Completion */}
          <View style={styles.statCard}>
            <View style={styles.statTop}>
              <MaterialIcons name="schedule" size={20} color={Colors.textLight} />
            </View>
            <Text style={styles.statLabel}>{t('completion')}</Text>
            <Text style={styles.statValue}>98%</Text>
          </View>

        </View>

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionLabel}>{t('quickActions')}</Text>
        <View style={styles.actionsRow}>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="photo-library" size={26} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>{t('uploadPortfolio')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="add" size={26} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>{t('createService')}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={styles.actionIcon}>
              <MaterialIcons name="work" size={26} color={Colors.white} />
            </View>
            <Text style={styles.actionLabel}>{t('findNewJobs')}</Text>
          </TouchableOpacity>

        </View>

        {/* ── AI Suggestion ── */}
        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiTag}>
              <View style={styles.aiDot} />
              <Text style={styles.aiTagText}>{t('aiSuggestion')}</Text>
            </View>
            <MaterialIcons name="bolt" size={22} color="#FF9800" />
          </View>
          <Text style={styles.aiTitle}>{t('aiMessage')}</Text>
          <Text style={styles.aiSubText}>{t('aiSubMessage')}</Text>
          <TouchableOpacity style={styles.aiButton}>
            <Text style={styles.aiButtonText}>{t('optimizeService')}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.activityHeader}>
          <Text style={styles.sectionLabel}>{t('recentActivity')}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>{t('viewAll')}</Text>
          </TouchableOpacity>
        </View>

        {RECENT_ACTIVITY.map((item, index) => (
          <View key={item.id}>
            <TouchableOpacity style={styles.activityItem}>
              <View style={[styles.activityIconBox, { backgroundColor: item.iconColor + '20' }]}>
                <MaterialIcons name={item.icon} size={22} color={item.iconColor} />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{t(item.titleKey)}</Text>
                <View style={styles.activityTime}>
                  <MaterialIcons name="access-time" size={12} color={Colors.textLight} />
                  <Text style={styles.activityTimeText}>{t(item.timeKey)}</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={20} color={Colors.textLight} />
            </TouchableOpacity>
            {index < RECENT_ACTIVITY.length - 1 && <View style={styles.divider} />}
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── FAB ── */}
      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="add" size={28} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 52,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBox: {
    width: 42,
    height: 42,
    backgroundColor: Colors.black,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: Colors.white,
    fontSize: 20,
  },

  // Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 12,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  profileBadge: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  statsButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Section Label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textLight,
    letterSpacing: 1,
    marginBottom: 12,
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    elevation: 1,
  },
  statCardGreen: {
    backgroundColor: '#E8F5E9',
  },
  statTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statChange: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
  },

  // Quick Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '500',
  },

  // AI Card
  aiCard: {
    backgroundColor: '#F0F4FF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#D0DEFF',
  },
  aiCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  aiDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
  },
  aiTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: 0.5,
  },
  aiTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  aiSubText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 14,
  },
  aiButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  aiButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },

  // Recent Activity
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  viewAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  activityIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  activityTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activityTimeText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});