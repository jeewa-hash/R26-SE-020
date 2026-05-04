import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('bookings');
  const [showEditModal, setShowEditModal] = useState(false);
  const [userData, setUserData] = useState({
    name: "Tashmi Perera",
    email: "tashmi.perera@example.com",
    phone: "+94 77 123 4567",
    location: "Colombo, Sri Lanka",
    memberSince: "January 2024",
    avatar: "https://i.pravatar.cc/150?img=7",
    starPoints: 1250,
    rating: 4.8,
  });

  // Weekly spend data
  const weeklySpend = [
    { day: "Mon", amount: 45 },
    { day: "Tue", amount: 120 },
    { day: "Wed", amount: 30 },
    { day: "Thu", amount: 85 },
    { day: "Fri", amount: 200 },
    { day: "Sat", amount: 150 },
    { day: "Sun", amount: 60 },
  ];

  const maxAmount = Math.max(...weeklySpend.map(item => item.amount));

  // Active bookings data
  const activeBookings = [
    {
      id: 1,
      title: "HVAC Repair & Cleaning",
      provider: "John Miller",
      time: "2:00 PM",
      date: "Today",
      status: "active",
      image: "https://randomuser.me/api/portraits/men/1.jpg",
    },
    {
      id: 2,
      title: "Kitchen Plumbing",
      provider: "Home Services",
      time: "10:00 AM",
      date: "Tomorrow",
      status: "scheduled",
      image: "https://randomuser.me/api/portraits/men/2.jpg",
    },
  ];

  // Completed services history
  const completedServices = [
    {
      id: 3,
      title: "Electrical Wiring",
      provider: "Apex Electrical",
      date: "Mar 15, 2024",
      price: "$180",
      rating: 5,
      image: "https://randomuser.me/api/portraits/men/1.jpg",
    },
    {
      id: 4,
      title: "Garden Maintenance",
      provider: "Green Thumb",
      date: "Mar 10, 2024",
      price: "$95",
      rating: 4,
      image: "https://randomuser.me/api/portraits/men/2.jpg",
    },
  ];

  // User created posts
  const userPosts = [
    {
      id: 1,
      title: "Looking for experienced plumber",
      description: "Need urgent plumbing service for bathroom renovation. Must have 5+ years experience.",
      budget: "$200 - $300",
      date: "Posted on Mar 20, 2024",
      status: "open",
      responses: 5,
      image: "https://images.unsplash.com/photo-1585704032916-cf2ac0922b1b?w=100",
    },
    {
      id: 2,
      title: "House cleaning service needed",
      description: "Need weekly house cleaning service for 3 bedroom apartment. Eco-friendly products preferred.",
      budget: "$50 - $80 per visit",
      date: "Posted on Mar 18, 2024",
      status: "open",
      responses: 8,
      image: "https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=100",
    },
    {
      id: 3,
      title: "AC repair and maintenance",
      description: "Split AC not cooling properly. Need immediate repair service.",
      budget: "$100 - $150",
      date: "Posted on Mar 15, 2024",
      status: "closed",
      responses: 3,
      image: "https://images.unsplash.com/photo-1629131722305-f2f2b2c9ebf3?w=100",
    },
  ];

  const renderStars = (rating) => {
    let stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 1; i <= fullStars; i++) {
      stars.push(
        <Ionicons
          key={`star-${i}`}
          name="star"
          size={14}
          color="#FBBF24"
        />
      );
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 1; i <= emptyStars; i++) {
      stars.push(
        <Ionicons
          key={`empty-${i}`}
          name="star-outline"
          size={14}
          color="#FBBF24"
        />
      );
    }
    
    return stars;
  };

  const handleEditPost = (post) => {
    Alert.alert("Edit Post", `Edit "${post.title}"?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Edit", onPress: () => navigation.navigate("CreatePostScreen", { post }) }
    ]);
  };

  const handleDeletePost = (post) => {
    Alert.alert(
      "Delete Post",
      `Are you sure you want to delete "${post.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: () => Alert.alert("Deleted", "Post has been deleted") }
      ]
    );
  };

  const handleViewResponses = (post) => {
    Alert.alert("Responses", `${post.responses} provider(s) have responded to this post`);
  };

  const handleWriteReview = (service) => {
    navigation.navigate("FeedbackScreen", { service });
  };

  const handleMessageProvider = (booking) => {
    navigation.navigate("ChatScreen", { 
      provider: booking.provider,
      bookingId: booking.id 
    });
  };

  const handleReschedule = (booking) => {
    Alert.alert(
      "Reschedule",
      `Would you like to reschedule ${booking.title}?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Reschedule", onPress: () => navigation.navigate("RescheduleScreen", { booking }) }
      ]
    );
  };

  const handleViewProvider = (provider) => {
    navigation.navigate("ProvidersScreen", { provider });
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Simple Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
            <Ionicons name="create-outline" size={22} color="#667eea" />
          </TouchableOpacity>
        </View>

        {/* Profile Info - Make it clickable to navigate to profile edit */}
        <TouchableOpacity 
          style={styles.profileSection}
          onPress={() => setShowEditModal(true)}
          activeOpacity={0.7}
        >
          <View style={styles.avatarSection}>
            <Image source={{ uri: userData.avatar }} style={styles.avatar} />
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </View>
          
          <Text style={styles.userName}>{userData.name}</Text>
          
          <View style={styles.locationContainer}>
            <Ionicons name="location-outline" size={14} color="#6B7280" />
            <Text style={styles.locationText}>{userData.location}</Text>
            <View style={styles.dot} />
            <Ionicons name="calendar-outline" size={14} color="#6B7280" />
            <Text style={styles.memberText}>Member since {userData.memberSince}</Text>
          </View>
          
          <View style={styles.ratingWrapper}>
            <View style={styles.starsContainer}>
              {renderStars(userData.rating)}
            </View>
            <Text style={styles.ratingValue}>{userData.rating}</Text>
          </View>
        </TouchableOpacity>

        {/* Star Points - Clickable to view points history */}
        <TouchableOpacity 
          style={styles.starPointsContainer}
          onPress={() => navigation.navigate("StarPointsScreen")}
        >
          <Ionicons name="star" size={18} color="#FBBF24" />
          <Text style={styles.starPointsText}>{userData.starPoints} Star Points</Text>
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Weekly Spend Chart - Clickable to view detailed analytics */}
        <TouchableOpacity 
          style={styles.chartContainer}
          onPress={() => navigation.navigate("SpendAnalyticsScreen")}
        >
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Weekly Spend</Text>
            <Ionicons name="bar-chart-outline" size={18} color="#667eea" />
          </View>
          <View style={styles.chartBars}>
            {weeklySpend.map((item, index) => (
              <View key={index} style={styles.chartBarItem}>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: (item.amount / maxAmount) * 100,
                        backgroundColor: item.amount === maxAmount ? '#667eea' : '#E0E7FF'
                      }
                    ]} 
                  />
                  <Text style={styles.barAmount}>${item.amount}</Text>
                </View>
                <Text style={styles.barDay}>{item.day}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>

        {/* Tab Navigation */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'bookings' && styles.activeTab]}
            onPress={() => setActiveTab('bookings')}
          >
            <Text style={[styles.tabText, activeTab === 'bookings' && styles.activeTabText]}>Bookings</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'myposts' && styles.activeTab]}
            onPress={() => setActiveTab('myposts')}
          >
            <Text style={[styles.tabText, activeTab === 'myposts' && styles.activeTabText]}>My Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
          </TouchableOpacity>
        </View>

        {/* Bookings Tab Content */}
        {activeTab === 'bookings' && (
          <View style={styles.section}>
            {activeBookings.map((booking) => (
              <View key={booking.id} style={styles.bookingCardLarge}>
                <TouchableOpacity 
                  style={styles.bookingLargeHeader}
                  onPress={() => handleViewProvider(booking.provider)}
                >
                  <Image source={{ uri: booking.image }} style={styles.providerImageLarge} />
                  <View style={styles.bookingLargeInfo}>
                    <Text style={styles.bookingTitleLarge}>{booking.title}</Text>
                    <Text style={styles.providerNameLarge}>{booking.provider}</Text>
                    <View style={styles.bookingLargeDetails}>
                      <Ionicons name="calendar-outline" size={14} color="#6B7280" />
                      <Text style={styles.bookingDetailText}>{booking.date}</Text>
                      <Ionicons name="time-outline" size={14} color="#6B7280" />
                      <Text style={styles.bookingDetailText}>{booking.time}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <View style={styles.bookingActions}>
                  <TouchableOpacity 
                    style={styles.messageButton}
                    onPress={() => handleMessageProvider(booking)}
                  >
                    <Ionicons name="chatbubble-outline" size={18} color="#667eea" />
                    <Text style={styles.messageButtonText}>Message</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.rescheduleButton}
                    onPress={() => handleReschedule(booking)}
                  >
                    <Ionicons name="time-outline" size={18} color="#fff" />
                    <Text style={styles.rescheduleButtonText}>Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* My Posts Tab Content */}
        {activeTab === 'myposts' && (
          <View style={styles.section}>
            {userPosts.map((post) => (
              <View key={post.id} style={styles.postCard}>
                <TouchableOpacity 
                  style={styles.postHeader}
                  onPress={() => navigation.navigate("PostDetailScreen", { post })}
                >
                  <Image source={{ uri: post.image }} style={styles.postImage} />
                  <View style={styles.postInfo}>
                    <Text style={styles.postTitle}>{post.title}</Text>
                    <Text style={styles.postDate}>{post.date}</Text>
                  </View>
                  <View style={[styles.postStatus, post.status === 'open' ? styles.statusOpen : styles.statusClosed]}>
                    <Text style={styles.postStatusText}>{post.status === 'open' ? 'Open' : 'Closed'}</Text>
                  </View>
                </TouchableOpacity>
                
                <Text style={styles.postDescription} numberOfLines={2}>
                  {post.description}
                </Text>
                
                <View style={styles.postDetails}>
                  <View style={styles.postBudget}>
                    <Ionicons name="cash-outline" size={16} color="#667eea" />
                    <Text style={styles.postBudgetText}>{post.budget}</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleViewResponses(post)}>
                    <Text style={styles.postResponses}>{post.responses} responses</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.postActions}>
                  <TouchableOpacity style={styles.editPostButton} onPress={() => handleEditPost(post)}>
                    <Ionicons name="create-outline" size={18} color="#667eea" />
                    <Text style={styles.editPostText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deletePostButton} onPress={() => handleDeletePost(post)}>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deletePostText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            
            <TouchableOpacity style={styles.createPostButton} onPress={() => navigation.navigate("CreatePostScreen")}>
              <Ionicons name="add-circle-outline" size={24} color="#fff" />
              <Text style={styles.createPostButtonText}>Create New Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* History Tab Content */}
        {activeTab === 'history' && (
          <View style={styles.section}>
            {completedServices.map((service) => (
              <View key={service.id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyTitle}>{service.title}</Text>
                  <Text style={styles.historyPrice}>{service.price}</Text>
                </View>
                <Text style={styles.historyProvider}>{service.provider}</Text>
                <Text style={styles.historyDate}>{service.date}</Text>
                <View style={styles.historyFooter}>
                  <View style={styles.historyStars}>
                    {renderStars(service.rating)}
                  </View>
                  <TouchableOpacity 
                    style={styles.reviewLink}
                    onPress={() => handleWriteReview(service)}
                  >
                    <Text style={styles.reviewLinkText}>Write a Review</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity style={styles.changePhotoButton}>
                <Ionicons name="camera" size={24} color="#667eea" />
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </TouchableOpacity>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput 
                  style={styles.input} 
                  value={userData.name} 
                  onChangeText={(text) => setUserData({...userData, name: text})}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput 
                  style={styles.input} 
                  value={userData.email} 
                  onChangeText={(text) => setUserData({...userData, email: text})}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone</Text>
                <TextInput 
                  style={styles.input} 
                  value={userData.phone} 
                  onChangeText={(text) => setUserData({...userData, phone: text})}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Location</Text>
                <TextInput 
                  style={styles.input} 
                  value={userData.location} 
                  onChangeText={(text) => setUserData({...userData, location: text})}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => setShowEditModal(false)}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  editButton: {
    padding: 4,
  },
  profileSection: {
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#667eea',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 6,
  },
  memberText: {
    fontSize: 13,
    color: '#6B7280',
    marginLeft: 4,
  },
  ratingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1F2937',
  },
  starPointsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  starPointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  chartContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  chartBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  chartBarItem: {
    alignItems: 'center',
    flex: 1,
  },
  barWrapper: {
    alignItems: 'center',
    marginBottom: 8,
  },
  bar: {
    width: 30,
    borderRadius: 8,
    marginBottom: 6,
  },
  barAmount: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '500',
  },
  barDay: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#667eea',
  },
  tabText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#fff',
  },
  section: {
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  bookingCardLarge: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  bookingLargeHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  providerImageLarge: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
  bookingLargeInfo: {
    flex: 1,
  },
  bookingTitleLarge: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  providerNameLarge: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  bookingLargeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookingDetailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  bookingActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  messageButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  rescheduleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: '#667eea',
  },
  rescheduleButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  postHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  postImage: {
    width: 50,
    height: 50,
    borderRadius: 10,
    marginRight: 12,
  },
  postInfo: {
    flex: 1,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  postDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  postStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusOpen: {
    backgroundColor: '#D1FAE5',
  },
  statusClosed: {
    backgroundColor: '#FEE2E2',
  },
  postStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  postDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  postDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  postBudget: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  postBudgetText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  postResponses: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '500',
  },
  postActions: {
    flexDirection: 'row',
    gap: 12,
  },
  editPostButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#667eea',
  },
  editPostText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  deletePostButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  deletePostText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  createPostButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  historyPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea',
  },
  historyProvider: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 10,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewLink: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  reviewLinkText: {
    fontSize: 11,
    color: '#667eea',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalBody: {
    padding: 20,
  },
  changePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    marginBottom: 20,
  },
  changePhotoText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
  },
  saveButton: {
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});