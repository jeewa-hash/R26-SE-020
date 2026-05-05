import React, { useContext, useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Image, SafeAreaView, LayoutAnimation, Platform, 
  UIManager, Dimensions, Alert 
} from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../context/LanguageContext';

// Enable smooth animations for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

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

export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);
  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigation = useNavigation();

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  // Handle profile navigation
  const handleProfilePress = () => {
    navigation.navigate("ProfileScreen");
  };

  // Handle chat navigation
  const handleChatPress = () => {
    navigation.navigate("ChatListScreen");
  };

  // Logic to handle search navigation
  const handleSearch = async () => {
    if (searchQuery.trim().length > 0) {
      try {
        const appLanguage = language === 'si' ? 'si' : 'en';
        const res = await fetch("http://10.0.2.2:5002/text-predict", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: searchQuery, app_lan: appLanguage }),
        });
        const data = await res.json();

        navigation.navigate("FollowUpScreen", {
          initialMessage: searchQuery,
          backendResponse: data,
        });
      } catch (err) {
        console.error("Error calling backend:", err);
      }
    }
  };

  // Handle image upload and detection
  const handleImageUpload = async () => {
    try {
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

      formData.append('image', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'photo.jpg',
      });
      formData.append('app_lan', language === 'si' ? 'si' : 'en');

      const response = await fetch('http://10.0.2.2:5000/predict', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.object) {
        Alert.alert(
          t('home_detection_result'),
          `${t('home_detected')}: ${data.object}\n${t('home_confidence')}: ${data.confidence}`,
          [
            {
              text: t('common_ok'),
              onPress: () => {
                navigation.navigate("FollowUpScreen", {
                  initialMessage: `I need help with ${data.object}`,
                  backendResponse: data,
                  source: "image", 
                });
              }
            }
          ]
        );
      } else {
        Alert.alert(t('common_error'), t('home_no_object_detected'));
      }

    } catch (error) {
      console.log("UPLOAD ERROR:", error);
      Alert.alert(t('common_error'), error.message);
    }
  };

  const handleStartBidding = () => {
    navigation.navigate("BiddingScreen");
  };

  const handleCreatePost = () => {
    navigation.navigate("CreatePostScreen");
  };

  const handleNotifications = () => {
    navigation.navigate("NotificationsScreen");
  };

  const handleGoToFeed = () => {
    navigation.navigate("FeedScreen");
  };

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
              {/* Chat Icon */}
              <TouchableOpacity style={styles.chatBtn} onPress={handleChatPress}>
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>2</Text>
                </View>
                <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
              </TouchableOpacity>

              {/* Notification Icon */}
              <TouchableOpacity style={styles.notificationBtn} onPress={handleNotifications}>
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationCount}>3</Text>
                </View>
                <Ionicons name="notifications-outline" size={24} color="#fff" />
              </TouchableOpacity>
              
              {/* Profile Button with Navigation */}
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
          
          {/* Filter Chips */}
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

        {/* Action Buttons Row - 3 buttons */}
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

            {/* Sub-categories Grid */}
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

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
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
  actionButtonsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginTop: 20 },
  actionButton: { flex: 1, borderRadius: 10, overflow: 'hidden' },
  actionGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 6 },
  actionButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 30, marginBottom: 18 },
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
});