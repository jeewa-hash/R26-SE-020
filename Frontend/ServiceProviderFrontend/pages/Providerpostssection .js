/**
 * components/profile/ProviderPostsSection.jsx
 *
 * Displays the provider's posted ads with like and comment counts,
 * and fetches the list of liker names from the Seeker Auth Service.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
  Modal,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from '../theme';
import { CONFIG } from '../config';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Helpers ──────────────────────────────────────────────────────

function timeAgo(isoString) {
  if (!isoString) return '';
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatCount(n) {
  if (typeof n !== 'number') return '0';
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── Post Card ────────────────────────────────────────────────────

function PostCard({ post, onLike, onComment, onOptions, onBoost, isDark, C, isBoosting }) {
  const isBoosted = (post.priority || 0) > 0;

  return (
    <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>

      {/* Card Header — time + options */}
      <View style={styles.cardHeader}>
        <View style={styles.timeRow}>
          <MaterialIcons name="access-time" size={12} color={C.textSub} />
          <Text style={[styles.timeText, { color: C.textSub }]}>
            {timeAgo(post.postedAt)}
          </Text>
          {isBoosted && (
            <View style={styles.boostBadge}>
              <MaterialCommunityIcons name="rocket-launch-outline" size={10} color="#fff" />
              <Text style={styles.boostBadgeText}>Boosted Lv.{post.priority}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => onOptions(post)} hitSlop={8}>
          <MaterialIcons name="more-vert" size={20} color={C.textSub} />
        </TouchableOpacity>
      </View>

      {/* Post image — shown only if image URL exists */}
      {post.image ? (
        <Image
          source={{ uri: post.image }}
          style={styles.postImage}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.imagePlaceholder, { backgroundColor: isDark ? '#1e1b3a' : '#EFF6FF' }]}>
          <MaterialIcons name="campaign" size={32} color={Colors.primary} />
          <Text style={[styles.placeholderText, { color: Colors.primary }]}>
            Service Advertisement
          </Text>
        </View>
      )}

      {/* Post content */}
      <View style={styles.cardBody}>
        <Text style={[styles.postTitle, { color: C.text }]} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={[styles.postDesc, { color: C.textSub }]} numberOfLines={3}>
          {post.description}
        </Text>
      </View>

      {/* Liked By Names List */}
      {Array.isArray(post.likedBy) && post.likedBy.length > 0 && (
        <View style={styles.likedByContainer}>
          <Text style={[styles.likedByHeader, { color: C.textSub }]}>Liked by:</Text>
          {post.likedBy.map((name, index) => (
            <Text key={`${name}-${index}`} style={[styles.likedByName, { color: C.text }]}>
              • {name}
            </Text>
          ))}
        </View>
      )}

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: C.border }]} />

      {/* Action row — likes + comments */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => onLike(post.id)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={post.isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={post.isLiked ? '#EF4444' : C.textSub}
          />
          <Text style={[styles.actionCount, { color: post.isLiked ? '#EF4444' : C.textSub }]}>
            {formatCount(post.likes)}
          </Text>
          <Text style={[styles.actionLabel, { color: C.textSub }]}>
            {post.likes === 1 ? 'Like' : 'Likes'}
          </Text>
        </TouchableOpacity>

        <View style={[styles.actionDivider, { backgroundColor: C.border }]} />
      </View>

      {/* Boost Ad Button */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
        <TouchableOpacity
          style={[
            styles.boostBtn,
            { backgroundColor: isBoosted ? '#F59E0B' : Colors.primary },
          ]}
          onPress={() => onBoost(post)}
          activeOpacity={0.8}
          disabled={isBoosting}
        >
          {isBoosting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <MaterialCommunityIcons
                name={isBoosted ? 'rocket-launch' : 'trending-up'}
                size={16}
                color="#fff"
              />
              <Text style={styles.boostBtnText}>
                {isBoosted ? 'Boost Again' : 'Boost Ad'}
              </Text>
              {isBoosted && (
                <View style={styles.boostCounter}>
                  <Text style={styles.boostCounterText}>+{post.priority}</Text>
                </View>
              )}
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Options Bottom Sheet ─────────────────────────────────────────

function OptionsModal({ visible, onClose, onEdit, onDelete, isDark }) {
  const bg = isDark ? '#1c1c1e' : '#fff';

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={[styles.bottomSheet, { backgroundColor: bg }]}>
          <View style={styles.sheetHandle} />

          <TouchableOpacity style={styles.sheetOption} onPress={onEdit}>
            <MaterialIcons name="edit" size={20} color="#2563EB" />
            <Text style={[styles.sheetOptionText, { color: '#2563EB' }]}>Edit Post</Text>
          </TouchableOpacity>

          <View style={styles.sheetDivider} />

          <TouchableOpacity style={styles.sheetOption} onPress={onDelete}>
            <MaterialIcons name="delete-outline" size={20} color="#EF4444" />
            <Text style={[styles.sheetOptionText, { color: '#EF4444' }]}>Delete Post</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.sheetOption, { marginTop: 8 }]} onPress={onClose}>
            <Text style={[styles.sheetOptionText, { color: '#6B7280' }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── Main Section Component ───────────────────────────────────────

export default function ProviderPostsSection({ navigation, isDark }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [boostingId, setBoostingId] = useState(null);

  const C = isDark
    ? { card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e' }
    : { card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0' };

  // Fetch seeker names by array of IDs
  const fetchLikerNames = async (likeIds) => {
    if (!Array.isArray(likeIds) || likeIds.length === 0) return [];
    
    const users = await Promise.all(
      likeIds.map(async (id) => {
        try {
          const response = await fetch(
            `${CONFIG.AUTH_SERVICE_URL}/../seeker/user/${id}`
          );
          if (!response.ok) return 'Unknown user';
          const data = await response.json();
          return data.name || data.user?.name || 'Unknown user';
        } catch (error) {
          console.log('Error fetching seeker info:', error);
          return 'Unknown user';
        }
      })
    );

    return users;
  };

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const authToken = await AsyncStorage.getItem('userToken');

        if (!authToken) {
          Alert.alert('Error', 'No authentication token found. Please login again.');
          setLoading(false);
          return;
        }

        const res = await fetch(
          `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/provider`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
          }
        );

        if (!res.ok) throw new Error(`Server returned status ${res.status}`);
        const data = await res.json();

        if (data && Array.isArray(data.data)) {
          const formattedPosts = await Promise.all(
            data.data.map(async (post) => {
              const platformPost = post.posts?.[0] || {};
              const likeIds = Array.isArray(post.likes) ? post.likes : [];
              const likedBy = await fetchLikerNames(likeIds);

              return {
                id: post._id || post.id,
                title: platformPost.title || post.serviceLabel || 'Service advertisement',
                description: platformPost.caption || post.extraInfo || '',
                image: post.image?.url || null,
                likes: likeIds.length > 0 ? likeIds.length : (typeof post.likes === 'number' ? post.likes : 0),
                likedBy,
                comments: post.comments || 0,
                postedAt: post.createdAt || post.postedAt,
                isLiked: Boolean(post.isLiked),
                priority: post.priority || 0,
              };
            })
          );

          setPosts(formattedPosts);
        } else {
          setPosts([]);
        }
      } catch (err) {
        console.log('Fetch posts error:', err);
        Alert.alert(
          'Unable to load posts',
          'Check that the Provider Service is running and reachable via your configuration IP.'
        );
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  const handleLike = (postId) => {
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id !== postId) return p;
        return {
          ...p,
          isLiked: !p.isLiked,
          likes: p.isLiked ? p.likes - 1 : p.likes + 1,
        };
      })
    );
  };

  const handleComment = (post) => {
    navigation.navigate('PostComments', { postId: post.id, title: post.title });
  };

  const handleOptions = (post) => {
    setSelectedPost(post);
    setShowOptions(true);
  };

  const handleDelete = async () => {
    if (!selectedPost) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/${selectedPost.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      setPosts((prev) => prev.filter((p) => p.id !== selectedPost.id));
      setShowOptions(false);
    } catch (err) {
      Alert.alert('Unable to delete post', err.message);
    }
  };

  const handleEdit = () => {
    setShowOptions(false);
    navigation.navigate('EditPost', { post: selectedPost });
  };

 const handleBoost = async (post) => {
  if (boostingId) return;
  setBoostingId(post.id);

  try {
    const token = await AsyncStorage.getItem('userToken');
    const response = await fetch(
      `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/${post.id}/create-checkout-session`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: 1,
          redirectScheme: 'WorkWave://',
        }),
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || `Server error: ${response.status}`);
    }

    const checkoutUrl = result.url || result.sessionUrl || result.data?.url;

    if (!checkoutUrl) {
      throw new Error(`Missing URL in response: ${JSON.stringify(result)}`);
    }

    const canOpen = await Linking.canOpenURL(checkoutUrl);
    if (!canOpen) {
      throw new Error(`Device cannot open URL: ${checkoutUrl}`);
    }

    await Linking.openURL(checkoutUrl);
  } catch (err) {
    Alert.alert('Unable to boost ad', err.message);
  } finally {
    setBoostingId(null);
  }
};

  const header = (
    <View style={[styles.sectionHeader, { borderBottomColor: C.border }]}>
      <View>
        <Text style={[styles.sectionTitle, { color: C.text }]}>My Posts</Text>
        <Text style={[styles.sectionSub, { color: C.textSub }]}>
          {posts.length} advertisement{posts.length !== 1 ? 's' : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.newPostBtn}
        onPress={() => navigation.navigate('PostGeneration')}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={16} color="#fff" />
        <Text style={styles.newPostBtnText}>New Post</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
        {header}
        <View style={styles.loadingBox}>
          <ActivityIndicator color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (posts.length === 0) {
    return (
      <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
        {header}
        <View style={styles.emptyBox}>
          <MaterialIcons name="campaign" size={36} color={Colors.primary} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No posts yet</Text>
          <Text style={[styles.emptySub, { color: C.textSub }]}>
            Create your first advertisement to attract more customers
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => navigation.navigate('PostGeneration')}
          >
            <Text style={styles.emptyBtnText}>Create Post</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      {header}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        snapToInterval={CARD_W + 12}
        snapToAlignment="start"
      >
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onComment={handleComment}
            onOptions={handleOptions}
            onBoost={handleBoost}
            isDark={isDark}
            C={C}
            isBoosting={boostingId === post.id}
          />
        ))}
      </ScrollView>

      <OptionsModal
        visible={showOptions}
        onClose={() => setShowOptions(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        isDark={isDark}
      />
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────

const CARD_W = SCREEN_W * 0.78;

const styles = StyleSheet.create({
  section: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 2,
    marginBottom: 20,
    paddingTop: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 0.5,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSub: { fontSize: 12, marginTop: 2 },
  newPostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  newPostBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  scrollContent: {
    paddingLeft: 16,
    paddingRight: 10,
    paddingBottom: 16,
    gap: 18,
  },
  card: {
    width: CARD_W,
    borderRadius: 16,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 10,
  },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11 },
  postImage: { width: '100%', height: 160 },
  imagePlaceholder: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: { fontSize: 13, fontWeight: '600' },
  cardBody: { padding: 14, paddingBottom: 6 },
  postTitle: { fontSize: 14, fontWeight: '700', marginBottom: 6, lineHeight: 20 },
  postDesc: { fontSize: 13, lineHeight: 19 },
  likedByContainer: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  likedByHeader: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  likedByName: {
    fontSize: 12,
    marginLeft: 4,
  },
  divider: { height: 0.5, marginHorizontal: 14 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
  },
  actionCount: { fontSize: 13, fontWeight: '700' },
  actionLabel: { fontSize: 12 },
  actionDivider: { width: 0.5, height: 20 },
  boostBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F59E0B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  boostBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  boostBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  boostBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  boostCounter: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 10,
    marginLeft: 4,
  },
  boostCounterText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  sheetOptionText: { fontSize: 16, fontWeight: '600' },
  sheetDivider: { height: 0.5, backgroundColor: '#E5E7EB' },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  loadingBox: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  emptyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});