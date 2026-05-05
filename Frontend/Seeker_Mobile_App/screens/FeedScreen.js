import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function FeedScreen({ navigation }) {
  const [posts, setPosts] = useState([
    {
      id: 1,
      userName: "Sarah Johnson",
      userAvatar: "https://randomuser.me/api/portraits/women/1.jpg",
      userRole: "Service Provider",
      timeAgo: "2 hours ago",
      type: "service",
      title: "Professional Cleaning Service Available",
      description: "I offer professional cleaning services for homes and offices. Eco-friendly products used. Available for weekly, bi-weekly, or monthly contracts.",
      price: "$30/hour",
      location: "Colombo",
      likes: 45,
      comments: 12,
      shares: 5,
      isLiked: false,
      images: ["https://picsum.photos/400/300?random=1"],
    },
    {
      id: 2,
      userName: "Michael Chen",
      userAvatar: "https://randomuser.me/api/portraits/men/2.jpg",
      userRole: "Customer",
      timeAgo: "5 hours ago",
      type: "request",
      title: "Looking for a Plumber",
      description: "Need an experienced plumber for bathroom renovation. Work includes pipe replacement and fixture installation. Please send quotations.",
      budget: "$200 - $500",
      location: "Kandy",
      likes: 23,
      comments: 8,
      shares: 2,
      isLiked: true,
      images: ["https://picsum.photos/400/300?random=2"],
    },
    {
      id: 3,
      userName: "Emily Rodriguez",
      userAvatar: "https://randomuser.me/api/portraits/women/3.jpg",
      userRole: "Service Provider",
      timeAgo: "1 day ago",
      type: "offer",
      title: "Special Discount - Gardening Services",
      description: "Spring special! 20% off on all gardening services. Lawn mowing, hedge trimming, and garden maintenance.",
      price: "$25/session",
      location: "Galle",
      likes: 67,
      comments: 15,
      shares: 8,
      isLiked: false,
      images: ["https://picsum.photos/400/300?random=3", "https://picsum.photos/400/300?random=4"],
    },
  ]);

  const [commentText, setCommentText] = useState('');
  const [selectedPostId, setSelectedPostId] = useState(null);

  const handleLike = (postId) => {
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, likes: post.isLiked ? post.likes - 1 : post.likes + 1, isLiked: !post.isLiked }
        : post
    ));
  };

  const handleComment = (postId) => {
    if (!commentText.trim()) {
      Alert.alert("Error", "Please enter a comment");
      return;
    }
    
    Alert.alert("Comment Added", "Your comment has been posted");
    setCommentText('');
    setSelectedPostId(null);
    
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, comments: post.comments + 1 }
        : post
    ));
  };

  const handleShare = (postId) => {
    Alert.alert("Share", "Share this post with others?");
    setPosts(posts.map(post => 
      post.id === postId 
        ? { ...post, shares: post.shares + 1 }
        : post
    ));
  };

  const handleCreatePost = () => {
    navigation.navigate("CreatePostScreen");
  };

  const renderPost = (post) => (
    <View key={post.id} style={styles.postCard}>
      {/* Post Header */}
      <View style={styles.postHeader}>
        <Image source={{ uri: post.userAvatar }} style={styles.avatar} />
        <View style={styles.postHeaderInfo}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{post.userName}</Text>
            {post.userRole === "Service Provider" && (
              <View style={styles.providerBadge}>
                <Ionicons name="checkmark-circle" size={12} color="#fff" />
                <Text style={styles.providerBadgeText}>Provider</Text>
              </View>
            )}
          </View>
          <Text style={styles.timeAgo}>{post.timeAgo}</Text>
        </View>
        <TouchableOpacity>
          <Ionicons name="ellipsis-horizontal" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      {/* Post Type Badge */}
      <View style={[
        styles.postTypeBadge,
        post.type === 'service' && styles.serviceBadge,
        post.type === 'request' && styles.requestBadge,
        post.type === 'offer' && styles.offerBadge,
      ]}>
        <Ionicons 
          name={
            post.type === 'service' ? 'construct' : 
            post.type === 'request' ? 'help-circle' : 'pricetag'
          } 
          size={14} 
          color="#fff" 
        />
        <Text style={styles.postTypeText}>
          {post.type === 'service' ? 'Service' : post.type === 'request' ? 'Request' : 'Special Offer'}
        </Text>
      </View>

      {/* Post Content */}
      <Text style={styles.postTitle}>{post.title}</Text>
      <Text style={styles.postDescription}>{post.description}</Text>

      {/* Post Images */}
      {post.images && post.images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesContainer}>
          {post.images.map((img, idx) => (
            <Image key={idx} source={{ uri: img }} style={styles.postImage} />
          ))}
        </ScrollView>
      )}

      {/* Price/Budget & Location */}
      <View style={styles.detailsContainer}>
        {(post.price || post.budget) && (
          <View style={styles.detailChip}>
            <Ionicons name="cash-outline" size={16} color="#6366F1" />
            <Text style={styles.detailText}>{post.price || post.budget}</Text>
          </View>
        )}
        <View style={styles.detailChip}>
          <Ionicons name="location-outline" size={16} color="#6366F1" />
          <Text style={styles.detailText}>{post.location}</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post.id)}>
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={22} 
            color={post.isLiked ? "#FF6B6B" : "#6B7280"} 
          />
          <Text style={[styles.actionText, post.isLiked && styles.likedText]}>{post.likes}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => setSelectedPostId(post.id)}>
          <Ionicons name="chatbubble-outline" size={22} color="#6B7280" />
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(post.id)}>
          <Ionicons name="share-social-outline" size={22} color="#6B7280" />
          <Text style={styles.actionText}>{post.shares}</Text>
        </TouchableOpacity>
      </View>

      {/* Comment Input */}
      {selectedPostId === post.id && (
        <View style={styles.commentContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="Write a comment..."
            placeholderTextColor="#9CA3AF"
            value={commentText}
            onChangeText={setCommentText}
            multiline
          />
          <TouchableOpacity style={styles.sendCommentBtn} onPress={() => handleComment(post.id)}>
            <Ionicons name="send" size={20} color="#6366F1" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

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
          <Text style={styles.headerTitle}>Community Feed</Text>
          <TouchableOpacity style={styles.createPostBtn} onPress={handleCreatePost}>
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Feed Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity style={[styles.tab, styles.activeTab]}>
          <Text style={[styles.tabText, styles.activeTabText]}>For You</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tab}>
          <Text style={styles.tabText}>Nearby</Text>
        </TouchableOpacity>
      </View>

      {/* Feed Posts */}
      <ScrollView style={styles.feedContainer} showsVerticalScrollIndicator={false}>
        {posts.map(renderPost)}
      </ScrollView>
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
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#6B7280",
  },
  activeTabText: {
    color: "#6366F1",
  },
  feedContainer: {
    flex: 1,
    padding: 16,
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
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  postHeaderInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  userName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
  },
  providerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#6366F1",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  providerBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  timeAgo: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  postTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 12,
  },
  serviceBadge: {
    backgroundColor: "#4ECDC4",
  },
  requestBadge: {
    backgroundColor: "#FF6B6B",
  },
  offerBadge: {
    backgroundColor: "#96CEB4",
  },
  postTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
  },
  postTitle: {
    fontSize: 16,
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
  imagesContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  postImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginRight: 8,
  },
  detailsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 24,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  likedText: {
    color: "#FF6B6B",
  },
  commentContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  commentInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sendCommentBtn: {
    padding: 8,
  },
});