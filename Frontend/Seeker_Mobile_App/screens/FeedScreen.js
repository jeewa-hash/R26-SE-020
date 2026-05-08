import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = 'http://10.0.2.2:6000';

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [interestedPosts, setInterestedPosts] = useState({});

  const fetchPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const data = await response.json();
      
      let postsArray = Array.isArray(data) ? data : (data.posts || []);
      
      const formattedPosts = postsArray.map(post => ({
        id: post._id,
        userName: post.userName || "Customer",
        userAvatar: post.userAvatar || "https://randomuser.me/api/portraits/lego/1.jpg",
        timeAgo: formatTimeAgo(post.createdAt),
        title: post.title,
        description: post.description,
        image: post.image,
        category: post.category,
        urgency: post.urgency,
        tags: post.tags || [],
        interestedCount: post.interestedCount || 0,
      }));
      
      setPosts(formattedPosts);
    } catch (error) {
      console.error('Fetch posts error:', error);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchPosts();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchPosts();
    const unsubscribe = navigation.addListener('focus', () => fetchPosts());
    return unsubscribe;
  }, [navigation]);

  const handleInterested = (postId) => {
    setInterestedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
    
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, interestedCount: post.interestedCount + (interestedPosts[postId] ? -1 : 1) }
        : post
    ));
    
    Alert.alert(
      interestedPosts[postId] ? "Not Interested" : "Interested!",
      interestedPosts[postId] 
        ? "You have removed your interest from this post"
        : "You have shown interest in this service. The service seeker will contact you soon.",
      [{ text: "OK" }]
    );
  };

  const handleCreatePost = () => {
    navigation.navigate("CreatePostScreen");
  };

  const getUrgencyStyle = (urgency) => {
    switch(urgency) {
      case 'high': return { bg: '#FEE2E2', color: '#EF4444', text: 'Urgent' };
      case 'medium': return { bg: '#FEF3C7', color: '#F59E0B', text: 'Medium' };
      case 'low': return { bg: '#D1FAE5', color: '#10B981', text: 'Low' };
      default: return { bg: '#F3F4F6', color: '#6B7280', text: 'Normal' };
    }
  };

  const renderPost = (post) => {
    const urgency = getUrgencyStyle(post.urgency);
    const isInterested = interestedPosts[post.id];
    
    return (
      <View key={post.id} style={styles.postCard}>
        {/* Post Header */}
        <View style={styles.postHeader}>
          <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
          <View style={styles.postHeaderInfo}>
            <Text style={styles.userName}>{post.userName}</Text>
            <Text style={styles.timeAgo}>{post.timeAgo}</Text>
          </View>
          <TouchableOpacity>
            <Ionicons name="ellipsis-horizontal" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Badges */}
        <View style={styles.badgeRow}>
          {post.urgency && (
            <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
              <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.text}</Text>
            </View>
          )}
          {post.category && post.category !== "Unknown" && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{post.category}</Text>
            </View>
          )}
        </View>

        {/* Content */}
        <Text style={styles.postTitle}>{post.title}</Text>
        <Text style={styles.postDescription}>{post.description}</Text>

        {/* Image */}
        {post.image && (
          <Image 
            source={{ uri: post.image.startsWith('http') ? post.image : `${API_BASE_URL}/${post.image}` }} 
            style={styles.postImage} 
          />
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tagsContainer}>
            {post.tags.slice(0, 3).map((tag, idx) => (
              <View key={idx} style={styles.tagChip}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Interested Button */}
        <TouchableOpacity 
          style={[styles.interestedButton, isInterested && styles.interestedButtonActive]}
          onPress={() => handleInterested(post.id)}
        >
          <LinearGradient
            colors={isInterested ? ['#10B981', '#059669'] : ['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.interestedGradient}
          >
            <Ionicons 
              name={isInterested ? "checkmark-circle" : "hand-right-outline"} 
              size={22} 
              color="#fff" 
            />
            <Text style={styles.interestedButtonText}>
              {isInterested ? "Interested ✓" : "I'm Interested"}
            </Text>
            {post.interestedCount > 0 && (
              <View style={styles.interestedCount}>
                <Text style={styles.interestedCountText}>{post.interestedCount}</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Service Feed</Text>
          <TouchableOpacity style={styles.createPostBtn} onPress={handleCreatePost}>
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Feed Posts */}
      <ScrollView 
        style={styles.feedContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />}
      >
        {posts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="newspaper-outline" size={60} color="#D1D5DB" />
            <Text style={styles.emptyText}>No posts yet</Text>
            <Text style={styles.emptySubtext}>Be the first to create a post!</Text>
            <TouchableOpacity style={styles.emptyCreateBtn} onPress={handleCreatePost}>
              <Text style={styles.emptyCreateBtnText}>Create Post →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          posts.map(renderPost)
        )}
      </ScrollView>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FC",
  },
  headerGradient: {
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  createPostBtn: {
    padding: 8,
  },
  feedContainer: {
    flex: 1,
  },
  feedContent: {
    padding: 16,
    paddingBottom: 80,
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: 12,
  },
  postHeaderInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#F3F4F6',
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
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  postImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  tagChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 8,
  },
  tagText: {
    fontSize: 11,
    color: '#6B7280',
  },
  interestedButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  interestedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  interestedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  interestedCount: {
    position: 'absolute',
    right: 16,
    backgroundColor: '#ffffff30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  interestedCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  interestedButtonActive: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyCreateBtn: {
    marginTop: 20,
    backgroundColor: '#667eea',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
  },
  emptyCreateBtnText: {
    color: '#fff',
    fontWeight: '600',
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
});