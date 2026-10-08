import React, { useState, useMemo, useEffect, useContext } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { CATEGORIES, CATEGORY_COLORS } from '../constants/feedData';
import { JOB_STATUS } from '../constants/jobStatus';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { IP_ADDRESS, CONFIG } from '../config';
import PostCard from '../components/feed/PostCard';
import AnnouncementSlideshow from '../components/feed/AnnouncementSlideshow';
import HeaderSection from '../components/HeaderSection';
import i18n from '../locales';
import { ThemeContext } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

// ── Inline Applied Jobs View ──
function AppliedJobsView({ isDark, onViewMore, appliedJobs }) {
  const { updateJobStatus } = useAppliedJobs();
  const isSi = i18n.language === 'si';
  
  // Show only first 3 jobs in feed view
  const displayJobs = appliedJobs.slice(0, 3);

  const C = isDark
    ? { bg: '#1C1C1E', card: '#2C2C2E', text: '#F2F2F7', textSub: '#8E8E93', border: '#3A3A3C' }
    : { bg: '#F9FAFB', card: '#FFFFFF', text: '#111827', textSub: '#6B7280', border: '#E5E7EB' };

  if (appliedJobs.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: C.bg }]}>
        <View style={styles.emptyIconBg}>
          <MaterialIcons name="assignment" size={40} color="#7C3AED" />
        </View>
        <Text style={[styles.emptyTitle, { color: C.text }]}>No Applications Yet</Text>
        <Text style={[styles.emptySubtitle, { color: C.textSub }]}>
          Switch to All Jobs and apply to service requests
        </Text>
        <TouchableOpacity style={[styles.viewMoreButton, { backgroundColor: C.card, borderColor: '#7C3AED', borderWidth: 2 }]} onPress={onViewMore}>
          <View style={styles.viewMoreContent}>
            <Text style={[styles.viewMoreText, { color: '#7C3AED' }]}>View All Applied Jobs</Text>
            <MaterialIcons name="arrow-forward" size={20} color="#7C3AED" />
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.appliedList, { backgroundColor: C.bg }]}>
      {displayJobs.map((job) => {
        const status = Object.values(JOB_STATUS).find((s) => s.key === job.status) || JOB_STATUS.PENDING;
        const initials = job.customer ? job.customer.split(' ').map((n) => n[0]).join('').toUpperCase() : 'U';
        const appliedDate = new Date(job.appliedAt).toLocaleDateString('en-US', {
          day: 'numeric', month: 'short',
        });

        return (
          <View key={job.id} style={[styles.appliedCard, { backgroundColor: C.card }]}>
            <View style={[styles.appliedStatusStrip, { backgroundColor: status?.color || '#7C3AED' }]} />
            <View style={styles.appliedCardContent}>
              <View style={[styles.statusBadge, { backgroundColor: status?.bg || '#F3E8FF' }]}>
                <MaterialIcons name={status?.icon || 'info'} size={14} color={status?.color || '#7C3AED'} />
                <Text style={[styles.statusBadgeText, { color: status?.color || '#7C3AED' }]}>
                  {isSi ? status?.labelSi : status?.label}
                </Text>
              </View>

              <View style={styles.appliedHeader}>
                <View style={[styles.appliedAvatar, { backgroundColor: '#7C3AED' }]}>
                  <Text style={styles.appliedAvatarText}>{initials}</Text>
                </View>
                <View style={styles.appliedMeta}>
                  <Text style={[styles.appliedName, { color: C.text }]}>{job.customer}</Text>
                  <View style={styles.appliedMetaRow}>
                    <MaterialIcons name="location-on" size={11} color="#9CA3AF" />
                    <Text style={styles.appliedLocation}>{typeof job.location === 'object'
  ? job.location.address ||
    job.location.city ||
    job.location.district ||
    'Unknown location'
  : job.location || 'Unknown location'}</Text>
                  </View>
                </View>
                <Text style={[styles.appliedBudget, { color: C.text }]}>{job.budget}</Text>
              </View>

              <Text style={[styles.appliedDesc, { color: C.textSub }]} numberOfLines={2}>
                {job.description}
              </Text>

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
            </View>
          </View>
        );
      })}
      
      {/* Always show the link to the full applied-jobs page. */}
      <TouchableOpacity
          style={[styles.viewMoreButton, { 
            backgroundColor: isDark ? '#2C2C2E' : '#FFFFFF',
            borderColor: '#7C3AED',
            borderWidth: 2,
          }]}
          onPress={onViewMore}
          activeOpacity={0.7}
        >
          <View style={styles.viewMoreContent}>
            <Text style={[styles.viewMoreText, { color: '#7C3AED' }]}>
              View All Applied Jobs
            </Text>
            <View style={styles.viewMoreBadge}>
              <Text style={styles.viewMoreBadgeText}>{appliedJobs.length}</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color="#7C3AED" />
          </View>
      </TouchableOpacity>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────
export default function NewsFeedScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const { isDark } = useContext(ThemeContext);
  const { appliedJobs, applyToJob, isApplied } = useAppliedJobs();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showApplied, setShowApplied] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [applyingId, setApplyingId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [viewerId, setViewerId] = useState(null);
  const [userName, setUserName] = useState('Kasun');
  const [userAvatar, setUserAvatar] = useState(null);

  const C = isDark
    ? { bg: '#0F0F0F', card: '#1C1C1E', text: '#F2F2F7', textSub: '#8E8E93', border: '#2C2C2E', subCard: '#2A2A2A' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111827', textSub: '#6B7280', border: '#E5E7EB', subCard: '#F9FAFB' };

  // Category icons mapping
  const getCategoryIcon = (category) => {
    const icons = {
      'All': 'apps',
      'Plumbing': 'plumbing',
      'Electrical': 'bolt',
      'Cleaning': 'cleaning-services',
      'Painting': 'brush',
      'Gardening': 'grass',
      'Carpentry': 'handyman',
      'Moving': 'local-shipping',
      'Renovation': 'construction',
      'Maintenance': 'build',
      'Repair': 'build',
      'default': 'category',
    };
    return icons[category] || icons.default;
  };

  // Load User Info
  useEffect(() => {
    const loadUserData = async () => {
      const name = await AsyncStorage.getItem('userName');
      const avatar = await AsyncStorage.getItem('userAvatar');
      if (name) setUserName(name);
      if (avatar) setUserAvatar(avatar);
    };
    loadUserData();
  }, []);

  // Live real-time notification polling
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

  // Fetch posts from backend
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        const storedProviderId = (await AsyncStorage.getItem('userId')) || null;
        if (mounted) setViewerId(storedProviderId);

        if (!token) {
          Alert.alert('Error', 'No authentication token. Please login again.');
          setLoadingPosts(false);
          return;
        }

        const url = `${CONFIG.SEEKER_SERVICE_URL}/posts/${storedProviderId ? `?viewerId=${storedProviderId}` : ''}`;
        const res = await fetch(url, {
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
          const mapped = data.posts.map((p) => {
            const userObj = p.user || p.poster || p.seeker || p.author || {};
            const customerName =
              userObj.name ||
              userObj.fullName ||
              (userObj.firstName ? `${userObj.firstName} ${userObj.lastName || ''}`.trim() : null) ||
              p.userName ||
              p.customerName ||
              'Unknown User';

            const customerAvatar = userObj.avatar || userObj.profilePicture || userObj.image || null;

            return {
              id: p._id,
              _id: p._id,
              seekerId: p.seekerId || p.userId,
              userId: p.userId || p.seekerId,
              title: p.title || '',
              customer: customerName,
              avatar: customerAvatar,
              customerId: userObj._id || p.seekerId || p.userId || null,
              poster: userObj,
              user: userObj,
              postImage: p.image || null,
              image: p.image || '',
              location:
                (typeof p.location === 'string' ? p.location : '') ||
                p.location?.city ||
                p.location?.district ||
                p.location?.address ||
                userObj.district ||
                userObj.city ||
                'Location N/A',
              locationAddress: p.location?.address || '',
              locationDistrict: p.location?.district || userObj.district || '',
              locationCity: p.location?.city || userObj.city || '',
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
              applied: Number(p.appliedCount ?? 0),
              appliedCount: Number(p.appliedCount ?? 0),
              applicants: p.applicants || p.appliedBy || [],
              isOwner: p.isOwner || false,
              views: p.views || 0,
              urgent: (p.urgency || '').toLowerCase() === 'high',
              aiMatch: p.aiMatch || null,
              lang: 'en',
            };
          });
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

  // Sort posts: Most viewed first, then least applied, then by date
  const sortedPosts = useMemo(() => {
    return [...posts].sort((a, b) => {
      // First sort by views (highest first)
      if (a.views !== b.views) {
        return (b.views || 0) - (a.views || 0);
      }
      // Then by applied count (lowest first - less applied posts should show up)
      if (a.appliedCount !== b.appliedCount) {
        return (a.appliedCount || 0) - (b.appliedCount || 0);
      }
      // Finally by date (newest first)
      return new Date(b.postedAt) - new Date(a.postedAt);
    });
  }, [posts]);

  const filteredPosts = useMemo(() =>
    sortedPosts.filter((post) => {
      const matchCat = selectedCategory === 'All' || 
        post.category === selectedCategory ||
        (post.tags && post.tags.includes(selectedCategory));
      const lowerSearch = search.toLowerCase();
      const matchSearch =
        (post.description || '').toLowerCase().includes(lowerSearch) ||
        (post.category || '').toLowerCase().includes(lowerSearch) ||
        (post.location || '').toLowerCase().includes(lowerSearch) ||
        (post.tags && post.tags.some(tag => tag.toLowerCase().includes(lowerSearch)));
      return matchCat && matchSearch;
    }),
    [search, selectedCategory, sortedPosts]
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
    const params = { post: { ...post, _id: post._id || post.id } };
    const rootNavigation = navigation.getParent()?.getParent();
    (rootNavigation || navigation).navigate('ProviderPostDetail', params);
  };

  // Navigate to Applied Jobs Screen
  const handleViewMoreApplied = () => {
    console.log('Navigating to AppliedJobs...'); // Debug log
    // Try different navigation approaches
    try {
      // Try root navigation first
      const rootNavigation = navigation.getParent()?.getParent();
      if (rootNavigation) {
        rootNavigation.navigate('AppliedJobs');
      } else {
        // Fallback to current navigation
        navigation.navigate('AppliedJobs');
      }
    } catch (error) {
      console.log('Navigation error:', error);
      // Alternative: navigate through the stack
      navigation.getParent()?.navigate('AppliedJobs');
    }
  };

  // Get all unique categories from posts including tags
  const allCategories = useMemo(() => {
    const categories = new Set(['All']);
    posts.forEach(post => {
      if (post.category) categories.add(post.category);
      if (post.tags && Array.isArray(post.tags)) {
        post.tags.forEach(tag => categories.add(tag));
      }
    });
    return Array.from(categories);
  }, [posts]);

  // Keep the category filter simple and independent of the posts returned by the API.
  const quickCategories = ['All', 'Home Service', 'Plumbing', 'Electrical', 'Carpentry', 'Cleaning'];

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Profile Header with Sidebar */}
      <HeaderSection 
        navigation={navigation}
        userName={userName}
        avatarUrl={userAvatar}
        search={search}
        onSearchChange={setSearch}
        unreadCount={unreadCount}
        onInboxPress={() => navigation.navigate('InboxScreen')}
      />

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Slideshow - Top */}
        <View style={styles.slideshowContainer}>
          <AnnouncementSlideshow />
        </View>

        {/* Quick Categories - Horizontal Scrolling with Tag Matching */}
        <View style={styles.quickCategoriesWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickCategoriesScroll}
          >
            {quickCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              const color = cat === 'All' ? '#7C3AED' : (CATEGORY_COLORS[cat] || '#7C3AED');
              const icon = getCategoryIcon(cat);
              
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setSelectedCategory(cat)}
                  style={[
                    styles.quickCategoryChip,
                    isActive && styles.quickCategoryChipActive,
                    !isActive && {
                      backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  {isActive ? (
                    <LinearGradient
                      colors={[color, color + 'BB']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={styles.chipGradient}
                    >
                      <MaterialIcons name={icon} size={17} color="#FFF" />
                      <Text style={[styles.quickCategoryText, styles.quickCategoryTextActive, { color: '#FFF' }]}>
                        {cat}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <>
                      <MaterialIcons name={icon} size={17} color={isDark ? '#94A3B8' : '#64748B'} />
                      <Text style={[styles.quickCategoryText, { color: isDark ? '#CBD5E1' : '#374151' }]}>{cat}</Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Toggle: All Jobs vs Applied - Modern Design */}
        <View style={styles.toggleSection}>
          <Surface style={[styles.toggleContainer, { 
            backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6',
            borderColor: isDark ? '#3A3A3C' : '#E5E7EB',
          }]}>
            <TouchableOpacity
              style={[
                styles.toggleOption, 
                !showApplied && styles.toggleOptionActive,
                !showApplied && { backgroundColor: '#7C3AED' }
              ]}
              onPress={() => setShowApplied(false)}
            >
              <MaterialIcons 
                name="apps" 
                size={18} 
                color={!showApplied ? '#FFFFFF' : (isDark ? '#8E8E93' : '#6B7280')} 
              />
              <Text style={[
                styles.toggleOptionText, 
                !showApplied && styles.toggleOptionTextActive,
                !showApplied && { color: '#FFFFFF' }
              ]}>
                All Jobs
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleOption, 
                showApplied && styles.toggleOptionActive,
                showApplied && { backgroundColor: '#7C3AED' }
              ]}
              onPress={() => setShowApplied(true)}
            >
              <MaterialIcons 
                name="assignment-turned-in" 
                size={18} 
                color={showApplied ? '#FFFFFF' : (isDark ? '#8E8E93' : '#6B7280')} 
              />
              <Text style={[
                styles.toggleOptionText, 
                showApplied && styles.toggleOptionTextActive,
                showApplied && { color: '#FFFFFF' }
              ]}>
                Applied
              </Text>
              {appliedJobs.length > 0 && (
                <View style={[
                  styles.toggleCount,
                  { backgroundColor: showApplied ? 'rgba(255,255,255,0.25)' : '#7C3AED' }
                ]}>
                  <Text style={[
                    styles.toggleCountText,
                    { color: showApplied ? '#FFFFFF' : '#FFFFFF' }
                  ]}>{appliedJobs.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          </Surface>
        </View>

        {/* Applied View vs Feed View */}
        {showApplied ? (
          <AppliedJobsView 
            isDark={isDark} 
            onViewMore={handleViewMoreApplied}
            appliedJobs={appliedJobs}
          />
        ) : (
          <View style={styles.contentArea}>
            {/* Section Header */}
            <View style={[styles.recentSection, { paddingHorizontal: 20 }]}>
              <View style={styles.sectionHeader}>
                <View>
                  <View style={styles.sectionAccentRow}>
                    <LinearGradient colors={['#7C3AED', '#4F46E5']} style={styles.sectionAccent} />
                    <Text style={[styles.sectionTitle, { color: C.text }]}>Recent Opportunities</Text>
                  </View>
                  <Text style={[styles.sectionSubtitle, { color: C.textSub }]}>
                    {filteredPosts.length} service requests available
                  </Text>
                </View>
                <View style={[styles.resultBadge, { backgroundColor: isDark ? '#1E293B' : '#F3E8FF' }]}>
                  <Text style={[styles.resultBadgeText, { color: isDark ? '#A78BFA' : '#7C3AED' }]}>
                    {filteredPosts.length} jobs
                  </Text>
                </View>
              </View>
            </View>

            {/* Feed */}
            <View style={styles.feedContainer}>
              {feedItems.length > 0 ? (
                feedItems.map((item) =>
                  item.type === 'post' ? (
                    <PostCard
                      key={item.data.id}
                      post={item.data}
                      onApply={handleApply}
                      applying={applyingId === item.data.id}
                    />
                  ) : null
                )
              ) : (
                <View style={[styles.noJobsContainer, { backgroundColor: C.card }]}>
                  <MaterialIcons name="check-circle" size={64} color="#C4B5FD" />
                  <Text style={[styles.noJobsTitle, { color: C.text }]}>All caught up!</Text>
                  <Text style={[styles.noJobsText, { color: C.textSub }]}>No service requests found</Text>
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
  container: { flex: 1 },
  scrollContent: { paddingBottom: 20 },

  // Slideshow
  slideshowContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 16,
  },

  // Quick Categories
  quickCategoriesWrapper: {
    marginBottom: 16,
  },
  quickCategoriesScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  quickCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1,
    position: 'relative',
  },
  quickCategoryChipActive: {
    borderWidth: 0,
    elevation: 4,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  chipGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    margin: -1,
  },
  quickCategoryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickCategoryTextActive: {
    fontWeight: '700',
  },

  // Toggle - Modern Design
  toggleSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 11,
  },
  toggleOptionActive: {
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  toggleOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleOptionTextActive: {
    fontWeight: '700',
  },
  toggleCount: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  toggleCountText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // Content
  contentArea: { flex: 1 },
  recentSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionAccentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionAccent: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
  },
  resultBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  resultBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  feedContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  noJobsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    borderRadius: 20,
  },
  noJobsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  noJobsText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Applied Jobs
  appliedList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  appliedCard: {
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    marginBottom: 4,
  },
  appliedStatusStrip: { width: 4 },
  appliedCardContent: { flex: 1, padding: 14 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  appliedHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  appliedAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appliedAvatarText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  appliedMeta: { flex: 1 },
  appliedName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  appliedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  appliedLocation: { fontSize: 11, color: '#9CA3AF' },
  appliedBudget: { fontSize: 14, fontWeight: 'bold' },
  appliedDesc: { fontSize: 13, lineHeight: 19, marginBottom: 12 },
  appliedFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  appliedDateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  appliedDate: { fontSize: 12, color: '#9CA3AF' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  actionBtnText: { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    paddingTop: 60,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },

  // View More Button - ENHANCED STYLES
  viewMoreButton: {
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  viewMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  viewMoreText: {
    fontSize: 15,
    fontWeight: '700',
  },
  viewMoreBadge: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 24,
    alignItems: 'center',
  },
  viewMoreBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
