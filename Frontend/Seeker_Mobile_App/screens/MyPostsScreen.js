import { resolvePostImageUrl } from '../utils/postMedia';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getStoredSeekerAuth, getUserIdFromJwt } from './IT22129376/services/seekerAuthStorage';
import { API_BASE_URL } from '../config';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';


export default function FeedScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);
  const [token, setToken] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ─── Load user data ──────────────────────────────────────
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const auth = await getStoredSeekerAuth();
        setToken(auth.token);
        setUserId(getUserIdFromJwt(auth.token) || auth.seekerId);
      } catch (error) {
        console.log('Error loading user data:', error);
      } finally {
        setAuthReady(true);
      }
    };
    loadUserData();
  }, []);

  // ─── Fetch posts when userId is available ──────────────
  useEffect(() => {
    if (!authReady) return;
    if (userId && token) {
      fetchPosts();
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
  }, [navigation, userId, token, authReady]);

  // ─── FETCH USER'S POSTS ──────────────────────────────────
  const fetchPosts = async () => {
    if (!userId || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setFetchError(null);

      const response = await fetch(
        `${API_BASE_URL}/posts/user/${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (!response.ok || !data.success || !Array.isArray(data.posts)) {
        throw new Error(data.error || data.message || `Could not load posts (HTTP ${response.status}).`);
      }

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
      setFetchError(error.message || 'Could not connect to the Seeker service.');
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

  // ─── VIEW RESPONSES – Navigate with Full Post Details ─────
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
        return { bg: '#FEE2E2', color: '#EF4444', text: 'Urgent' };
      case 'medium':
        return { bg: '#FEF3C7', color: '#F59E0B', text: 'Medium' };
      case 'low':
        return { bg: '#D1FAE5', color: '#10B981', text: 'Low' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: 'Normal' };
    }
  };

  // ─── LOADING ──────────────────────────────────────────────
  if (loading) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          isDarkMode && styles.containerDark,
        ]}
      >
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />

        <PageHeader title={<>My Posts</>} onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SeekerServices')} renderActions={({ textColor }) => <><TouchableOpacity
            onPress={() => navigation.navigate('CreatePostScreen')}
          >
            <Ionicons name="add-circle" size={28} color={textColor} />
          </TouchableOpacity></>} />

        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading your posts...
          </Text>
        </View>

        <BottomNav />
      </SafeAreaView>
    );
  }

  // ─── NOT LOGGED IN ────────────────────────────────────────
  if (!userId || !token) {
    return (
      <SafeAreaView
        style={[
          styles.container,
          isDarkMode && styles.containerDark,
        ]}
      >
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
        />

        <PageHeader title={<>My Posts</>} onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SeekerServices')} renderActions={({ textColor }) => <><TouchableOpacity
            onPress={() => navigation.navigate('CreatePostScreen')}
          >
            <Ionicons name="add-circle" size={28} color={textColor} />
          </TouchableOpacity></>} />

        <View style={styles.centerContainer}>
          <Ionicons name="lock-closed-outline" size={60} color="#D1D5DB" />
          <Text style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
            Please Log In
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
    <SafeAreaView
      style={[
        styles.container,
        isDarkMode && styles.containerDark,
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'}
      />

      {/* HEADER */}
      <PageHeader title={<>My Posts</>} onBack={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SeekerServices')} renderActions={({ textColor }) => <><TouchableOpacity
          onPress={() => navigation.navigate('CreatePostScreen')}
        >
          <Ionicons name="add-circle" size={28} color={textColor} />
        </TouchableOpacity></>} />

      {/* POSTS */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
            tintColor={isDarkMode ? '#667eea' : '#667eea'}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {fetchError && (
          <View style={styles.centerContainer}>
            <Text accessibilityRole="alert" style={[styles.emptyTitle, isDarkMode && styles.textDark]}>
              Unable to load your posts
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>{fetchError}</Text>
            <TouchableOpacity onPress={fetchPosts} accessibilityRole="button" style={{ padding: 16 }}>
              <Text style={{ color: '#667eea', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {posts.map((post) => {
          const urgency = getUrgencyStyle(post.urgency);

          const imageUrl = resolvePostImageUrl(post.image, API_BASE_URL);

          return (
            <View
              key={post.id}
              style={[
                styles.postCard,
                isDarkMode && styles.postCardDark,
              ]}
            >
              <LinearGradient
                colors={
                  isDarkMode
                    ? ['#16213e', '#1a1a2e']
                    : ['#fff', '#fefefe']
                }
                style={styles.cardGradient}
              >
                {/* HEADER */}
                <View style={styles.cardHeader}>
                  <View style={styles.categoryContainer}>
                    <View
                      style={[
                        styles.categoryIcon,
                        {
                          backgroundColor: isDarkMode
                            ? '#2d3561'
                            : '#667eea15',
                        },
                      ]}
                    >
                      <Ionicons
                        name="briefcase-outline"
                        size={14}
                        color="#667eea"
                      />
                    </View>

                    <Text
                      style={[
                        styles.postCategory,
                        isDarkMode && styles.textDark,
                      ]}
                    >
                      {post.category}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.urgencyBadge,
                      { backgroundColor: urgency.bg },
                    ]}
                  >
                    <Ionicons
                      name="alert-circle"
                      size={12}
                      color={urgency.color}
                    />

                    <Text
                      style={[
                        styles.urgencyText,
                        { color: urgency.color },
                      ]}
                    >
                      {urgency.text}
                    </Text>
                  </View>
                </View>

                {/* TITLE */}
                <Text
                  style={[
                    styles.postTitle,
                    isDarkMode && styles.textDark,
                  ]}
                >
                  {post.title}
                </Text>

                {/* DESCRIPTION */}
                <Text
                  numberOfLines={2}
                  style={[
                    styles.postDescription,
                    isDarkMode && styles.textMutedDark,
                  ]}
                >
                  {post.description}
                </Text>

                {/* IMAGE */}
                {imageUrl && (
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.postImage}
                  />
                )}

                {/* FOOTER */}
                <View style={styles.postFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={14}
                      color="#6B7280"
                    />

                    <Text
                      style={[
                        styles.footerText,
                        isDarkMode && styles.textMutedDark,
                      ]}
                    >
                      {post.date}
                    </Text>
                  </View>

                  <View style={styles.footerItem}>
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color="#6B7280"
                    />

                    <Text
                      style={[
                        styles.footerText,
                        isDarkMode && styles.textMutedDark,
                      ]}
                    >
                      {post.timeAgo}
                    </Text>
                  </View>
                </View>

                {/* ─── ACTION BUTTONS (SMALLER & SIMPLER) ─── */}
                <View style={styles.actionButtons}>
                  {/* EDIT */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.editBtn, isDarkMode && styles.editBtnDark]}
                    onPress={() => handleEditPost(post)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color="#667eea" />
                    <Text style={[styles.actionBtnText, styles.editBtnText]}>Edit</Text>
                  </TouchableOpacity>

                  {/* DELETE */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn, isDarkMode && styles.deleteBtnDark]}
                    onPress={() => handleDeletePost(post)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={[styles.actionBtnText, styles.deleteBtnText]}>Delete</Text>
                  </TouchableOpacity>

                  {/* RESPONSES */}
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.responsesBtn, isDarkMode && styles.responsesBtnDark]}
                    onPress={() => handleViewResponses(post)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="people-outline" size={16} color="#10B981" />
                    <Text style={[styles.actionBtnText, styles.responsesBtnText]}>
                      Responses {post.responseCount > 0 ? `(${post.responseCount})` : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          );
        })}

        {/* EMPTY */}
        {posts.length === 0 && !fetchError && (
          <View style={styles.emptyContainer}>
            <View
              style={[
                styles.emptyIcon,
                isDarkMode && styles.emptyIconDark,
              ]}
            >
              <Ionicons
                name="newspaper-outline"
                size={50}
                color={isDarkMode ? '#2d3561' : '#D1D5DB'}
              />
            </View>

            <Text
              style={[
                styles.emptyText,
                isDarkMode && styles.textDark,
              ]}
            >
              No Posts Yet
            </Text>

            <Text
              style={[
                styles.emptySubtext,
                isDarkMode && styles.textMutedDark,
              ]}
            >
              You haven't created any posts yet.
            </Text>

            <TouchableOpacity
              style={styles.createPostButton}
              onPress={() => navigation.navigate('CreatePostScreen')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.createPostGradient}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createPostText}>Create New Post</Text>
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

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  containerDark: {
    backgroundColor: '#1a1a2e',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },

  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },

  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },

  content: {
    padding: 16,
    paddingBottom: 80,
  },

  postCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },

  postCardDark: {
    backgroundColor: '#16213e',
  },

  cardGradient: {
    padding: 16,
    borderRadius: 20,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  postCategory: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },

  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },

  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
  },

  postTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },

  postDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },

  postImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
  },

  postFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },

  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  footerText: {
    fontSize: 11,
    color: '#6B7280',
  },

  // ─── ACTION BUTTONS (SMALLER & SIMPLER) ────────────────
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 2,
  },

  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 1,
    elevation: 0,
  },

  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Edit button
  editBtn: {
    borderColor: '#667eea',
    backgroundColor: '#EEF2FF',
  },
  editBtnDark: {
    borderColor: '#818cf8',
    backgroundColor: '#242f4d',
  },
  editBtnText: {
    color: '#667eea',
  },

  // Delete button
  deleteBtn: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  deleteBtnDark: {
    borderColor: '#F87171',
    backgroundColor: '#242f4d',
  },
  deleteBtnText: {
    color: '#EF4444',
  },

  // Responses button
  responsesBtn: {
    borderColor: '#6EE7B7',
    backgroundColor: '#ECFDF5',
  },
  responsesBtnDark: {
    borderColor: '#34D399',
    backgroundColor: '#242f4d',
  },
  responsesBtnText: {
    color: '#10B981',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },

  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },

  emptyIconDark: {
    backgroundColor: '#16213e',
  },

  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },

  createPostButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },

  createPostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },

  createPostText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
  },

  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
  },

  textDark: {
    color: '#fff',
  },

  textMutedDark: {
    color: '#9CA3AF',
  },
});
