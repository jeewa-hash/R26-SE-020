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
  StatusBar,
  RefreshControl,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import BottomNav from '../components/BottomNav';

// ===============================
// API BASE URL
// ===============================
const API_BASE_URL =
  'http://10.0.2.2:6000';

// ===============================
// FEED SCREEN
// ===============================
export default function FeedScreen({
  navigation,
}) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [interestedPosts, setInterestedPosts] =
    useState({});

  // ===============================
  // FORMAT TIME
  // ===============================
  const formatTimeAgo = timestamp => {
    if (!timestamp) return 'Just now';

    const date = new Date(timestamp);

    const now = new Date();

    const diff = Math.floor(
      (now - date) / 1000
    );

    if (diff < 60)
      return `${diff}s ago`;

    if (diff < 3600)
      return `${Math.floor(
        diff / 60
      )}m ago`;

    if (diff < 86400)
      return `${Math.floor(
        diff / 3600
      )}h ago`;

    return `${Math.floor(
      diff / 86400
    )}d ago`;
  };

  // ===============================
  // FETCH POSTS
  // ===============================
  const fetchPosts = async () => {
    try {
      setLoading(true);

      // ✅ CORRECT ROUTE
      const response = await fetch(
        `${API_BASE_URL}/posts`
      );

      const data = await response.json();

      console.log('POSTS:', data);

      if (!data.success) {
        Alert.alert(
          'Error',
          'Failed to load posts'
        );

        return;
      }

      const postsArray =
        data.posts || [];

      const formattedPosts =
        postsArray.map(post => ({
          id: post._id,

          userName:
            post.userName ||
            post.name ||
            post.createdBy?.name ||
            'Customer',

          userAvatar:
            post.userAvatar ||
            post.profileImage ||
            post.avatar ||
            'https://randomuser.me/api/portraits/lego/1.jpg',

          timeAgo: formatTimeAgo(
            post.createdAt
          ),

          title: post.title,

          description:
            post.description,

          image: post.image || '',

          category:
            post.category ||
            'General',

          urgency:
            post.urgency ||
            'medium',

          tags: post.tags || [],

          interestedCount:
            post.interestedCount ||
            0,
        }));

      setPosts(formattedPosts);
    } catch (error) {
      console.log(
        'FETCH ERROR:',
        error
      );

      Alert.alert(
        'Error',
        'Could not fetch posts'
      );

      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // REFRESH
  // ===============================
  const onRefresh = async () => {
    setRefreshing(true);

    await fetchPosts();

    setRefreshing(false);
  };

  // ===============================
  // LOAD POSTS
  // ===============================
  useEffect(() => {
    fetchPosts();

    const unsubscribe =
      navigation.addListener(
        'focus',
        () => {
          fetchPosts();
        }
      );

    return unsubscribe;
  }, [navigation]);

  // ===============================
  // INTERESTED BUTTON
  // ===============================
  const handleInterested =
    postId => {
      setInterestedPosts(prev => ({
        ...prev,
        [postId]:
          !prev[postId],
      }));

      setPosts(prevPosts =>
        prevPosts.map(post =>
          post.id === postId
            ? {
                ...post,

                interestedCount:
                  post.interestedCount +
                  (interestedPosts[
                    postId
                  ]
                    ? -1
                    : 1),
              }
            : post
        )
      );

      Alert.alert(
        interestedPosts[postId]
          ? 'Removed'
          : 'Interested',
        interestedPosts[postId]
          ? 'Interest removed'
          : 'You are interested in this service'
      );
    };

  // ===============================
  // CREATE POST
  // ===============================
  const handleCreatePost = () => {
    navigation.navigate(
      'CreatePostScreen'
    );
  };

  // ===============================
  // URGENCY STYLE
  // ===============================
  const getUrgencyStyle =
    urgency => {
      switch (urgency) {
        case 'high':
          return {
            bg: '#FEE2E2',
            color: '#EF4444',
            text: 'Urgent',
          };

        case 'medium':
          return {
            bg: '#FEF3C7',
            color: '#F59E0B',
            text: 'Medium',
          };

        case 'low':
          return {
            bg: '#D1FAE5',
            color: '#10B981',
            text: 'Low',
          };

        default:
          return {
            bg: '#F3F4F6',
            color: '#6B7280',
            text: 'Normal',
          };
      }
    };

  // ===============================
  // RENDER POST
  // ===============================
  const renderPost = post => {
    const urgency =
      getUrgencyStyle(
        post.urgency
      );

    const isInterested =
      interestedPosts[post.id];

    return (
      <View
        key={post.id}
        style={styles.postCard}
      >
        {/* HEADER */}
        <View
          style={styles.postHeader}
        >
          <Image
            source={{
              uri: post.userAvatar,
            }}
            style={styles.avatar}
          />

          <View
            style={
              styles.postHeaderInfo
            }
          >
            <Text
              style={
                styles.userName
              }
            >
              {post.userName}
            </Text>

            <Text
              style={
                styles.timeAgo
              }
            >
              {post.timeAgo}
            </Text>
          </View>

          <TouchableOpacity>
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color="#9CA3AF"
            />
          </TouchableOpacity>
        </View>

        {/* BADGES */}
        <View
          style={styles.badgeRow}
        >
          <View
            style={[
              styles.urgencyBadge,
              {
                backgroundColor:
                  urgency.bg,
              },
            ]}
          >
            <Text
              style={[
                styles.urgencyText,
                {
                  color:
                    urgency.color,
                },
              ]}
            >
              {urgency.text}
            </Text>
          </View>

          <View
            style={
              styles.categoryBadge
            }
          >
            <Text
              style={
                styles.categoryText
              }
            >
              {post.category}
            </Text>
          </View>
        </View>

        {/* TITLE */}
        <Text
          style={styles.postTitle}
        >
          {post.title}
        </Text>

        {/* DESCRIPTION */}
        <Text
          style={
            styles.postDescription
          }
        >
          {post.description}
        </Text>

        {/* IMAGE */}
        {post.image ? (
          <Image
            source={{
              uri:
                post.image.startsWith(
                  'http'
                )
                  ? post.image
                  : `${API_BASE_URL}/${post.image.replace(
                      /\\/g,
                      '/'
                    )}`,
            }}
            style={styles.postImage}
          />
        ) : null}

        {/* TAGS */}
        {post.tags?.length >
          0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            style={
              styles.tagsContainer
            }
          >
            {post.tags.map(
              (tag, index) => (
                <View
                  key={index}
                  style={
                    styles.tagChip
                  }
                >
                  <Text
                    style={
                      styles.tagText
                    }
                  >
                    #{tag}
                  </Text>
                </View>
              )
            )}
          </ScrollView>
        )}

        {/* INTERESTED BUTTON */}
        <TouchableOpacity
          style={
            styles.interestedButton
          }
          onPress={() =>
            handleInterested(
              post.id
            )
          }
        >
          <LinearGradient
            colors={
              isInterested
                ? [
                    '#10B981',
                    '#059669',
                  ]
                : [
                    '#667eea',
                    '#764ba2',
                  ]
            }
            style={
              styles.interestedGradient
            }
          >
            <Ionicons
              name={
                isInterested
                  ? 'checkmark-circle'
                  : 'hand-right-outline'
              }
              size={22}
              color="#fff"
            />

            <Text
              style={
                styles.interestedButtonText
              }
            >
              {isInterested
                ? 'Interested ✓'
                : "I'm Interested"}
            </Text>

            {post.interestedCount >
              0 && (
              <View
                style={
                  styles.interestedCount
                }
              >
                <Text
                  style={
                    styles.interestedCountText
                  }
                >
                  {
                    post.interestedCount
                  }
                </Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  // ===============================
  // LOADING
  // ===============================
  if (loading) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={
            styles.loadingContainer
          }
        >
          <Text
            style={
              styles.loadingText
            }
          >
            Loading posts...
          </Text>
        </View>

        <BottomNav />
      </SafeAreaView>
    );
  }

  // ===============================
  // MAIN UI
  // ===============================
  return (
    <SafeAreaView
      style={styles.container}
    >
      <StatusBar
        barStyle="light-content"
      />

      {/* HEADER */}
      <LinearGradient
        colors={[
          '#667eea',
          '#764ba2',
        ]}
        style={
          styles.headerGradient
        }
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() =>
              navigation.goBack()
            }
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>

          <Text
            style={
              styles.headerTitle
            }
          >
            Service Feed
          </Text>

          <TouchableOpacity
            onPress={
              handleCreatePost
            }
          >
            <Ionicons
              name="create-outline"
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* POSTS */}
      <ScrollView
        style={
          styles.feedContainer
        }
        refreshControl={
          <RefreshControl
            refreshing={
              refreshing
            }
            onRefresh={
              onRefresh
            }
            colors={['#667eea']}
          />
        }
      >
        <View
          style={
            styles.feedContent
          }
        >
          {posts.length ===
          0 ? (
            <View
              style={
                styles.emptyContainer
              }
            >
              <Ionicons
                name="newspaper-outline"
                size={60}
                color="#D1D5DB"
              />

              <Text
                style={
                  styles.emptyText
                }
              >
                No posts found
              </Text>

              <TouchableOpacity
                style={
                  styles.emptyCreateBtn
                }
                onPress={
                  handleCreatePost
                }
              >
                <Text
                  style={
                    styles.emptyCreateBtnText
                  }
                >
                  Create Post
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            posts.map(
              renderPost
            )
          )}
        </View>
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ===============================
// STYLES
// ===============================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      '#F8F9FC',
  },

  headerGradient: {
    paddingTop: 14,
    paddingBottom: 14,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 20,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },

  feedContainer: {
    flex: 1,
  },

  feedContent: {
    padding: 16,
    paddingBottom: 100,
  },

  postCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22,
    marginRight: 12,
  },

  postHeaderInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  timeAgo: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },

  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
  },

  categoryBadge: {
    backgroundColor:
      '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  categoryText: {
    fontSize: 11,
    color: '#6B7280',
  },

  postTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
  },

  postDescription: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginBottom: 12,
  },

  postImage: {
    width: '100%',
    height: 220,
    borderRadius: 14,
    marginBottom: 12,
  },

  tagsContainer: {
    marginBottom: 12,
  },

  tagChip: {
    backgroundColor:
      '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginRight: 8,
  },

  tagText: {
    color: '#4F46E5',
    fontSize: 11,
  },

  interestedButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },

  interestedGradient: {
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent:
      'center',
    alignItems: 'center',
    gap: 10,
  },

  interestedButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  interestedCount: {
    position: 'absolute',
    right: 16,
    backgroundColor:
      '#ffffff30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },

  interestedCountText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
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

  emptyContainer: {
    alignItems: 'center',
    marginTop: 100,
  },

  emptyText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  emptyCreateBtn: {
    marginTop: 20,
    backgroundColor:
      '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },

  emptyCreateBtnText: {
    color: '#fff',
    fontWeight: '700',
  },
});