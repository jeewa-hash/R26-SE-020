import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { CATEGORIES } from '../constants/feedData';
import { JOB_STATUS } from '../constants/jobStatus';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { IP_ADDRESS } from '../config';
import PostCard from '../components/feed/PostCard';
import AnnouncementSlideshow from '../components/feed/AnnouncementSlideshow';
import MidAnnouncementCard from '../components/feed/MidAnnouncementCard';
import i18n from '../locales';
import { CONFIG } from '../config';

const { width } = Dimensions.get('window');

// ── Inline Applied Jobs View (replaces AppliedJobsScreen import) ──
function AppliedJobsView() {
  const { appliedJobs, updateJobStatus } = useAppliedJobs();
  const isSi = i18n.language === 'si';

  const cycleStatus = (job) => {
    const statuses = Object.values(JOB_STATUS).map((s) => s.key);
    const currentIndex = statuses.indexOf(job.status);
    const next = statuses[(currentIndex + 1) % statuses.length];
    updateJobStatus(job.id, next);
  };

  if (appliedJobs.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <MaterialIcons name="assignment" size={40} color="#7C3AED" />
        </View>
        <Text style={styles.emptyTitle}>No Applications Yet</Text>
        <Text style={styles.emptySubtitle}>
          Switch to All Jobs and apply to service requests
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.appliedList}>
      {appliedJobs.map((job) => {
        const status = Object.values(JOB_STATUS).find((s) => s.key === job.status);
        const initials = job.customer.split(' ').map((n) => n[0]).join('').toUpperCase();
        const appliedDate = new Date(job.appliedAt).toLocaleDateString('en-US', {
          day: 'numeric', month: 'short',
        });

        return (
          <View key={job.id} style={styles.appliedCard}>
            <View style={[styles.appliedStatusStrip, { backgroundColor: status.color }]} />
            <View style={styles.appliedCardContent}>

              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                <MaterialIcons name={status.icon} size={14} color={status.color} />
                <Text style={[styles.statusBadgeText, { color: status.color }]}>
                  {isSi ? status.labelSi : status.label}
                </Text>
              </View>

              {/* Customer */}
              <View style={styles.appliedHeader}>
                <View style={[styles.appliedAvatar, { backgroundColor: '#7C3AED' }]}>
                  <Text style={styles.appliedAvatarText}>{initials}</Text>
                </View>
                <View style={styles.appliedMeta}>
                  <Text style={styles.appliedName}>{job.customer}</Text>
                  <View style={styles.appliedMetaRow}>
                    <MaterialIcons name="location-on" size={11} color="#9CA3AF" />
                    <Text style={styles.appliedLocation}>{job.location}</Text>
                  </View>
                </View>
                <Text style={styles.appliedBudget}>{job.budget}</Text>
              </View>

              {/* Description */}
              <Text style={styles.appliedDesc} numberOfLines={2}>
                {job.description}
              </Text>

              {/* Footer */}
              <View style={styles.appliedFooter}>
                <View style={styles.appliedDateRow}>
                  <MaterialIcons name="access-time" size={12} color="#9CA3AF" />
                  <Text style={styles.appliedDate}>Applied {appliedDate}</Text>
                </View>

                {job.status === 'selected' && (
                  <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#16A34A' }]}>
                    <MaterialIcons name="chat" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Connect</Text>
                  </TouchableOpacity>
                )}
                {job.status === 'pending' && (
                  <View style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}>
                    <MaterialIcons name="schedule" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>Pending</Text>
                  </View>
                )}
                {(job.status === 'taken' || job.status === 'expired') && (
                  <View style={[styles.actionBtn, { backgroundColor: '#6B7280' }]}>
                    <MaterialIcons name="cancel" size={13} color="#fff" />
                    <Text style={styles.actionBtnText}>
                      {job.status === 'taken' ? 'Taken' : 'Expired'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Dev simulate */}
              <TouchableOpacity
                style={styles.devBtn}
                onPress={() => cycleStatus(job)}
              >
                <Text style={styles.devBtnText}>🔄 Simulate Status (Dev)</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────
export default function NewsFeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { appliedJobs, applyToJob, isApplied } = useAppliedJobs();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showApplied, setShowApplied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [applyingId, setApplyingId] = useState(null);

  // Live real-time notification polling (every 3 seconds)
  useEffect(() => {
    let isMounted = true;

    const fetchNotificationsCount = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const userId = (await AsyncStorage.getItem('userId')) || '69fc31f3cfe41c4d62e6f9ee';

        let count = 0;
        try {
          const res = await fetch(`http://${IP_ADDRESS}:5001/api/inquiries/notifications/${userId}`);
          const d = await res.json();
          if (res.ok && d.data) {
            count = d.data.filter((n) => !n.isRead).length;
          }
        } catch (e) {}

        if (count === 0 && token) {
          try {
            const authRes = await fetch(`http://${IP_ADDRESS}:4003/notifications`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            const authD = await authRes.json();
            if (authRes.ok && Array.isArray(authD)) {
              count = authD.filter((n) => !n.isRead).length;
            }
          } catch (e) {}
        }

        if (isMounted) {
          setUnreadCount(count);
        }
      } catch (err) {
        // silent
      }
    };

    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);

  // Fetch posts from backend and map to UI shape
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        // Get token from AsyncStorage
        const token = await AsyncStorage.getItem('userToken');
        
        if (!token) {
          Alert.alert('Error', 'No authentication token. Please login again.');
          setLoadingPosts(false);
          return;
        }

        const res = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/posts/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();
        if (!mounted) return;
        if (data && data.posts) {
          const mapped = data.posts.map((p) => ({
            id: p._id,
            _id: p._id,
            seekerId: p.seekerId,
            userId: p.userId,
            title: p.title || '',
            customer: p.user?.name || 'Unknown',
            customerId: p.user?._id || null,
            image: p.image || '',
            location: p.location?.city || p.location?.district || p.location?.address || '',
            locationAddress: p.location?.address || '',
            locationDistrict: p.location?.district || '',
            locationCity: p.location?.city || '',
            locationLat: p.location?.lat || null,
            locationLng: p.location?.lng || null,
            time: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
            postedAt: p.createdAt || null,
            updatedAt: p.updatedAt || null,
            category: p.category || 'Other',
            description: p.description || '',
            tags: p.tags || [],
            urgency: p.urgency || 'medium',
            budget: p.budget || '',
            applied: p.appliedCount || 0,
            appliedCount: p.appliedCount || 0,
            views: p.views || 0,
            urgent: (p.urgency || '').toLowerCase() === 'high',
            aiMatch: p.aiMatch || null,
            lang: 'en',
          }));
          setPosts(mapped);
        } else {
          setPosts([]);
        }
      } catch (err) {
        Alert.alert('Error', `Failed to load posts\n${err.message}`);
        setPosts([]);
      } finally {
        setLoadingPosts(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  const filteredPosts = useMemo(() =>
    posts.filter((post) => {
      const matchCat = selectedCategory === 'All' || post.category === selectedCategory;
      const lowerSearch = search.toLowerCase();
      const matchSearch =
        (post.description || '').toLowerCase().includes(lowerSearch) ||
        (post.category || '').toLowerCase().includes(lowerSearch) ||
        (post.location || '').toLowerCase().includes(lowerSearch);
      return matchCat && matchSearch;
    }),
    [search, selectedCategory, posts]
  );

  const feedItems = useMemo(() => {
    const items = [];
    filteredPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      if ((index + 1) % 2 === 0 && index !== filteredPosts.length - 1) {
        items.push({ type: 'mid' });
      }
    });
    return items;
  }, [filteredPosts]);

  const handleApply = async (post) => {
    if (applyingId || isApplied(post.id)) return;

    setApplyingId(post.id);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const providerId = (await AsyncStorage.getItem('userId')) || null;

      let backendUpdated = false;
      let newAppliedCount = (post.appliedCount || 0) + 1;

      try {
        const res = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/posts/${post.id}/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            providerId,
            amount: 1,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          backendUpdated = true;
          if (data.appliedCount !== undefined) newAppliedCount = data.appliedCount;
        }
      } catch (apiErr) {
        console.warn('Apply API failed, continuing local:', apiErr.message);
      }

      const contextOk = applyToJob({
        ...post,
        appliedCount: newAppliedCount,
      });

      setPosts((prev) =>
        prev
          .map((p) =>
            p.id === post.id
              ? { ...p, applied: newAppliedCount, appliedCount: newAppliedCount }
              : p
          )
          .sort((a, b) => {
            const pa = a.appliedCount || 0;
            const pb = b.appliedCount || 0;
            if (pb !== pa) return pb - pa;
            const ta = a.postedAt ? new Date(a.postedAt).getTime() : 0;
            const tb = b.postedAt ? new Date(b.postedAt).getTime() : 0;
            return tb - ta;
          })
      );

      if (contextOk) {
        Alert.alert(
          'Application Sent!',
          backendUpdated
            ? `Your application has been submitted. This job now has ${newAppliedCount} applicants.`
            : `Your application was saved locally (offline mode). It has ${newAppliedCount} applicants.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert('Error', `Failed to apply: ${err.message}`);
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, Kasun 👋</Text>
              <Text style={styles.headerTitle}>{t('serviceRequests')}</Text>
              <View style={styles.statsBadge}>
                <MaterialIcons name="work" size={14} color="#7C3AED" />
                <Text style={styles.statsText}>{filteredPosts.length} available near you</Text>
              </View>
            </View>
          
            {/* Inbox / Chat Button */}
            <TouchableOpacity 
              style={styles.actionBtn}
              onPress={() => navigation.navigate('InboxScreen')}
            >
              <View style={styles.iconWrapper}>
                <MaterialIcons name="chat-bubble-outline" size={24} color="#1F2937" />
                <View style={styles.unreadBadge}>
                  <Text style={styles.badgeText}></Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Notification Bell Button with live Badge */}
            <TouchableOpacity
              style={styles.notificationBtn}
              onPress={() => navigation.navigate('Notifications')}
            >
              <MaterialIcons name="notifications-none" size={24} color="#1F2937" />
              {unreadCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Toggle */}
        <View style={styles.toggleSection}>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleOption, !showApplied && styles.toggleOptionActive]}
              onPress={() => setShowApplied(false)}
            >
              <MaterialIcons name="apps" size={18} color={!showApplied ? '#fff' : '#6B7280'} />
              <Text style={[styles.toggleOptionText, !showApplied && styles.toggleOptionTextActive]}>
                All Jobs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleOption, showApplied && styles.toggleOptionActive]}
              onPress={() => setShowApplied(true)}
            >
              <MaterialIcons name="assignment-turned-in" size={18} color={showApplied ? '#fff' : '#6B7280'} />
              <Text style={[styles.toggleOptionText, showApplied && styles.toggleOptionTextActive]}>
                Applied
              </Text>
              {appliedJobs.length > 0 && (
                <View style={styles.toggleCount}>
                  <Text style={styles.toggleCountText}>{appliedJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Applied View */}
        {showApplied ? (
          <AppliedJobsView />   // ← inline component, no navigation needed
        ) : (
          <View style={styles.contentArea}>

            {/* Search */}
            <View style={styles.searchWrapper}>
              <Searchbar
                placeholder="Search services, categories..."
                value={search}
                onChangeText={setSearch}
                style={styles.searchBar}
                inputStyle={styles.searchInput}
                iconColor="#9CA3AF"
              />
            </View>

            {/* Categories */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesScroll}
              style={{ marginBottom: 20 }}
            >
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.categoryChip,
                    selectedCategory === cat && styles.categoryChipActive,
                  ]}
                >
                  <Text style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Slideshow */}
            <View style={styles.slideshowContainer}>
              <AnnouncementSlideshow />
            </View>

            {/* Section Header */}
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Recent Opportunities</Text>
                  <Text style={styles.sectionSubtitle}>Latest service requests near you</Text>
                </View>
                <View style={styles.resultBadge}>
                  <Text style={styles.resultBadgeText}>{filteredPosts.length} jobs</Text>
                </View>
              </View>
            </View>

            {/* Feed */}
            <View style={styles.feedContainer}>
              {feedItems.length > 0 ? (
                feedItems.map((item, index) =>
                  item.type === 'post'
                    ? (
                      <PostCard
                        key={item.data.id}
                        post={item.data}
                        onApply={handleApply}
                        applying={applyingId === item.data.id}
                      />
                    )
                    : <MidAnnouncementCard key={`mid_${index}`} />
                )
              ) : (
                <View style={styles.noJobsContainer}>
                  <MaterialIcons name="check-circle" size={64} color="#C4B5FD" />
                  <Text style={styles.noJobsTitle}>All caught up!</Text>
                  <Text style={styles.noJobsText}>No service requests found</Text>
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  headerSection: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingHorizontal: 20, paddingBottom: 24,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  greeting: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1F2937', marginBottom: 8 },
  statsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, alignSelf: 'flex-start',
  },
  statsText: { fontSize: 13, fontWeight: '500', color: '#7C3AED' },
  notificationBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    elevation: 4,
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  notificationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // Toggle
  toggleSection: { paddingHorizontal: 20, marginTop: 20, marginBottom: 16 },
  toggleContainer: {
    flexDirection: 'row', backgroundColor: '#F3F4F6',
    borderRadius: 14, padding: 4,
  },
  toggleOption: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 11,
  },
  toggleOptionActive: {
    backgroundColor: '#7C3AED',
    elevation: 2, shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  toggleOptionText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleOptionTextActive: { color: '#FFFFFF' },
  toggleCount: {
    backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  toggleCountText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },

  // Content
  contentArea: { flex: 1 },
  searchWrapper: { paddingHorizontal: 20, marginBottom: 16 },
  searchBar: {
    borderRadius: 16, backgroundColor: '#FFFFFF',
    elevation: 0, borderWidth: 1, borderColor: '#E5E7EB',
  },
  searchInput: { fontSize: 14 },
  categoriesScroll: { paddingHorizontal: 20, gap: 10 },
  categoryChip: {
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 30, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#7C3AED', borderColor: '#7C3AED',
    elevation: 2, shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4,
  },
  categoryChipText: { fontSize: 13, fontWeight: '500', color: '#4B5563' },
  categoryChipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  slideshowContainer: { paddingHorizontal: 20, marginBottom: 24 },
  recentSection: { paddingHorizontal: 20, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  sectionSubtitle: { fontSize: 13, color: '#6B7280' },
  resultBadge: { backgroundColor: '#F3E8FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  resultBadgeText: { fontSize: 12, fontWeight: '600', color: '#7C3AED' },
  feedContainer: { paddingHorizontal: 20, gap: 16 },
  noJobsContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  noJobsTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', marginTop: 16, marginBottom: 8 },
  noJobsText: { fontSize: 14, color: '#6B7280', textAlign: 'center' },

  // Applied Jobs
  appliedList: { padding: 20, gap: 12 },
  appliedCard: {
    backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
    flexDirection: 'row', elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, marginBottom: 4,
  },
  appliedStatusStrip: { width: 4 },
  appliedCardContent: { flex: 1, padding: 14 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 5, marginBottom: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  appliedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  appliedAvatar: {
    width: 38, height: 38, borderRadius: 19,
    justifyContent: 'center', alignItems: 'center',
  },
  appliedAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  appliedMeta: { flex: 1 },
  appliedName: { fontSize: 14, fontWeight: 'bold', color: '#111', marginBottom: 2 },
  appliedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  appliedLocation: { fontSize: 11, color: '#9CA3AF' },
  appliedBudget: { fontSize: 14, fontWeight: 'bold', color: '#111' },
  appliedDesc: { fontSize: 13, color: '#6B7280', lineHeight: 19, marginBottom: 12 },
  appliedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appliedDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appliedDate: { fontSize: 12, color: '#9CA3AF' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  actionBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },
  devBtn: {
    marginTop: 10, padding: 6, borderRadius: 8,
    backgroundColor: '#F8FAFC', alignItems: 'center',
  },
  devBtnText: { fontSize: 11, color: '#9CA3AF' },

  // Empty
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: 60 },
  emptyIconBg: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#F3E8FF',
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 21 },
});