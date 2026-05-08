import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Image, Alert, Platform, StatusBar, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';

const API_BASE_URL = 'http://10.0.2.2:6000';

export default function MyPostsScreen({ navigation }) {
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchUserPosts();
    const unsubscribe = navigation.addListener('focus', () => {
      fetchUserPosts();
    });
    return unsubscribe;
  }, [navigation]);

  const fetchUserPosts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/`);
      const data = await response.json();
      let postsArray = Array.isArray(data) ? data : (data.posts || []);
      const formattedPosts = postsArray.map(post => ({
        id: post._id,
        title: post.title,
        description: post.description,
        image: post.image,
        date: new Date(post.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timeAgo: formatTimeAgo(post.createdAt),
        responses: post.comments || 0,
        urgency: post.urgency || 'normal',
        category: post.category || 'General',
      }));
      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserPosts();
  };

  const handleViewPost = (post) => {
    navigation.navigate('PostDetailScreen', { post });
  };

  const handleEditPost = (post) => {
    navigation.navigate('CreatePostScreen', { editMode: true, postData: post });
  };

  const handleDeletePost = (post) => {
    Alert.alert(
      "Delete Post",
      `Are you sure you want to delete "${post.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: () => deletePost(post.id), style: "destructive" }
      ]
    );
  };

  const deletePost = async (postId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/delete/${postId}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setUserPosts(userPosts.filter(post => post.id !== postId));
        Alert.alert("Success", "Post deleted successfully");
      } else {
        Alert.alert("Error", "Failed to delete post");
      }
    } catch (error) {
      console.error('Delete error:', error);
      Alert.alert("Error", "Network error");
    }
  };

  const getUrgencyStyle = (urgency) => {
    switch(urgency) {
      case 'high': return { bg: '#FEE2E2', color: '#EF4444', text: 'Urgent' };
      case 'medium': return { bg: '#FEF3C7', color: '#F59E0B', text: 'Medium' };
      case 'low': return { bg: '#D1FAE5', color: '#10B981', text: 'Low' };
      default: return { bg: '#F3F4F6', color: '#6B7280', text: 'Normal' };
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#667eea" />
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Posts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('CreatePostScreen')} style={styles.createButton}>
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
        <BottomNav />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Posts</Text>
        <TouchableOpacity onPress={() => navigation.navigate('CreatePostScreen')} style={styles.createButton}>
          <Ionicons name="create-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Posts List */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />
        }
      >
        {userPosts.map((post) => {
          const urgency = getUrgencyStyle(post.urgency);
          return (
            <TouchableOpacity 
              key={post.id} 
              style={styles.postCard}
              activeOpacity={0.9}
              onPress={() => handleViewPost(post)}
            >
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.cardGradient}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.categoryContainer}>
                    <View style={[styles.categoryIcon, { backgroundColor: '#667eea15' }]}>
                      <Ionicons name="briefcase-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.postCategory}>{post.category}</Text>
                  </View>
                  <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
                    <Ionicons name="alert-circle" size={12} color={urgency.color} />
                    <Text style={[styles.urgencyText, { color: urgency.color }]}>{urgency.text}</Text>
                  </View>
                </View>

                {/* Title & Description */}
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postDescription} numberOfLines={2}>
                  {post.description}
                </Text>

                {/* Image if exists */}
                {post.image && (
                  <Image 
                    source={{ uri: post.image.startsWith('http') ? post.image : `${API_BASE_URL}/${post.image}` }} 
                    style={styles.postImage} 
                  />
                )}

                {/* Footer */}
                <View style={styles.postFooter}>
                  <View style={styles.footerItem}>
                    <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                    <Text style={styles.footerText}>{post.date}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Ionicons name="time-outline" size={14} color="#6B7280" />
                    <Text style={styles.footerText}>{post.timeAgo}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <Ionicons name="chatbubble-outline" size={14} color="#667eea" />
                    <Text style={styles.responseText}>{post.responses} responses</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditPost(post)}
                  >
                    <Ionicons name="create-outline" size={18} color="#667eea" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeletePost(post)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          );
        })}

        {/* Empty State */}
        {userPosts.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="newspaper-outline" size={50} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No Posts Yet</Text>
            <Text style={styles.emptySubtext}>Create your first post to share your service needs</Text>
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

        {/* Extra padding for bottom nav */}
        <View style={{ height: 20 }} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
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
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
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
  responseText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#667eea',
    backgroundColor: '#fff',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#fff',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
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
});