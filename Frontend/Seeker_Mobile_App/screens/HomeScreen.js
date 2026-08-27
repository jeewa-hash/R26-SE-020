import React, { useContext, useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Image, SafeAreaView, LayoutAnimation, Platform,
  UIManager, Dimensions, Alert, FlatList, StatusBar
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../context/LanguageContext';
import { getSlideshowData } from '../data/seasonalData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { IP_ADDRESS } from '../config';
import { useChat } from '../context/ChatContext'; // ✅ For real chat unread count

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;

// Android layout animation fix
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !global.nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const SUGGESTED_PROVIDERS = [
  {
    id: 's1',
    name: 'Dilshan Perera',
    category: 'Electrical',
    rating: 4.9,
    reviews: 124,
    distance: '1.2 km',
    image: 'https://randomuser.me/api/portraits/men/32.jpg',
    isOnline: true,
    reason: 'Top Rated in Electrical'
  },
  {
    id: 's2',
    name: 'Saman Kumara',
    category: 'Plumbing',
    rating: 4.8,
    reviews: 89,
    distance: '0.8 km',
    image: 'https://randomuser.me/api/portraits/men/45.jpg',
    isOnline: false,
    reason: 'Recently Used Category'
  },
  {
    id: 's3',
    name: 'Priya Silva',
    category: 'Cleaning',
    rating: 4.7,
    reviews: 156,
    distance: '2.5 km',
    image: 'https://randomuser.me/api/portraits/women/44.jpg',
    isOnline: true,
    reason: 'Nearby in Cleaning'
  },
  {
    id: 's4',
    name: 'Aruna Jayasuriya',
    category: 'Gardening',
    rating: 4.9,
    reviews: 67,
    distance: '3.1 km',
    image: 'https://randomuser.me/api/portraits/men/62.jpg',
    isOnline: true,
    reason: 'Most Used Category'
  }
];

const CATEGORIES = [
  {
    id: 1, title: 'Repairing Services', icon: 'build', color: '#FF6B6B',
    subcategories: ['Electrical', 'Plumbing', 'Furniture', 'Painting & Reno']
  },
  {
    id: 2, title: 'Cleaning Services', icon: 'cleaning-services', color: '#4ECDC4',
    subcategories: ['House Cleaning', 'Post-Construction', 'Move-in/out', 'Sofa/Carpet']
  },
  {
    id: 3, title: 'Gardening Services', icon: 'grass', color: '#45B7D1',
    subcategories: ['Maintenance', 'Landscaping', 'Planting']
  },
  {
    id: 4, title: 'Care & Personal', icon: 'volunteer-activism', color: '#96CEB4',
    subcategories: ['Child Care', 'Elderly Care', 'Pet Care', 'Personal Asst']
  }
];

// ─── Slideshow Component ────────────────────────────────
const Slideshow = () => {
  const navigation = useNavigation();
  const flatListRef = useRef();
  const [currentIndex, setCurrentIndex] = useState(0);
  const slideshowData = getSlideshowData();

  useEffect(() => {
    const interval = setInterval(() => {
      if (flatListRef.current && slideshowData.length > 0) {
        const nextIndex = (currentIndex + 1) % slideshowData.length;
        setCurrentIndex(nextIndex);
        flatListRef.current.scrollToIndex({ index: nextIndex, animated: true });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [currentIndex, slideshowData.length]);

  const renderSlide = ({ item }) => (
    <TouchableOpacity
      style={styles.slideCard}
      onPress={() => navigation.navigate("SeasonalDemandsScreen")}
      activeOpacity={0.95}
    >
      <Image source={{ uri: item.image }} style={styles.slideImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.slideOverlay}
      >
        <View style={styles.slideContent}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          <View style={styles.slideButton}>
            <Text style={styles.slideButtonText}>Explore Now →</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  const renderDot = () => (
    <View style={styles.dotContainer}>
      {slideshowData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            currentIndex === index && styles.activeDot,
          ]}
        />
      ))}
    </View>
  );

  if (slideshowData.length === 0) return null;

  return (
    <View style={styles.slideshowContainer}>
      <FlatList
        ref={flatListRef}
        data={slideshowData}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / (width - 32));
          setCurrentIndex(index);
        }}
      />
      {renderDot()}
    </View>
  );
};

// ─── Service Card Component ──────────────────────────────
const ServiceCard = ({ category, expanded, onPress, onSubPress, onImageUpload, isDarkMode }) => {
  return (
    <View style={[styles.accordionContainer, isDarkMode && styles.accordionContainerDark]}>
      <TouchableOpacity
        style={styles.mainCategory}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.mainCategoryLeft}>
          <LinearGradient
            colors={[category.color, `${category.color}CC`]}
            style={styles.iconBoxGradient}
          >
            <MaterialIcons name={category.icon} size={22} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={[styles.mainTitle, isDarkMode && styles.textDark]}>{category.title}</Text>
            <Text style={[styles.subtitleCount, isDarkMode && styles.textMutedDark]}>{category.subcategories.length} services available</Text>
          </View>
        </View>
        <View style={[styles.expandIcon, isDarkMode && styles.expandIconDark, expanded && styles.expandIconActive]}>
          <MaterialIcons
            name={expanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
            size={24}
            color={isDarkMode ? "#818cf8" : "#667eea"}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={[styles.subGrid, isDarkMode && styles.subGridDark]}>
          {category.subcategories.map((sub, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.subThumbnail, isDarkMode && styles.subThumbnailDark]}
              onPress={() => onSubPress(sub)}
            >
              <View style={[styles.subIconCircle, { backgroundColor: `${category.color}15` }]}>
                <MaterialIcons name="check-circle" size={14} color={category.color} />
              </View>
              <Text style={[styles.subText, isDarkMode && styles.textDark]}>{sub}</Text>
            </TouchableOpacity>
          ))}

          {category.id === 1 && (
            <TouchableOpacity style={styles.specialUploadBtn} activeOpacity={0.8} onPress={onImageUpload}>
              <LinearGradient
                colors={isDarkMode ? ['#6366f1', '#4f46e5'] : ['#667eea', '#764ba2']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Feather name="camera" size={18} color="#fff" />
                <Text style={styles.uploadText}>Upload Photo for Repair</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Main Component ──────────────────────────────────────
export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);
  const { user } = useAuth();
  const { isDarkMode } = useTheme();
  const { unreadCount } = useChat(); // ✅ Get unread message counts

  const [userState, setUserState] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const navigation = useNavigation();

  // ✅ Total unread messages across all chats
  const totalUnreadMessages = Object.values(unreadCount).reduce(
    (sum, count) => sum + count,
    0
  );

  const loadUserDetails = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUserState(parsedUser);
      }
    } catch (error) {
      console.log("Error loading user:", error);
    }
  }, []);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setNotificationUnreadCount(0);
        return;
      }
      const response = await fetch(`${API_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const notifications = Array.isArray(data) ? data : (data.data || []);
        const unread = notifications.filter((n) => !n.isRead).length;
        setNotificationUnreadCount(unread);
      } else {
        setNotificationUnreadCount(0);
      }
    } catch (err) {
      console.log('Error fetching notifications count:', err);
      setNotificationUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    loadUserDetails();
    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(intervalId);
  }, [loadUserDetails, fetchUnreadCount]);

  const displayUser = user || userState;

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleProfilePress = () => {
    navigation.navigate("ProfileScreen");
  };

  const handleChatPress = () => {
    navigation.navigate("ChatListScreen");
  };

  const handleNotifications = () => {
    navigation.navigate("NotificationScreen");
  };

  const handleSubCategoryPress = (subcategory) => {
    Alert.alert('Service Selected', `${subcategory} service will be available soon`);
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) return;

    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('🔑 Token for text search:', token);

      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      const appLanguage = language === 'si' ? 'si' : 'en';
      const url = `http://10.0.2.2:5002/text-predict`;
      console.log('🌐 URL:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: searchQuery,
          app_lan: appLanguage,
        }),
      });

      console.log('📡 Response status:', response.status);

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        return;
      }

      const data = await response.json();
      console.log('📦 Response data:', data);

      if (data.session_id) {
        navigation.navigate('FollowUpScreen', {
          initialMessage: searchQuery,
          backendResponse: data,
          source: 'text',
        });
      } else {
        Alert.alert('Error', data.error || 'Unable to process your request.');
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Network Error', 'Could not connect to the service.');
    }
  };

  const handleImageUpload = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common_error'), t('home_permission_gallery'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const imageUri = result.assets[0].uri;
      const formData = new FormData();

      formData.append('file', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });
      formData.append('app_lan', language === 'si' ? 'si' : 'en');

      const response = await fetch('http://10.0.2.2:8000/predict', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        return;
      }

      const data = await response.json();

      if (data.session_id) {
        Alert.alert(
          t('home_detection_result'),
          `${data.agent_speech}`,
          [
            {
              text: t('common_ok'),
              onPress: () => {
                navigation.navigate('FollowUpScreen', {
                  session_id: data.session_id,
                  initialQuestion: data.next_question,
                  category: data.category,
                  source: 'image',
                });
              }
            }
          ]
        );
      } else {
        Alert.alert(t('common_error'), t('home_no_object_detected'));
      }
    } catch (error) {
      console.log('UPLOAD ERROR:', error);
      Alert.alert(t('common_error'), 'Server connection failed. Please check if the backend is running.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Header ─── */}
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#4765eb', '#926ee7', '#9d6aa3']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>{t('good_morning')}</Text>
              <Text style={styles.userName}>
                {displayUser?.name ? `${displayUser.name} 👋` : "User 👋"}
              </Text>
              <Text style={styles.subGreeting}>{t('what_help_today')}</Text>
            </View>
            <View style={styles.headerActions}>
              {/* ── Chat Icon with real unread count ── */}
              <TouchableOpacity style={styles.iconBtn} onPress={handleChatPress}>
                <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
                {totalUnreadMessages > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Notification Icon ── */}
              <TouchableOpacity style={styles.iconBtn} onPress={handleNotifications}>
                <Ionicons name="notifications-outline" size={22} color="#fff" />
                {notificationUnreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* ── Profile ── */}
              <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
                <Image
                  source={{
                    uri: displayUser?.profileImage || displayUser?.avatar || 'https://i.pravatar.cc/150?img=7'
                  }}
                  style={styles.profilePic}
                />
                <View style={styles.onlineDot} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* ─── Search Bar ─── */}
        <View style={styles.searchWrapper}>
          <View style={[
            styles.searchContainer,
            isDarkMode && styles.searchContainerDark,
            isSearchFocused && styles.searchContainerFocused
          ]}>
            <Feather name="search" size={20} color={isDarkMode ? "#818cf8" : "#667eea"} />
            <TextInput
              placeholder={t('search_placeholder')}
              placeholderTextColor={isDarkMode ? "#94A3B8" : "#999"}
              style={[styles.searchInput, isDarkMode && styles.textDark]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
                <Feather name="x" size={18} color={isDarkMode ? "#94A3B8" : "#999"} />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.filterIcon, isDarkMode && styles.filterIconDark]}>
              <Feather name="sliders" size={20} color={isDarkMode ? "#818cf8" : "#667eea"} />
            </TouchableOpacity>
          </View>

          {showFilters && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filterChips}
              contentContainerStyle={styles.filterChipsContent}
            >
              <TouchableOpacity style={styles.filterChipActive}>
                <Text style={styles.filterChipTextActive}>Nearby</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>Top Rated</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>Lowest Price</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>Available Now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>24/7 Support</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* ─── Unlock New Feature Banner ─── */}
        <TouchableOpacity onPress={() => toggleExpand(1)} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.biddingBanner}
          >
            <View style={styles.biddingContent}>
              <View style={styles.biddingIconContainer}>
                <MaterialIcons name="image-search" size={32} color="#fff" />
              </View>
              <View style={styles.biddingTextContainer}>
                <Text style={styles.biddingTitle}>🔓 Unlock New Feature</Text>
                <Text style={styles.biddingSubtitle}>Search repairs by uploading a photo</Text>
              </View>
              <View style={styles.biddingArrow}>
                <Feather name={expandedId === 1 ? 'chevron-up' : 'chevron-down'} size={24} color="#fff" />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        {/* ─── Slideshow ─── */}
        <Slideshow />

        {/* ─── Service Section ─── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>{t('all_services')}</Text>
            <Text style={[styles.sectionSubtitle, isDarkMode && styles.textMutedDark]}>Browse by category</Text>
          </View>
          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={[styles.seeAllText, isDarkMode && styles.seeAllTextDark]}>{t('home_see_all')}</Text>
            <Feather name="arrow-right" size={14} color={isDarkMode ? "#818cf8" : "#667eea"} />
          </TouchableOpacity>
        </View>

        {/* ─── Expandable Categories ─── */}
        {CATEGORIES.map((cat) => (
          <ServiceCard
            key={cat.id}
            category={cat}
            expanded={expandedId === cat.id}
            onPress={() => toggleExpand(cat.id)}
            onSubPress={handleSubCategoryPress}
            onImageUpload={handleImageUpload}
            isDarkMode={isDarkMode}
          />
        ))}

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
  scrollContent: {
    paddingBottom: 80,
  },

  // Header
  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 40,
    paddingTop: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    fontSize: 12,
    color: '#ffffffCC',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  userName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
    marginBottom: 4,
  },
  subGreeting: {
    color: '#ffffffCC',
    fontSize: 13,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    position: 'relative',
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileBtn: {
    position: 'relative',
  },
  profilePic: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: '#fff',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Search
  searchWrapper: {
    paddingHorizontal: 20,
    marginTop: -20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    gap: 10,
  },
  searchContainerFocused: {
    shadowOpacity: 0.15,
    shadowRadius: 15,
    borderWidth: 1,
    borderColor: '#667eea20',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 0,
  },
  clearBtn: {
    padding: 2,
  },
  filterIcon: {
    paddingLeft: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E5E7EB',
  },
  filterChips: {
    marginTop: 12,
  },
  filterChipsContent: {
    paddingRight: 20,
  },
  filterChip: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterChipTextActive: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },

  // Bidding Banner
  biddingBanner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  biddingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  biddingIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  biddingTextContainer: {
    flex: 1,
  },
  biddingTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  biddingSubtitle: {
    fontSize: 12,
    color: '#ffffffCC',
  },
  biddingArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Slideshow
  slideshowContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  slideCard: {
    width: width - 32,
    height: 180,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  slideOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
    padding: 16,
  },
  slideContent: {
    marginBottom: 16,
  },
  slideTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 12,
    color: '#ffffffCC',
    marginBottom: 12,
  },
  slideButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  slideButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#667eea',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 30,
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a2e',
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#999',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: '#667eea',
    fontSize: 13,
    fontWeight: '600',
  },

  // Accordion
  accordionContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  mainCategory: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainCategoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 14,
  },
  iconBoxGradient: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 2,
  },
  subtitleCount: {
    fontSize: 11,
    color: '#999',
  },
  expandIcon: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  expandIconActive: {
    backgroundColor: '#667eea15',
  },
  subGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    borderTopWidth: 1,
    borderColor: '#E8ECF0',
    paddingTop: 16,
    justifyContent: 'space-between',
    gap: 10,
  },
  subThumbnail: {
    width: (width - 104) / 2,
    backgroundColor: '#F8F9FA',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8ECF0',
    gap: 8,
  },
  subIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
  },
  specialUploadBtn: {
    width: '100%',
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  gradientButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  // Dark Mode
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
  searchContainerDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    shadowColor: '#000',
    shadowOpacity: 0.25,
  },
  filterIconDark: {
    borderLeftColor: '#2d3561',
  },
  filterChipDark: {
    backgroundColor: '#242f4d',
  },
  accordionContainerDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
  },
  expandIconDark: {
    backgroundColor: '#242f4d',
  },
  subGridDark: {
    borderColor: '#2d3561',
  },
  subThumbnailDark: {
    backgroundColor: '#242f4d',
    borderColor: '#2d3561',
  },
  seeAllTextDark: {
    color: '#818cf8',
  },
});