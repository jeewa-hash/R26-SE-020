import PageHeader from '../components/PageHeader';
// screens/FeedScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';

// ─────────────────────────────────────────────────────────────
// Shared palette — matches Home, Bookings, Profile, ProviderProfile
// ─────────────────────────────────────────────────────────────
const P = {
  indigo: '#4F46E5',
  indigoDeep: '#4338CA',
  indigoSoft: '#EEF2FF',
  indigoSoftDark: '#1E1B4B',
  indigoLight: '#A5B4FC',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#ECFDF5',
  emeraldSoftDark: '#064E3B',
  emeraldLight: '#34D399',
  amber: '#D97706',
  amberSoft: '#FFFBEB',
  amberSoftDark: '#78350F',
  amberLight: '#FBBF24',
  rose: '#EF4444',
  roseDark: '#991B1B',
  roseSoft: '#FEF2F2',
  roseSoftDark: '#7F1D1D',
  roseLight: '#FCA5A5',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

export default function FeedScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);

  // ─── Load user data ──────────────────────────────────────
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        const storedUserId = await AsyncStorage.getItem('userId');
        setToken(storedToken);
        setUserId(storedUserId);
      } catch (error) {
        console.log('Error loading user data:', error);
      }
    };
    loadUserData();
  }, []);

  // ─── Fetch posts when userId is available ──────────────
  useEffect(() => {
    if (userId && token) {
      fetchPosts();
    } else if (userId === null && token === null) {
      // Still loading, do nothing
    } else {
      // No user logged in
      setLoading(false);
    }

    const unsubscribe = navigation.addListener('focus', () => {
      if (userId && token) {
        fetchPosts();
      }
    });

    return unsubscribe;
  }, [navigation, userId, token]);

  // ─── FETCH USER'S POSTS ──────────────────────────────────
  const fetchPosts = async () => {
    if (!userId || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/posts/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success && Array.isArray(data.posts)) {
        const formattedPosts = data.posts.map((post) => ({
          id: post._id,
          _id: post._id,
          title: post.title || 'Untitled Post',
          description: post.description || '',
          image: post.image || null,
          category: post.category || 'General',
          urgency: post.urgency || 'medium',
          location: post.location || null,
          preferredSchedule: post.preferredSchedule || null,
          tags: post.tags || [],
          createdAt: post.createdAt,
          date: new Date(post.createdAt).toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }
          ),
          timeAgo: formatTimeAgo(post.createdAt),
          responseCount: post.appliedBy ? post.appliedBy.length : 0,
          rawPost: post,
        }));

        setPosts(formattedPosts);
      } else {
        setPosts([]);
        if (data.error === 'User not found') {
          Alert.alert('Error', 'User not found. Please log in again.');
        }
      }
    } catch (error) {
      console.log('Fetch Posts Error:', error);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ─── FORMAT TIME ──────────────────────────────────────────
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';

    const diff = Math.floor(
      (new Date() - new Date(timestamp)) / 1000
    );

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // ─── REFRESH ──────────────────────────────────────────────
  const onRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  // ─── EDIT POST ────────────────────────────────────────────
  const handleEditPost = (post) => {
    navigation.navigate('CreatePostScreen', {
      editMode: true,
      postData: post.rawPost || post,
    });
  };

  // ─── DELETE ALERT ─────────────────────────────────────────
  const handleDeletePost = (post) => {
    Alert.alert(
      'Delete Post',
      `Are you sure you want to delete "${post.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePost(post.id),
        },
      ]
    );
  };

  // ─── DELETE POST ──────────────────────────────────────────
  const deletePost = async (postId) => {
    try {
      if (!token) {
        Alert.alert('Error', 'You are not authenticated.');
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/posts/delete/${postId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.success) {
        setPosts((prevPosts) =>
          prevPosts.filter((post) => post.id !== postId)
        );

        Alert.alert('Success', 'Post deleted successfully');
      } else {
        Alert.alert('Error', data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.log('Delete Error:', error);
      Alert.alert('Error', 'Network error while deleting post');
    }
  };

  // ─── VIEW RESPONSES ───────────────────────────────────────
  const handleViewResponses = (post) => {
    navigation.navigate('PostResponsesScreen', {
      postId: post.id,
      post: {
        ...post,
        id: post.id,
        _id: post.id,
        title: post.title,
        description: post.description,
        image: post.image,
        category: post.category,
        urgency: post.urgency,
        location: post.location,
        preferredSchedule: post.preferredSchedule,
        tags: post.tags,
        date: post.date,
        timeAgo: post.timeAgo,
        responseCount: post.responseCount,
        createdAt: post.createdAt,
      },
    });
  };

  // ─── URGENCY STYLE ────────────────────────────────────────
  const getUrgencyStyle = (urgency) => {
    switch (String(urgency).toLowerCase()) {
      case 'high':
      case 'urgent':
        return {
          bg: isDarkMode ? P.roseSoftDark : P.roseSoft,
          color: isDarkMode ? P.roseLight : P.rose,
          icon: 'flame',
          text: 'Urgent',
        };
      case 'medium':
        return {
          bg: isDarkMode ? P.amberSoftDark : P.amberSoft,
          color: isDarkMode ? P.amberLight : P.amber,
          icon: 'flash',
          text: 'Medium',
        };
      case 'low':
        return {
          bg: isDarkMode ? P.emeraldSoftDark : P.emeraldSoft,
          color: isDarkMode ? P.emeraldLight : P.emerald,
          icon: 'checkmark-circle',
          text: 'Low',
        };
      default:
        return {
          bg: isDarkMode ? P.slate800 : P.slate100,
          color: isDarkMode ? P.slate400 : P.slate500,
          icon: 'ellipse-outline',
          text: 'Normal',
        };
    }
  };

  // ─── HEADER (reused across all states) ────────────────────
  const renderHeader = () => (
    <PageHeader
      title={<>My Posts</>}
      onBack={() => navigation.navigate('ProfileScreen')}
      renderActions={({ textColor }) => (
        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={() => navigation.navigate('CreatePostScreen')}
          activeOpacity={0.75}
        >
          <Ionicons name="add" size={22} color={textColor} />
        </TouchableOpacity>
      )}
    />
  );

  // ─── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
        />
        {renderHeader()}

        <View style={styles.centerContainer}>
          <View
            style={[styles.loadingRing, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
          >
            <ActivityIndicator size="large" color={P.indigo} />
          </View>
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading your posts…
          </Text>
        </View>

        <BottomNav />
      </SafeAreaView>
    );
  }

  // ─── NOT LOGGED IN ────────────────────────────────────────
  if (!userId || !token) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
        />
        {renderHeader()}

        <View style={styles.centerContainer}>
          <View
            style={[styles.emptyIconWrap, isDarkMode && { backgroundColor: P.slate800 }]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={44}
              color={isDarkMode ? P.slate500 : P.slate400}
            />
          </View>
          <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
            Please log in
          </Text>
          <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
            You need to be logged in to view your posts.
          </Text>
        </View>

        <BottomNav />
      </SafeAreaView>
    );
  }

  // ─── MAIN UI ──────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
      />

      {renderHeader()}

      {/* Post count summary strip */}
      {posts.length > 0 && (
        <View style={[styles.summaryStrip, isDarkMode && styles.summaryStripDark]}>
          <View style={styles.summaryLeft}>
            <Ionicons
              name="documents-outline"
              size={16}
              color={isDarkMode ? P.indigoLight : P.indigo}
            />
            <Text style={[styles.summaryText, isDarkMode && styles.textDark]}>
              {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </Text>
          </View>
          <Text style={[styles.summaryHint, isDarkMode && styles.textMutedDark]}>
            Tap a card to manage
          </Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[P.indigo]}
            tintColor={isDarkMode ? P.indigoLight : P.indigo}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {posts.map((post) => {
          const urgency = getUrgencyStyle(post.urgency);

          const imageUrl = post.image
            ? post.image.startsWith('http')
              ? post.image
              : `${API_BASE_URL}/${post.image.replace(/\\/g, '/')}`
            : null;

          return (
            <View
              key={post.id}
              style={[styles.postCard, isDarkMode && styles.postCardDark]}
            >
              {/* HEADER */}
              <View style={styles.cardHeader}>
                <View style={styles.categoryContainer}>
                  <View
                    style={[
                      styles.categoryIcon,
                      isDarkMode && { backgroundColor: P.indigoSoftDark },
                    ]}
                  >
                    <Ionicons
                      name="briefcase"
                      size={13}
                      color={isDarkMode ? P.indigoLight : P.indigo}
                    />
                  </View>

                  <Text
                    style={[styles.postCategory, isDarkMode && { color: P.indigoLight }]}
                    numberOfLines={1}
                  >
                    {post.category}
                  </Text>
                </View>

                <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
                  <Ionicons name={urgency.icon} size={11} color={urgency.color} />
                  <Text style={[styles.urgencyText, { color: urgency.color }]}>
                    {urgency.text}
                  </Text>
                </View>
              </View>

              {/* TITLE */}
              <Text style={[styles.postTitle, isDarkMode && styles.textDark]}>
                {post.title}
              </Text>

              {/* DESCRIPTION — full content */}
              {post.description ? (
                <Text style={[styles.postDescription, isDarkMode && styles.textMutedDark]}>
                  {post.description}
                </Text>
              ) : null}

              {/* IMAGE */}
              {imageUrl && (
                <Image source={{ uri: imageUrl }} style={styles.postImage} />
              )}

              {/* META ROW */}
              <View style={[styles.postFooter, isDarkMode && styles.postFooterDark]}>
                <View
                  style={[
                    styles.metaPill,
                    isDarkMode && { backgroundColor: P.slate900, borderColor: P.slate700 },
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={12}
                    color={isDarkMode ? P.slate400 : P.slate500}
                  />
                  <Text style={[styles.footerText, isDarkMode && styles.textMutedDark]}>
                    {post.date}
                  </Text>
                </View>

                <View
                  style={[
                    styles.metaPill,
                    isDarkMode && { backgroundColor: P.slate900, borderColor: P.slate700 },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={12}
                    color={isDarkMode ? P.slate400 : P.slate500}
                  />
                  <Text style={[styles.footerText, isDarkMode && styles.textMutedDark]}>
                    {post.timeAgo}
                  </Text>
                </View>
              </View>

              {/* ACTION BUTTONS */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.editBtn, isDarkMode && styles.editBtnDark]}
                  onPress={() => handleEditPost(post)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="create-outline"
                    size={15}
                    color={isDarkMode ? P.indigoLight : P.indigo}
                  />
                  <Text style={[styles.actionBtnText, isDarkMode && { color: P.indigoLight }]}>
                    Edit
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.deleteBtn, isDarkMode && styles.deleteBtnDark]}
                  onPress={() => handleDeletePost(post)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="trash-outline"
                    size={15}
                    color={isDarkMode ? P.roseLight : P.rose}
                  />
                  <Text style={[styles.actionBtnText, isDarkMode && { color: P.roseLight }]}>
                    Delete
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, styles.responsesBtn, isDarkMode && styles.responsesBtnDark]}
                  onPress={() => handleViewResponses(post)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name="people-outline"
                    size={15}
                    color={isDarkMode ? P.emeraldLight : P.emerald}
                  />
                  <Text style={[styles.actionBtnText, isDarkMode && { color: P.emeraldLight }]}>
                    {post.responseCount > 0 ? `Responses (${post.responseCount})` : 'Responses'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* EMPTY */}
        {posts.length === 0 && (
          <View style={styles.emptyContainer}>
            <View
              style={[styles.emptyIconWrap, isDarkMode && { backgroundColor: P.indigoSoftDark }]}
            >
              <Ionicons
                name="newspaper-outline"
                size={40}
                color={isDarkMode ? P.indigoLight : P.indigo}
              />
            </View>

            <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              No posts yet
            </Text>

            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              You haven't created any posts yet. Start by creating your first one.
            </Text>

            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => navigation.navigate('CreatePostScreen')}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={isDarkMode ? [P.indigoLight, P.indigo] : [P.indigo, P.indigoDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.createPostGradient}
              >
                <Ionicons name="add" size={18} color={P.white} />
                <Text style={styles.createPostText}>Create new post</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.slate50 },
  containerDark: { backgroundColor: P.slate900 },

  headerActionBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Summary strip ──
  summaryStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: P.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderColor: P.slate200,
  },
  summaryStripDark: { backgroundColor: P.slate800, borderColor: P.slate700 },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.1,
  },
  summaryHint: {
    fontSize: 11.5,
    fontWeight: '600',
    color: P.slate500,
  },

  content: {
    padding: 16,
    paddingBottom: 80,
  },

  // ── Post card ──
  postCard: {
    backgroundColor: P.white,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  postCardDark: { backgroundColor: P.slate800, borderColor: P.slate700 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  categoryIcon: {
    width: 22,
    height: 22,
    borderRadius: 8,
    backgroundColor: P.indigoSoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postCategory: {
    fontSize: 11.5,
    color: P.indigo,
    fontWeight: '700',
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  urgencyText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  postTitle: {
    fontSize: 15.5,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.2,
    lineHeight: 21,
    marginBottom: 6,
  },

  postDescription: {
    fontSize: 13,
    color: P.slate600,
    lineHeight: 19,
    marginBottom: 12,
    fontWeight: '500',
  },

  postImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: P.slate100,
  },

  // ── Meta row ──
  postFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: P.slate100,
  },
  postFooterDark: { borderTopColor: P.slate700 },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.slate100,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: P.slate200,
  },
  footerText: {
    fontSize: 11,
    color: P.slate600,
    fontWeight: '700',
  },

  // ── Action buttons ──
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: -0.1,
  },

  // Edit
  editBtn: {
    borderColor: P.indigo,
    backgroundColor: P.indigoSoft,
  },
  editBtnDark: {
    borderColor: P.indigo,
    backgroundColor: P.indigoSoftDark,
  },

  // Delete
  deleteBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: P.roseSoft,
  },
  deleteBtnDark: {
    borderColor: P.roseDark,
    backgroundColor: P.roseSoftDark,
  },

  // Responses
  responsesBtn: {
    borderColor: '#6EE7B7',
    backgroundColor: P.emeraldSoft,
  },
  responsesBtnDark: {
    borderColor: P.emeraldDark,
    backgroundColor: P.emeraldSoftDark,
  },

  // ── Empty / loading / not logged in ──
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  loadingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.indigoSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  loadingText: {
    fontSize: 13.5,
    color: P.slate500,
    fontWeight: '600',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
    paddingBottom: 40,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: P.indigoSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 13.5,
    color: P.slate500,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: 12,
    marginBottom: 20,
    fontWeight: '500',
  },

  createPostButton: {
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: P.indigo,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: { elevation: 2 },
    }),
  },
  createPostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
    minHeight: 46,
  },
  createPostText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: P.white,
    letterSpacing: 0.1,
  },

  // ── Utility ──
  textDark: { color: P.slate50 },
  textMutedDark: { color: P.slate400 },
});