import React, { useContext, useState, useRef, useEffect, useLayoutEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Image, SafeAreaView, LayoutAnimation, Platform, 
  UIManager, Dimensions, Alert, FlatList 
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageContext } from '../context/LanguageContext';
import { getSlideshowData } from '../data/seasonalData';
import { IP_ADDRESS } from '../config';

const API_URL = `http://${IP_ADDRESS}:4003/seeker`;

// Enable smooth animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
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

// Slideshow Component using shared data
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
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.slideOverlay}
      >
        <View style={styles.slideContent}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          <View style={styles.slideButton}>
            <Text style={styles.slideButtonText}>Shop Now →</Text>
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

export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const navigation = useNavigation();

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
    navigation.navigate('NotificationsScreen');
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length > 0) {
      try {
        const appLanguage = language === 'si' ? 'si' : 'en';
        const res = await fetch(`http://${IP_ADDRESS}:5002/text-predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: searchQuery, app_lan: appLanguage }),
        });
        const data = await res.json();
        console.log("Search result:", data);
      } catch (error) {
        console.log("Search error:", error);
      }
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const response = await fetch(`${API_URL}/notifications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (response.ok) {
        const unread = data.filter(n => !n.isRead).length;
        // Adding 2 for the mock unread notifications
        setUnreadCount(unread + 2);
      }
    } catch (err) {
      console.log('Error fetching seeker notifications count:', err);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const intervalId = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(intervalId);
  }, []);

  const handleImageUpload = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        console.log("Image picked:", result.assets[0].uri);
        // Add actual upload logic here if needed
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick an image");
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity 
          style={styles.bellContainer} 
          onPress={handleNotifications}
        >
          <MaterialIcons name="notifications-none" size={28} color="#333" />
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
    });
  }, [navigation, unreadCount]);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    await AsyncStorage.removeItem('userRole');
    navigation.replace('Login');
  };

  const handleStartBidding = () => navigation.navigate("BiddingScreen");
  const handleCreatePost = () => navigation.navigate("CreatePostScreen");
  const handleGoToFeed = () => navigation.navigate("FeedScreen");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        
        {/* Header with Gradient */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{t('good_morning')}</Text>
              <Text style={styles.userName}>Tashmi 👋</Text>
              <Text style={styles.subGreeting}>{t('what_help_today')}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.chatBtn} onPress={handleChatPress}>
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>2</Text>
                </View>
                <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.profileBtn} onPress={handleProfilePress}>
                <Image source={{ uri: 'https://i.pravatar.cc/150?img=7' }} style={styles.profilePic} />
                <View style={styles.onlineDot} />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        {/* Search Bar with Filters */}
        <View style={styles.searchWrapper}>
          <View style={styles.searchContainer}>
            <TouchableOpacity onPress={handleSearch}>
              <MaterialIcons name="search" size={22} color="#667eea" />
            </TouchableOpacity>
            <TextInput 
              placeholder={t('search_placeholder')}
              placeholderTextColor="#999"
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <MaterialIcons name="close" size={20} color="#999" />
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={styles.filterIcon}>
              <MaterialIcons name="tune" size={22} color="#667eea" />
            </TouchableOpacity>
          </View>
          
          {showFilters && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterChips}>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_nearby')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_top_rated')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_lowest_price')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_available_now')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.filterChip}>
                <Text style={styles.filterChipText}>{t('home_support_24_7')}</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

        {/* Slideshow - Using shared data */}
        <Slideshow />

        {/* Action Buttons Row */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleStartBidding}>
            <LinearGradient
              colors={['#FF6B6B', '#FF8E53']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <MaterialIcons name="gavel" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('bidding')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleCreatePost}>
            <LinearGradient
              colors={['#4ECDC4', '#44B3A5']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <MaterialIcons name="post-add" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('create_post')}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleGoToFeed}>
            <LinearGradient
              colors={['#96CEB4', '#45B7D1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionGradient}
            >
              <MaterialIcons name="feed" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>{t('feed')}</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Suggested Service Providers - Facebook Style */}
        <View style={styles.suggestionsContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recommended for You</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsList}
          >
            {SUGGESTED_PROVIDERS.map((provider) => (
              <TouchableOpacity key={provider.id} style={styles.suggestionCard} activeOpacity={0.9}>
                <View style={styles.suggestionImageContainer}>
                  <Image source={{ uri: provider.image }} style={styles.suggestionImage} />
                  {provider.isOnline && <View style={styles.suggestionOnlineDot} />}
                  <View style={styles.suggestionReasonBadge}>
                    <Text style={styles.suggestionReasonText}>{provider.reason}</Text>
                  </View>
                </View>
                <View style={styles.suggestionInfo}>
                  <Text style={styles.suggestionName} numberOfLines={1}>{provider.name}</Text>
                  <Text style={styles.suggestionCategory}>{provider.category}</Text>
                  <View style={styles.suggestionStats}>
                    <View style={styles.suggestionRating}>
                      <MaterialIcons name="star" size={14} color="#FBBF24" />
                      <Text style={styles.suggestionRatingText}>{provider.rating}</Text>
                    </View>
                    <Text style={styles.suggestionDistance}>{provider.distance}</Text>
                  </View>
                  <TouchableOpacity style={styles.suggestionConnectBtn}>
                    <Text style={styles.suggestionConnectText}>Connect</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('all_services')}</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>{t('home_see_all')}</Text>
          </TouchableOpacity>
        </View>
        
        {/* Expandable Service List */}
        {CATEGORIES.map((cat) => (
          <View key={cat.id} style={styles.accordionContainer}>
            <TouchableOpacity 
              style={styles.mainCategory} 
              onPress={() => toggleExpand(cat.id)}
              activeOpacity={0.7}
            >
              <View style={styles.mainCategoryLeft}>
                <View style={[styles.iconBox, { backgroundColor: `${cat.color}15` }]}>
                  <MaterialIcons name={cat.icon} size={24} color={cat.color} />
                </View>
                <Text style={styles.mainTitle}>{cat.title}</Text>
              </View>
              <View style={[styles.expandIcon, expandedId === cat.id && styles.expandIconActive]}>
                <MaterialIcons 
                  name={expandedId === cat.id ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
                  size={24} 
                  color="#667eea" 
                />
              </View>
            </TouchableOpacity>

            {expandedId === cat.id && (
              <View style={styles.subGrid}>
                {cat.subcategories.map((sub, index) => (
                  <TouchableOpacity key={index} style={styles.subThumbnail}>
                    <View style={styles.subIcon}>
                      <MaterialIcons name="check-circle" size={16} color={cat.color} />
                    </View>
                    <Text style={styles.subText}>{sub}</Text>
                  </TouchableOpacity>
                ))}

                {cat.id === 1 && (
                  <TouchableOpacity style={styles.specialUploadBtn} activeOpacity={0.8} onPress={handleImageUpload}>
                    <LinearGradient
                      colors={['#667eea', '#764ba2']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.gradientButton}
                    >
                      <MaterialIcons name="camera-alt" size={20} color="#fff" />
                      <Text style={styles.uploadText}>{t('home_upload_repair_photo')}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Promotional Banner */}
        <View style={styles.promoBanner}>
          <LinearGradient
            colors={['#FF6B6B', '#FF8E53']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoGradient}
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>{t('home_special_offer')}</Text>
              <Text style={styles.promoText}>{t('home_first_service_discount')}</Text>
              <TouchableOpacity style={styles.promoBtn}>
                <Text style={styles.promoBtnText}>{t('home_book_now')}</Text>
              </TouchableOpacity>
            </View>
            <MaterialIcons name="local-offer" size={60} color="#ffffff30" style={styles.promoIcon} />
          </LinearGradient>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutBtnContainer} 
          onPress={handleLogout}
        >
          <View style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  logoutBtnContainer: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 15,
    fontWeight: '600',
  },
  headerGradient: { borderBottomLeftRadius: 30, borderBottomRightRadius: 30, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20 },
  greeting: { fontSize: 14, color: '#ffffffCC', letterSpacing: 0.5 },
  userName: { fontSize: 28, fontWeight: '700', color: '#fff', marginTop: 4, marginBottom: 8 },
  subGreeting: { color: '#ffffffCC', fontSize: 14 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatBtn: { position: 'relative', padding: 4 },
  chatBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1, paddingHorizontal: 4 },
  chatBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  notificationBtn: { position: 'relative', padding: 4 },
  notificationBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF6B6B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1, paddingHorizontal: 4 },
  notificationCount: { color: '#fff', fontSize: 10, fontWeight: '700' },
  profileBtn: { position: 'relative' },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 3, borderColor: '#fff' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#4CD964', borderWidth: 2, borderColor: '#fff' },
  searchWrapper: { paddingHorizontal: 20, marginTop: -20 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 18, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, gap: 12 },
  searchInput: { flex: 1, fontSize: 15, color: '#333' },
  filterIcon: { paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#E5E7EB' },
  filterChips: { flexDirection: 'row', marginTop: 12, gap: 8 },
  filterChip: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8 },
  filterChipText: { fontSize: 13, color: '#6B7280' },
  // Slideshow Styles
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
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  slideSubtitle: {
    fontSize: 14,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#667eea',
  },
  actionButtonsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 20 },
  actionButton: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Suggestions Styles
  suggestionsContainer: { marginTop: 25 },
  suggestionsList: { paddingLeft: 20, paddingRight: 10, paddingBottom: 10 },
  suggestionCard: {
    width: 160,
    backgroundColor: '#fff',
    borderRadius: 15,
    marginRight: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  suggestionImageContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  suggestionImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  suggestionOnlineDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CD964',
    borderWidth: 2,
    borderColor: '#fff',
  },
  suggestionReasonBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  suggestionReasonText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '600',
  },
  suggestionInfo: {
    padding: 12,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 8,
  },
  suggestionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  suggestionRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  suggestionRatingText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  suggestionDistance: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  suggestionConnectBtn: {
    backgroundColor: '#EEF2FF',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionConnectText: {
    color: '#667eea',
    fontSize: 12,
    fontWeight: '700',
  },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 25, marginBottom: 15 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a2e', letterSpacing: -0.3 },
  seeAllText: { color: '#667eea', fontSize: 14, fontWeight: '600' },
  accordionContainer: { backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 20, marginBottom: 12, padding: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 3 },
  mainCategory: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mainCategoryLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { padding: 10, borderRadius: 12 },
  mainTitle: { fontSize: 16, fontWeight: '600', marginLeft: 14, color: '#1a1a2e' },
  expandIcon: { padding: 4, borderRadius: 12, backgroundColor: '#f0f0f0' },
  expandIconActive: { backgroundColor: '#667eea15' },
  subGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, borderTopWidth: 1, borderColor: '#E8ECF0', paddingTop: 18, justifyContent: 'space-between' },
  subThumbnail: { width: (width - 104) / 2, backgroundColor: '#F8F9FA', paddingVertical: 14, paddingHorizontal: 8, borderRadius: 12, marginBottom: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', borderWidth: 1, borderColor: '#E8ECF0' },
  subIcon: { marginRight: 8 },
  subText: { fontSize: 13, color: '#555', fontWeight: '500' },
  specialUploadBtn: { width: '100%', marginTop: 8, borderRadius: 12, overflow: 'hidden' },
  gradientButton: { flexDirection: 'row', paddingVertical: 14, justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: '#fff', fontWeight: '600', marginLeft: 10, fontSize: 14 },
  promoBanner: { paddingHorizontal: 20, marginTop: 20 },
  promoGradient: { borderRadius: 16, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden' },
  promoContent: { flex: 1 },
  promoTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 6 },
  promoText: { color: '#fff', fontSize: 13, opacity: 0.9, marginBottom: 12 },
  promoBtn: { backgroundColor: '#ffffff30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, alignSelf: 'flex-start' },
  promoBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  promoIcon: { position: 'absolute', right: 10, bottom: 10 },
  bellContainer: { marginRight: 15, position: 'relative', padding: 5 },
  badge: { position: 'absolute', top: 0, right: 0, backgroundColor: '#FF6B6B', borderRadius: 10, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', zIndex: 1, paddingHorizontal: 4, borderWidth: 1.5, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
