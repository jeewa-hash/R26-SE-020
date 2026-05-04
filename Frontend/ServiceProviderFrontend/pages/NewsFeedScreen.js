import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text, Card, Avatar, IconButton, Chip, Divider, Searchbar } from 'react-native-paper';
import { Colors } from '../theme';

const POSTS = [
  {
    id: '1',
    customer: 'Kamal Perera',
    avatar: 'K',
    location: 'Colombo 03',
    time: '2 mins ago',
    category: 'Plumbing',
    description: 'Need an experienced plumber to fix a leaking pipe in my kitchen. Urgent! Available today afternoon.',
    budget: 'Rs. 2,000 - 4,000',
    likes: 4,
    comments: 2,
    urgent: true,
  },
  {
    id: '2',
    customer: 'Nimali Silva',
    avatar: 'N',
    location: 'Kandy',
    time: '15 mins ago',
    category: 'Electrical',
    description: 'Looking for an electrician to install 3 ceiling fans and fix a faulty switch board in my house.',
    budget: 'Rs. 5,000 - 8,000',
    likes: 7,
    comments: 3,
    urgent: false,
  },
  {
    id: '3',
    customer: 'Ruwan Fernando',
    avatar: 'R',
    location: 'Gampaha',
    time: '1 hour ago',
    category: 'Cleaning',
    description: 'Need deep cleaning service for a 3 bedroom house before moving in. Prefer this weekend.',
    budget: 'Rs. 8,000 - 12,000',
    likes: 12,
    comments: 5,
    urgent: false,
  },
  {
    id: '4',
    customer: 'Priya Raj',
    avatar: 'P',
    location: 'Jaffna',
    time: '2 hours ago',
    category: 'Painting',
    description: 'Looking for a painter to repaint the exterior walls of my house. Two floors. Need quality work.',
    budget: 'Rs. 25,000 - 40,000',
    likes: 9,
    comments: 6,
    urgent: false,
  },
  {
    id: '5',
    customer: 'Suresh Kumar',
    avatar: 'S',
    location: 'Negombo',
    time: '3 hours ago',
    category: 'AC Repair',
    description: 'My AC unit is not cooling properly. Need a technician to service and repair it as soon as possible.',
    budget: 'Rs. 3,000 - 6,000',
    likes: 3,
    comments: 1,
    urgent: true,
  },
];

const CATEGORIES = ['All', 'Plumbing', 'Electrical', 'Cleaning', 'Painting', 'AC Repair'];

const categoryColors = {
  Plumbing: '#2196F3',
  Electrical: '#FF9800',
  Cleaning: '#4CAF50',
  Painting: '#9C27B0',
  'AC Repair': '#00BCD4',
};

export default function NewsFeedScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [likedPosts, setLikedPosts] = useState([]);

  const toggleLike = (postId) => {
    setLikedPosts((prev) =>
      prev.includes(postId)
        ? prev.filter((id) => id !== postId)
        : [...prev, postId]
    );
  };

  const filteredPosts = POSTS.filter((post) => {
    const matchCategory =
      selectedCategory === 'All' || post.category === selectedCategory;
    const matchSearch =
      post.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.location.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <View style={styles.container}>

      {/* Top Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Service Requests</Text>
        <IconButton icon="bell-outline" size={24} onPress={() => {}} />
      </View>

      {/* Search Bar */}
      <Searchbar
        placeholder="Search by service, location..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={styles.searchBar}
        inputStyle={{ fontSize: 14 }}
      />

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContent}
      >
        {CATEGORIES.map((cat) => (
          <Chip
            key={cat}
            selected={selectedCategory === cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.categoryChip,
              selectedCategory === cat && styles.categoryChipSelected,
            ]}
            textStyle={{
              color: selectedCategory === cat ? Colors.white : Colors.text,
              fontSize: 13,
            }}
          >
            {cat}
          </Chip>
        ))}
      </ScrollView>

      <Divider />

      {/* Posts Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        {filteredPosts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No requests found</Text>
          </View>
        ) : (
          filteredPosts.map((post) => (
            <Card key={post.id} style={styles.postCard}>
              <View style={styles.postHeader}>

                {/* Avatar + Info */}
                <View style={styles.postUserInfo}>
                  <Avatar.Text
                    size={44}
                    label={post.avatar}
                    style={{ backgroundColor: Colors.primary }}
                    labelStyle={{ color: Colors.white }}
                  />
                  <View style={styles.postMeta}>
                    <Text style={styles.customerName}>{post.customer}</Text>
                    <Text style={styles.postLocation}>📍 {post.location}</Text>
                    <Text style={styles.postTime}>{post.time}</Text>
                  </View>
                </View>

                {/* Urgent Badge */}
                {post.urgent && (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>🔴 Urgent</Text>
                  </View>
                )}
              </View>

              {/* Category Tag */}
              <View style={styles.categoryTagRow}>
                <View style={[
                  styles.categoryTag,
                  { backgroundColor: categoryColors[post.category] + '20' },
                ]}>
                  <Text style={[
                    styles.categoryTagText,
                    { color: categoryColors[post.category] },
                  ]}>
                    {post.category}
                  </Text>
                </View>
              </View>

              {/* Description */}
              <Text style={styles.postDescription}>{post.description}</Text>

              {/* Budget */}
              <View style={styles.budgetRow}>
                <Text style={styles.budgetLabel}>💰 Budget: </Text>
                <Text style={styles.budgetValue}>{post.budget}</Text>
              </View>

              <Divider style={styles.divider} />

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => toggleLike(post.id)}
                >
                  <Text style={styles.actionIcon}>
                    {likedPosts.includes(post.id) ? '👍' : '👍🏻'}
                  </Text>
                  <Text style={[
                    styles.actionText,
                    likedPosts.includes(post.id) && { color: Colors.primary },
                  ]}>
                    {likedPosts.includes(post.id) ? post.likes + 1 : post.likes}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionButton}>
                  <Text style={styles.actionIcon}>💬</Text>
                  <Text style={styles.actionText}>{post.comments}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={() => {}}
                >
                  <Text style={styles.applyText}>Apply Now</Text>
                </TouchableOpacity>
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 8,
    backgroundColor: Colors.white,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },

  // Search
  searchBar: {
    margin: 12,
    borderRadius: 10,
    elevation: 0,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // Categories
  categoryScroll: {
    paddingLeft: 12,
    marginBottom: 8,
  },
  categoryContent: {
    paddingRight: 12,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryChipSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // Feed
  feedContent: {
    padding: 12,
    gap: 12,
    paddingBottom: 32,
  },

  // Post Card
  postCard: {
    borderRadius: 14,
    padding: 16,
    backgroundColor: Colors.white,
    elevation: 1,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  postUserInfo: {
    flexDirection: 'row',
    gap: 10,
  },
  postMeta: {
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.text,
  },
  postLocation: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  postTime: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 1,
  },

  // Urgent
  urgentBadge: {
    backgroundColor: '#FFF0F0',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  urgentText: {
    fontSize: 11,
    color: '#FF4444',
    fontWeight: '600',
  },

  // Category Tag
  categoryTagRow: {
    marginBottom: 10,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  categoryTagText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Description
  postDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    marginBottom: 10,
  },

  // Budget
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  budgetValue: {
    fontSize: 13,
    fontWeight: 'bold',
    color: Colors.success,
  },

  divider: {
    marginBottom: 10,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  applyButton: {
    marginLeft: 'auto',
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  applyText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.textLight,
  },
});