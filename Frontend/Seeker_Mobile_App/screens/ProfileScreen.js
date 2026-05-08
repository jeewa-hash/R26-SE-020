import React, { useState, useEffect } from 'react';
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
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const [showEditModal, setShowEditModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const [userData, setUserData] = useState({
    name: "Tashmi Perera",
    email: "tashmi.perera@example.com",
    phone: "+94 77 123 4567",
    location: "Colombo, Sri Lanka",
    memberSince: "January 2024",
    avatar: "https://i.pravatar.cc/150?img=7",
    starPoints: 1250,
    rating: 4.8,
    totalServices: 24,
    totalReviews: 128,
  });

  // Menu items
  const menuItems = [
    { id: 'bookings', title: 'My Bookings', icon: 'calendar', color: '#667eea', screen: 'BookingsScreen' },
    { id: 'mybids', title: 'My Bids', icon: 'gavel', color: '#4ECDC4', screen: 'MyBidsScreen' },
    { id: 'myposts', title: 'My Posts', icon: 'newspaper', color: '#45B7D1', screen: 'MyPostsScreen' },
    { id: 'history', title: 'Service History', icon: 'time', color: '#96CEB4', screen: 'HistoryScreen' },
    { id: 'starpoints', title: 'Star Points', icon: 'star', color: '#FBBF24', screen: 'StarPointsScreen' },
    { id: 'payment', title: 'Payment Methods', icon: 'card', color: '#FF6B6B', screen: 'PaymentScreen' },
    { id: 'settings', title: 'Settings', icon: 'settings', color: '#6B7280', screen: 'SettingsScreen' },
    { id: 'help', title: 'Help Center', icon: 'help-circle', color: '#667eea', screen: 'HelpScreen' },
  ];

  const handleMenuPress = (screen) => {
    navigation.navigate(screen);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const renderStars = (rating) => {
    let stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 1; i <= fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={14} color="#FBBF24" />);
    }
    
    const emptyStars = 5 - stars.length;
    for (let i = 1; i <= emptyStars; i++) {
      stars.push(<Ionicons key={`empty-${i}`} name="star-outline" size={14} color="#FBBF24" />);
    }
    
    return stars;
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
      />
      
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#667eea']} />}
      >
        {/* Header with Gradient */}
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2', '#f093fb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>My Profile</Text>
            <TouchableOpacity onPress={() => setShowEditModal(true)} style={styles.editButton}>
              <Ionicons name="create-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Profile Info */}
          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <Image source={{ uri: userData.avatar }} style={styles.avatar} />
              <TouchableOpacity style={styles.cameraIcon} onPress={() => setShowEditModal(true)}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.userName}>{userData.name}</Text>
            <View style={styles.locationContainer}>
              <Ionicons name="location-outline" size={14} color="#ffffffcc" />
              <Text style={styles.locationText}>{userData.location}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <View style={styles.starsContainer}>{renderStars(userData.rating)}</View>
              <Text style={styles.ratingText}>{userData.rating} ⭐</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.totalServices}</Text>
              <Text style={styles.statLabel}>Services</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.starPoints}</Text>
              <Text style={styles.statLabel}>Star Points</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userData.totalReviews}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.menuItem, isDarkMode && styles.menuItemDark]}
              onPress={() => handleMenuPress(item.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.menuTitle, isDarkMode && styles.textDark]}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton}>
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          >
            <Ionicons name="log-out-outline" size={20} color="#fff" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} transparent={true} animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, isDarkMode && styles.modalContainerDark]}>
            <LinearGradient colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>
            <ScrollView style={styles.modalBody}>
              <TouchableOpacity style={[styles.changePhotoButton, isDarkMode && styles.changePhotoButtonDark]}>
                <Ionicons name="camera" size={24} color="#667eea" />
                <Text style={styles.changePhotoText}>Change Profile Photo</Text>
              </TouchableOpacity>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Full Name</Text>
                <TextInput 
                  style={[styles.input, isDarkMode && styles.inputDark]} 
                  value={userData.name} 
                  onChangeText={(text) => setUserData({...userData, name: text})}
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Email</Text>
                <TextInput 
                  style={[styles.input, isDarkMode && styles.inputDark]} 
                  value={userData.email} 
                  onChangeText={(text) => setUserData({...userData, email: text})} 
                  keyboardType="email-address"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Phone</Text>
                <TextInput 
                  style={[styles.input, isDarkMode && styles.inputDark]} 
                  value={userData.phone} 
                  onChangeText={(text) => setUserData({...userData, phone: text})} 
                  keyboardType="phone-pad"
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, isDarkMode && styles.textDark]}>Location</Text>
                <TextInput 
                  style={[styles.input, isDarkMode && styles.inputDark]} 
                  value={userData.location} 
                  onChangeText={(text) => setUserData({...userData, location: text})}
                  placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
                />
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={() => setShowEditModal(false)}>
                <LinearGradient colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']} style={styles.saveGradient}>
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bottom Navigation */}
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
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
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInfo: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#667eea',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  locationText: {
    fontSize: 13,
    color: '#ffffffcc',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingText: {
    fontSize: 13,
    color: '#ffffffcc',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#ffffff20',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#ffffffcc',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#ffffff30',
  },
  menuContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  menuItemDark: {
    backgroundColor: '#16213e',
  },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  menuTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 30,
    borderRadius: 14,
    overflow: 'hidden',
  },
  logoutGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
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
  modalContainerDark: {
    backgroundColor: '#16213e',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
  changePhotoButtonDark: {
    borderColor: '#2d3561',
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
  inputDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
    color: '#fff',
  },
  saveButton: {
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 12,
  },
  saveGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});