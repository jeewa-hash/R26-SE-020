import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Platform,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS, CONFIG } from '../config';
import { getPostById, applyPost } from '../services/seekerApi';
import { useAppliedJobs } from '../context/AppliedJobsContext';
import { useTheme } from '../context/ThemeContext';
import { JOB_STATUS } from '../constants/jobStatus';

const { width } = Dimensions.get('window');

const getAvatarColor = (name) => {
  const colors = [
    '#2563EB', '#7C3AED', '#059669', '#DC2626',
    '#D97706', '#0891B2', '#BE185D', '#4F46E5',
  ];
  let hash = 0;
  for (let i = 0; i < (name || 'U').length; i++) hash += (name || 'U').charCodeAt(i);
  return colors[hash % colors.length];
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const resolveImage = (post, fallback) => {
  if (!post) return fallback;
  const raw = post.postImage || post.image;
  if (!raw) return fallback;
  if (raw.startsWith('http')) return raw;
  return `${CONFIG.SEEKER_SERVICE_URL}/${String(raw).replace(/\\/g, '/')}`;
};

const resolvePosterName = (p) => {
  if (!p) return 'Unknown User';
  return (
    p.poster?.name ||
    p.user?.name ||
    p.user?.fullName ||
    p.user?.userName ||
    p.customer ||
    'Unknown User'
  );
};

const resolvePosterAvatar = (p) => {
  if (!p) return null;
  const raw =
    p.poster?.profilePicture ||
    p.user?.profilePicture ||
    p.user?.profileImage ||
    p.user?.avatar ||
    null;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('data:')) return raw;
  return `${CONFIG.AUTH_SERVICE_URL}/${String(raw).replace(/\\/g, '/')}`;
};

export default function ProviderPostDetailScreen({ navigation, route }) {
  const routePost = route.params?.post || route.params?.postData || {};
  const postId = routePost._id || routePost.id || null;

  const { isDark } = useTheme();
  const { applyToJob, isApplied, markApplied, updateJobStatus } = useAppliedJobs();

  const [post, setPost] = useState(routePost);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [viewerId, setViewerId] = useState(null);
  const [viewerName, setViewerName] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  const [applyVisible, setApplyVisible] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [note, setNote] = useState('');

  const C = isDark
    ? { bg: '#0F0F14', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', chipBg: '#2d3561' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#1F2937', textSub: '#6B7280', border: '#E5E7EB', chipBg: '#F3E8FF' };

  // ─── Viewer identity ───────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const pid = await AsyncStorage.getItem('userId');
        const pname =
          (await AsyncStorage.getItem('userName')) ||
          (await AsyncStorage.getItem('userFullName')) ||
          '';
        setViewerId(pid);
        setViewerName(pname);
      } catch (e) {}
    })();
  }, []);

  // ─── Fetch latest post with viewerId ───────────────────────
  useEffect(() => {
    if (!postId) return;
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        let data;
        try {
          const res = await getPostById(postId, viewerId);
          data = res;
        } catch (err) {
          // Fallback: raw fetch
          const token = await AsyncStorage.getItem('userToken');
          const url = `${CONFIG.SEEKER_SERVICE_URL}/posts/${postId}${viewerId ? `?viewerId=${viewerId}` : ''}`;
          const res = await fetch(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          data = await res.json();
        }
        if (!mounted) return;
        if (data && data.success && data.post) {
          const p = data.post;
          setPost({
            ...routePost,
            ...p,
            id: p._id || p.id || postId,
            _id: p._id || postId,
            appliedCount: Number(p.appliedCount ?? 0),
            applicants: p.applicants || p.appliedBy || [],
            isOwner: p.isOwner || false,
          });
          setIsOwner(Boolean(p.isOwner));
        } else if (data && data.posts && data.posts[0]) {
          // Some endpoints wrap in posts array
          const p = data.posts[0];
          setPost({
            ...routePost,
            ...p,
            id: p._id || p.id || postId,
            _id: p._id || postId,
            appliedCount: Number(p.appliedCount ?? 0),
            applicants: p.applicants || p.appliedBy || [],
            isOwner: Boolean(p.isOwner),
          });
          setIsOwner(Boolean(p.isOwner));
        }
      } catch (err) {
        console.warn('Detail fetch fail, using route post', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [postId, viewerId]);

  // ─── Derived ───────────────────────────────────────────────
  const posterName = useMemo(() => resolvePosterName(post), [post]);
  const posterAvatar = useMemo(() => resolvePosterAvatar(post), [post]);
  const coverImg = useMemo(
    () => resolveImage(post, 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=800'),
    [post]
  );
  const appliedCount = Number(post.appliedCount ?? (post.applicants?.length ?? 0));
  const alreadyApplied = isApplied(postId || post.id);
  const ownerMatch =
    viewerId &&
    post &&
    (String(viewerId) === String(post.userId || '') ||
      String(viewerId) === String(post.seekerId || '') ||
      String(viewerId) === String(post.customerId || ''));
  const owner = isOwner || ownerMatch;

  const urgencyStyles = {
    low: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Low Priority' },
    medium: { bg: '#FEF3C7', color: '#B45309', label: 'Medium' },
    high: { bg: '#FEE2E2', color: '#DC2626', label: '🔥 High Priority' },
  };
  const urgency = urgencyStyles[post.urgency] || urgencyStyles.medium;

  // ─── Apply via API ─────────────────────────────────────────
  const submitApply = async () => {
    if (!viewerId) {
      Alert.alert('Error', 'Provider ID not found, please login again.');
      return;
    }
    setApplying(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const payload = {
        providerId: viewerId,
        applicantId: viewerId,
        applicantName: viewerName || undefined,
        bidAmount: bidAmount ? Number(bidAmount) : undefined,
        note: note || undefined,
      };

      let result = null;
      try {
        result = await applyPost(postId || post.id, payload);
      } catch (err) {
        const res = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/posts/${postId || post.id}/apply`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(payload),
        });
        if (res.ok) result = await res.json();
      }

      const newCount = Number(result?.appliedCount ?? (appliedCount + 1));
      setPost((prev) => ({
        ...prev,
        appliedCount: newCount,
      }));
      applyToJob({
        ...post,
        id: postId || post.id,
        appliedCount: newCount,
      });
      if (markApplied) markApplied(postId || post.id);

      setApplyVisible(false);
      setBidAmount('');
      setNote('');
      Alert.alert(
        '✅ Application Submitted!',
        `Your offer has been sent to ${posterName}. ${
          bidAmount ? `\nBid: LKR ${Number(bidAmount).toLocaleString()}` : ''
        }`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      console.warn(err);
      Alert.alert('Error', `Failed to apply: ${err.message}`);
    } finally {
      setApplying(false);
    }
  };

  const openApply = () => {
    if (alreadyApplied) return;
    setApplyVisible(true);
  };

  // ───────────────────────────────────────────────────────────
  //  Render
  // ───────────────────────────────────────────────────────────
  if (loading && !post.title) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
        <LinearGradient
          colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Request</Text>
          <View style={{ width: 40 }} />
        </LinearGradient>
        <View style={styles.loadWrap}>
          <ActivityIndicator size="large" color="#7C3AED" />
          <Text style={{ color: C.textSub, marginTop: 12 }}>Loading post details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDark ? '#1a1a2e' : '#667eea'}
      />

      {/* Header */}
      <LinearGradient
        colors={isDark ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Service Request</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>

        {/* Cover image */}
        <View style={styles.coverWrap}>
          <Image source={{ uri: coverImg }} style={styles.coverImage} />
          <View style={styles.coverOverlay} />
          <View style={[styles.urgencyOverlayBadge, { backgroundColor: urgency.bg }]}>
            <MaterialIcons
              name={post.urgency === 'high' ? 'priority-high' : post.urgency === 'low' ? 'low-priority' : 'flag'}
              size={12}
              color={urgency.color}
            />
            <Text style={[styles.urgencyOverlayText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: -20 }}>
          {/* Poster header card */}
          <View style={[styles.posterCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.posterRow}>
              <View style={[styles.posterAvatar, { backgroundColor: posterAvatar ? 'transparent' : getAvatarColor(posterName) }, !posterAvatar && { overflow: 'hidden' }]}>
                {posterAvatar ? (
                  <Image
                    source={{ uri: posterAvatar }}
                    style={{ width: '100%', height: '100%', borderRadius: 24 }}
                    defaultSource={{ uri: `https://randomuser.me/api/portraits/lego/${(posterName.length % 10) + 1}.jpg` }}
                  />
                ) : (
                  <Text style={styles.posterAvatarText}>{getInitials(posterName)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.posterName, { color: C.text }]}>{posterName}</Text>
                <View style={styles.posterMetaRow}>
                  <MaterialIcons name="place" size={13} color="#8B5CF6" />
                  <Text style={[styles.posterMeta, { color: C.textSub }]}>
                    {post.poster?.district || post.locationDistrict || post.locationCity || post.location || 'Unknown location'}
                  </Text>
                </View>
                <View style={styles.posterMetaRow}>
                  <MaterialIcons name="schedule" size={13} color="#8B5CF6" />
                  <Text style={[styles.posterMeta, { color: C.textSub }]}>
                    {post.postedAt || post.createdAt ? new Date(post.postedAt || post.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Recently'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Title + desc */}
          <View style={[styles.detailCard, { backgroundColor: C.card, borderColor: C.border }]}>
            {post.title ? (
              <Text style={[styles.title, { color: C.text }]}>{post.title}</Text>
            ) : null}
            <Text style={[styles.description, { color: C.textSub }]}>
              {post.description || 'No description provided.'}
            </Text>

            {/* Meta chips */}
            <View style={styles.chipRow}>
              <View style={[styles.chip, { backgroundColor: C.chipBg }]}>
                <MaterialIcons name="category" size={14} color="#7C3AED" />
                <Text style={[styles.chipText, { color: '#6D28D9' }]}>{post.category || 'General'}</Text>
              </View>
              {post.budget ? (
                <View style={[styles.chip, { backgroundColor: '#ECFDF5' }]}>
                  <MaterialIcons name="payments" size={14} color="#059669" />
                  <Text style={[styles.chipText, { color: '#065f46' }]}>Budget: {post.budget}</Text>
                </View>
              ) : null}
              <View style={[styles.chip, { backgroundColor: '#EEF2FF' }]}>
                <MaterialIcons name="people" size={14} color="#6366F1" />
                <Text style={[styles.chipText, { color: '#4338CA' }]}>{appliedCount} bids</Text>
              </View>
            </View>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <View style={styles.tagRow}>
                {post.tags.slice(0, 8).map((tag, i) => (
                  <View key={`${tag}-${i}`} style={[styles.tag, { backgroundColor: C.chipBg, borderColor: '#EDE9FE' }]}>
                    <Text style={[styles.tagText, { color: '#6D28D9' }]}>{tag}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Applicants section (OWNER ONLY) */}
          {owner ? (
            <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: C.text }]}>
                  Applicants ({appliedCount})
                </Text>
                <MaterialIcons name="group" size={22} color="#7C3AED" />
              </View>

              {post.applicants && post.applicants.length > 0 ? (
                post.applicants.map((a, idx) => {
                  const aName = a.name || 'Applicant';
                  const aAvatar = a.profilePicture
                    ? (a.profilePicture.startsWith('http') || a.profilePicture.startsWith('data:'))
                      ? a.profilePicture
                      : `${CONFIG.AUTH_SERVICE_URL}/${String(a.profilePicture).replace(/\\/g, '/')}`
                    : null;
                  const avColor = getAvatarColor(aName);
                  return (
                    <View key={`a-${idx}`} style={[styles.applicantCard, { backgroundColor: isDark ? '#2a2a35' : '#FAFAFA', borderColor: C.border }]}>
                      <View style={[styles.applicantAvatar, { backgroundColor: aAvatar ? 'transparent' : avColor }]}>
                        {aAvatar ? (
                          <Image
                            source={{ uri: aAvatar }}
                            style={{ width: '100%', height: '100%', borderRadius: 22 }}
                            defaultSource={{ uri: `https://randomuser.me/api/portraits/lego/${(aName.length % 10) + 1}.jpg` }}
                          />
                        ) : (
                          <Text style={styles.applicantAvatarText}>{getInitials(aName)}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.applicantRow}>
                          <Text style={[styles.applicantName, { color: C.text }]}>{aName}</Text>
                          <View style={[styles.roleChip, { backgroundColor: (a.role || 'Provider') === 'ServiceProvider' ? '#DBEAFE' : '#FEF3C7' }]}>
                            <Text style={[styles.roleText, { color: (a.role || 'Provider') === 'ServiceProvider' ? '#1D4ED8' : '#B45309' }]}>
                              {(a.role || 'Provider') === 'ServiceProvider' ? 'Provider' : (a.role || 'Seeker')}
                            </Text>
                          </View>
                        </View>
                        {a.bidAmount != null ? (
                          <View style={styles.bidRow}>
                            <MaterialIcons name="attach-money" size={15} color="#059669" />
                            <Text style={styles.bidText}>Bid: LKR {Number(a.bidAmount).toLocaleString()}</Text>
                          </View>
                        ) : null}
                        {a.note ? (
                          <Text style={[styles.noteText, { color: C.textSub }]} numberOfLines={4}>
                            {a.note}
                          </Text>
                        ) : null}
                        <View style={styles.applicantMetaRow}>
                          <MaterialIcons name="schedule" size={12} color="#9CA3AF" />
                          <Text style={[styles.appliedTimeText, { color: '#9CA3AF' }]}>
                            Applied {a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : 'recently'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyApplicants}>
                  <MaterialIcons name="person-off" size={44} color="#D1D5DB" />
                  <Text style={[styles.emptyTitle, { color: C.text }]}>No applications yet</Text>
                  <Text style={[styles.emptySub, { color: C.textSub }]}>
                    When service providers apply to your post, they will appear here.
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
              <View style={styles.lockedNotice}>
                <MaterialIcons name="lock" size={26} color="#F59E0B" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.lockedTitle, { color: C.text }]}>Applicant details are private</Text>
                  <Text style={[styles.lockedSub, { color: C.textSub }]}>
                    Only the post owner ({posterName}) can view who applied and their offers.
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={{ height: 24 }} />
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      {!owner ? (
        <View style={[styles.bottomBar, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <TouchableOpacity
            style={[styles.backToFeed]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={22} color={C.textSub} />
            <Text style={{ color: C.textSub, fontWeight: '600', marginLeft: 6 }}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyNow, alreadyApplied && { backgroundColor: '#10B981' }, applying && { opacity: 0.8 }]}
            onPress={openApply}
            disabled={alreadyApplied || applying}
            activeOpacity={0.85}
          >
            {applying ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name={alreadyApplied ? 'checkmark-circle' : 'paper-plane'} size={22} color="#fff" />
            )}
            <Text style={styles.applyNowText}>
              {alreadyApplied ? '✓ You Applied' : applying ? 'Submitting...' : 'Apply / Send Offer'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.bottomBar, { backgroundColor: C.card, borderTopColor: C.border }]}>
          <TouchableOpacity
            style={[styles.backToFeed, { flex: 1 }]}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back-outline" size={22} color={C.textSub} />
            <Text style={{ color: C.textSub, fontWeight: '600', marginLeft: 6 }}>Back to Feed</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Apply Bottom Modal */}
      <Modal
        visible={applyVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !applying && setApplyVisible(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => !applying && setApplyVisible(false)}
            disabled={applying}
          >
            <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Submit Your Offer</Text>
              <Text style={[styles.sheetSubtitle, { color: C.textSub }]}>
                Send a quote and cover note to {posterName}
              </Text>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.text }]}>
                  Bid Amount (LKR)
                  <Text style={{ color: C.textSub, fontWeight: '400' }}>  {post.budget ? `(Budget: ${post.budget})` : '(optional)'}</Text>
                </Text>
                <TextInput
                  style={[styles.amountInput, { backgroundColor: C.bg, color: C.text, borderColor: C.border }]}
                  placeholder="e.g. 15000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  value={bidAmount}
                  onChangeText={setBidAmount}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: C.text }]}>Cover Note (optional)</Text>
                <TextInput
                  style={[styles.noteInput, { backgroundColor: C.bg, color: C.text, borderColor: C.border, textAlignVertical: 'top' }]}
                  placeholder={`Hi ${posterName.split(' ')[0]}, I'd love to help with this because...`}
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={4}
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: C.border, backgroundColor: C.bg }]}
                  onPress={() => !applying && setApplyVisible(false)}
                  disabled={applying}
                >
                  <Text style={{ color: C.textSub, fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, applying && { opacity: 0.75 }]}
                  onPress={submitApply}
                  disabled={applying}
                >
                  {applying ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="paper-plane" size={18} color="#fff" />
                  )}
                  <Text style={styles.submitBtnText}>
                    {applying ? 'Sending...' : 'Send Offer'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  coverWrap: { width: '100%', height: 240, position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  coverOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  urgencyOverlayBadge: {
    position: 'absolute',
    top: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
  },
  urgencyOverlayText: { fontSize: 12, fontWeight: '700' },

  posterCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  posterRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  posterAvatar: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    borderWidth: 2, borderColor: '#8B5CF6',
  },
  posterAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  posterName: { fontSize: 16, fontWeight: '700' },
  posterMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  posterMeta: { fontSize: 12 },

  detailCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, lineHeight: 28 },
  description: { fontSize: 14, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
  },
  chipText: { fontSize: 12, fontWeight: '700' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 14 },
  tag: {
    borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14,
  },
  tagText: { fontSize: 11, fontWeight: '600' },

  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800' },
  applicantCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    gap: 12,
  },
  applicantAvatar: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  applicantAvatarText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  applicantRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  applicantName: { fontSize: 14, fontWeight: '700' },
  roleChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  roleText: { fontSize: 10, fontWeight: '800' },
  bidRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 4 },
  bidText: { fontSize: 13, fontWeight: '700', color: '#059669' },
  noteText: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  applicantMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  appliedTimeText: { fontSize: 11 },
  emptyApplicants: { alignItems: 'center', paddingVertical: 30 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 6, paddingHorizontal: 16, lineHeight: 18 },

  lockedNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  lockedTitle: { fontSize: 15, fontWeight: '700' },
  lockedSub: { fontSize: 12, lineHeight: 18, marginTop: 3 },

  bottomBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    borderTopWidth: 1,
    gap: 10,
  },
  backToFeed: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  applyNow: {
    flex: 1,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14,
    elevation: 8,
  },
  applyNowText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  sheetHandle: {
    width: 46, height: 5, borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center', marginBottom: 16,
  },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  sheetSubtitle: { fontSize: 13, marginTop: 4, marginBottom: 18 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  amountInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    fontSize: 16, fontWeight: '600',
  },
  noteInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14,
    height: 110,
  },
  sheetActions: {
    flexDirection: 'row', gap: 10, marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14,
  },
  submitBtn: {
    flex: 1.4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14, gap: 8,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 6,
  },
  submitBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
