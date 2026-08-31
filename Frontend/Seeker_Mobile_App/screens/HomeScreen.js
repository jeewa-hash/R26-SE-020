import React, { useContext, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  SafeAreaView,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  Alert,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { MaterialIcons, Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../context/LanguageContext';
import { getSlideshowData } from '../data/seasonalData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import { useNotification } from '../context/NotificationContext';
import { AUTH_SERVICE_URL, API_BASE_URL, CONFIG, IP_ADDRESS } from '../config';
import {
  getBookingEndDate,
  getBookingStartDate,
  getHumanLocation,
  getHumanProviderName,
  getHumanServiceTitle,
  getSeekerLiveSummary,
  getTimeRemainingLabel,
} from '../services/liveBookingApi';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental &&
  !global.nativeFabricUIManager
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width } = Dimensions.get('window');

const CATEGORIES = [
  {
    id: 1,
    title: 'Repairing Services',
    icon: 'build',
    color: '#FF6B6B',
    subcategories: ['Electrical', 'Plumbing', 'Furniture', 'Painting & Reno'],
  },
  {
    id: 2,
    title: 'Cleaning Services',
    icon: 'cleaning-services',
    color: '#4ECDC4',
    subcategories: ['House Cleaning', 'Post-Construction', 'Move-in/out', 'Sofa/Carpet'],
  },
  {
    id: 3,
    title: 'Gardening Services',
    icon: 'grass',
    color: '#45B7D1',
    subcategories: ['Maintenance', 'Landscaping', 'Planting'],
  },
  {
    id: 4,
    title: 'Care & Personal',
    icon: 'volunteer-activism',
    color: '#96CEB4',
    subcategories: ['Child Care', 'Elderly Care', 'Pet Care', 'Personal Asst'],
  },
];

const AVATAR_GRADIENTS = [
  ['#4f46e5', '#7c3aed'], // Indigo - Violet
  ['#059669', '#10b981'], // Emerald
  ['#d97706', '#f59e0b'], // Amber
  ['#e11d48', '#fb7185'], // Rose
  ['#0284c7', '#38bdf8'], // Sky
  ['#7c3aed', '#c084fc'], // Purple
  ['#ea580c', '#fb923c'], // Orange
];

const getAvatarGradient = (char) => {
  const code = (char || 'P').charCodeAt(0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
};

const Slideshow = ({ isDarkMode }) => {
  const navigation = useNavigation();
  const flatListRef = useRef();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [failedImages, setFailedImages] = useState({});

  // Fetch Recommended Providers for the Logged-in Seeker
  useEffect(() => {
    let isMounted = true;

    const fetchRecommendations = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId');
        const token = await AsyncStorage.getItem('userToken');

        let recUrl = `${AUTH_SERVICE_URL}/seeker/recommendations/${userId || 'guest'}`;
        let response = null;

        try {
          const res = await fetch(recUrl, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (res.ok) {
            response = await res.json();
          }
        } catch (e) {
          console.log('Error fetching from authService recommendations, trying fallback:', e.message);
        }

        // Fallback to Seeker_Service endpoint if needed
        if (!response || !response.success) {
          try {
            const fallbackUrl = `http://${IP_ADDRESS}:6000/request-quotations/recommendations/seeker/${userId || 'guest'}`;
            const res2 = await fetch(fallbackUrl, {
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res2.ok) {
              response = await res2.json();
            }
          } catch (fErr) {
            console.log('Error fetching from fallback:', fErr.message);
          }
        }

        // Second Fallback: Fetch general providers list if recommendations empty
        if (!response || !response.recommendations || response.recommendations.length === 0) {
          try {
            const provRes = await fetch(`${AUTH_SERVICE_URL}/providers`);
            const pData = await provRes.json();
            const provList = (pData.providers || pData || []).filter(
              (p) =>
                p.isVerified &&
                !p.isBlocked &&
                !p.isRejected &&
                (!p.consecutiveRejections || p.consecutiveRejections <= 3) &&
                (!p.consecutiveCancellations || p.consecutiveCancellations <= 3)
            );
            if (provList.length > 0) {
              const formatted = provList.slice(0, 5).map((p, idx) => {
                const hasRealRating = Boolean(p.hasRealRating || (typeof p.rating === 'number' && p.rating > 0));
                const realRating = hasRealRating ? Number(Number(p.rating).toFixed(1)) : null;
                return {
                  id: String(p._id || p.id || idx),
                  title: p.name || p.fullName || (p.email ? p.email.split('@')[0] : `Provider ${idx + 1}`),
                  subtitle: `${p.category || 'General Service'} • ${p.district || 'Available'}`,
                  category: p.category || 'General Service',
                  district: p.district || 'All Districts',
                  rating: realRating,
                  reviewsCount: p.reviewCount || 0,
                  hasRealRating: hasRealRating,
                  isVerified: true,
                  matchReason: `Top rated in ${p.district || 'your area'}`,
                  image: p.profileImage || null,
                  provider: p,
                  portfolio: {
                    categories: [p.category || 'General Service'],
                    specific_labels: [p.category || 'General Service'],
                    images: p.profileImage ? [p.profileImage] : [],
                    total_images: p.profileImage ? 1 : 0,
                  },
                  match: {
                    category: p.category || 'General Service',
                    reason: 'Recommended for you',
                  },
                };
              });
              if (isMounted) {
                setSlides(formatted);
                setLoading(false);
              }
              return;
            }
          } catch (pErr) {
            console.log('Error fetching general providers:', pErr.message);
          }
        }

        if (isMounted) {
          if (response && response.recommendations && response.recommendations.length > 0) {
            const onlyVerified = response.recommendations.filter(
              (r) =>
                r.isVerified &&
                !r.provider?.isBlocked &&
                !r.provider?.isRejected &&
                Number(r.rating || r.provider?.rating || 0) >= 4.0
            );
            setSlides(onlyVerified);
          } else {
            // Default seasonal data if completely offline
            const defaultMock = getSlideshowData().map((s) => ({
              ...s,
              isMock: true,
            }));
            setSlides(defaultMock);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Recommendations load error:', err);
        if (isMounted) {
          setSlides(getSlideshowData());
          setLoading(false);
        }
      }
    };

    fetchRecommendations();

    return () => {
      isMounted = false;
    };
  }, []);

  // Automatic slide interval
  useEffect(() => {
    if (slides.length <= 1) return;

    const interval = setInterval(() => {
      if (flatListRef.current && slides.length > 0) {
        const nextIndex = (currentIndex + 1) % slides.length;
        setCurrentIndex(nextIndex);
        flatListRef.current.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [currentIndex, slides.length]);

  // Navigate directly to profileOfProvider
  const handleNavigateToProvider = (item) => {
    if (item.isMock) {
      navigation.navigate('SeasonalDemandsScreen');
      return;
    }

    const p = item.provider || item;
    navigation.navigate('profileOfProvider', {
      providerItem: {
        provider: {
          id: p.id || p._id || item.id,
          _id: p.id || p._id || item.id,
          name: p.name || item.title || 'Service Provider',
          email: p.email || '',
          telephone: p.telephone || '',
          district: p.district || item.district || '',
          category: p.category || item.category || '',
          profileImage: p.profileImage || item.image || '',
          bio: p.bio || '',
          isVerified: Boolean(p.isVerified || item.isVerified),
          rating: p.rating || item.rating || 4.9,
          location: p.location || null,
        },
        portfolio: item.portfolio || {
          categories: [p.category || item.category || 'General Service'],
          specific_labels: [p.category || item.category || 'General Service'],
          images: (p.profileImage || item.image) ? [p.profileImage || item.image] : [],
          total_images: (p.profileImage || item.image) ? 1 : 0,
        },
        match: item.match || {
          reason: item.matchReason || 'Recommended Provider in your district',
          category: p.category || item.category || 'General Service',
        },
      },
    });
  };

  const getProfileImageUrl = (profileImage) => {
    if (!profileImage) return null;
    const normalized = profileImage.replace(/\\/g, '/');
    if (normalized.startsWith('http')) return normalized;
    return `${AUTH_SERVICE_URL}/${normalized}`;
  };

  const renderSlide = ({ item }) => {
    const itemId = String(item.id || item._id || item.title);
    const imgUri = getProfileImageUrl(item.image || item.provider?.profileImage);
    const hasValidImage = Boolean(imgUri) && !failedImages[itemId];

    const providerTitle = item.title || item.provider?.name || item.name || 'Provider';
    const initial = providerTitle.trim().length > 0 ? providerTitle.trim().charAt(0).toUpperCase() : 'P';
    const avatarGradientColors = getAvatarGradient(initial);

    return (
      <TouchableOpacity
        style={[styles.slideCard, isDarkMode && styles.slideCardDark]}
        onPress={() => handleNavigateToProvider(item)}
        activeOpacity={0.92}
      >
        {hasValidImage ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.slideImage}
            resizeMode="cover"
            onError={() => setFailedImages((prev) => ({ ...prev, [itemId]: true }))}
          />
        ) : (
          <LinearGradient
            colors={isDarkMode ? ['#0f172a', '#1e1b4b'] : avatarGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.slideImage}
          >
            <View style={styles.slideWatermarkWrap}>
              <Text style={styles.slideWatermarkInitial}>{initial}</Text>
            </View>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.2)', 'rgba(15,23,42,0.92)']}
          style={styles.slideOverlay}
        >
          {/* Top Recommendation Tag & Rating */}
          <View style={styles.slideHeaderRow}>
            <View style={styles.slideTagPill}>
              <Text style={styles.slideTagText}>
                {item.isTopCategory ? '⭐ Top Category' : '📍 ' + (item.district || 'Recommended')}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {item.isVerified && (
                <View style={styles.slideVerifiedPill}>
                  <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                  <Text style={styles.slideVerifiedText}>Verified</Text>
                </View>
              )}

              {(item.hasRealRating || (item.rating && item.reviewsCount > 0)) && item.rating ? (
                <View style={styles.slideRatingPill}>
                  <Ionicons name="star" size={13} color="#FBBF24" />
                  <Text style={styles.slideRatingText}>{Number(item.rating).toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Provider Details */}
          <View style={styles.slideContent}>
            <View style={styles.slideProviderRow}>
              {hasValidImage ? (
                <Image
                  source={{ uri: imgUri }}
                  style={styles.slideAvatarThumb}
                  onError={() => setFailedImages((prev) => ({ ...prev, [itemId]: true }))}
                />
              ) : (
                <LinearGradient
                  colors={avatarGradientColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.slideAvatarFallback}
                >
                  <Text style={styles.slideAvatarInitial}>{initial}</Text>
                </LinearGradient>
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.slideTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.slideSubtitle} numberOfLines={1}>
                  {item.subtitle}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.slideButton}
              onPress={() => handleNavigateToProvider(item)}
              activeOpacity={0.85}
            >
              <Text style={styles.slideButtonText}>Explore Now →</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  const renderDot = () => (
    <View style={styles.dotContainer}>
      {slides.map((_, index) => (
        <View
          key={index}
          style={[styles.dot, currentIndex === index && styles.activeDot]}
        />
      ))}
    </View>
  );

  if (slides.length === 0) return null;

  return (
    <View style={styles.slideshowContainer}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        keyExtractor={(item, idx) => (item.id || item._id || idx).toString()}
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

const ServiceCard = ({
  category,
  expanded,
  onPress,
  onSubPress,
  onImageUpload,
  isDarkMode,
}) => {
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
            <Text style={[styles.mainTitle, isDarkMode && styles.textDark]}>
              {category.title}
            </Text>

            <Text style={[styles.subtitleCount, isDarkMode && styles.textMutedDark]}>
              {category.subcategories.length} services available
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.expandIcon,
            isDarkMode && styles.expandIconDark,
            expanded && styles.expandIconActive,
          ]}
        >
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={24}
            color={isDarkMode ? '#818cf8' : '#667eea'}
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
              activeOpacity={0.8}
            >
              <View style={[styles.subIconCircle, { backgroundColor: `${category.color}15` }]}>
                <MaterialIcons name="check-circle" size={14} color={category.color} />
              </View>

              <Text style={[styles.subText, isDarkMode && styles.textDark]}>
                {sub}
              </Text>
            </TouchableOpacity>
          ))}

          {category.id === 1 && (
            <TouchableOpacity
              style={styles.specialUploadBtn}
              activeOpacity={0.8}
              onPress={onImageUpload}
            >
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

export default function HomeScreen() {
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);
  const { isDarkMode, toggleTheme } = useTheme();
  const { unreadCount } = useChat();
  const { unreadCount: notificationUnreadCount } = useNotification();

  const [expandedId, setExpandedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [liveSummary, setLiveSummary] = useState(null);
  const [liveLoading, setLiveLoading] = useState(true);
  const [liveError, setLiveError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navigation = useNavigation();

  const loadLiveSummary = React.useCallback(async (showLoading = false) => {
    if (showLoading) setLiveLoading(true);
    setLiveError(false);
    try {
      setLiveSummary(await getSeekerLiveSummary());
    } catch (error) {
      console.log('Seeker live summary load error:', error?.message);
      setLiveError(true);
    } finally {
      setLiveLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(React.useCallback(() => {
    loadLiveSummary(true);
    const interval = setInterval(() => loadLiveSummary(false), 30000);
    return () => clearInterval(interval);
  }, [loadLiveSummary]));

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadLiveSummary(false);
  }, [loadLiveSummary]);

  const formatLiveTime = (value) => value && !Number.isNaN(new Date(value).getTime())
    ? new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
    : 'Not scheduled';

  const openBookingDetails = (booking) => navigation.navigate('IT22129376ScheduledJobDetails', { booking });

  const renderLiveBooking = () => {
    if (liveLoading) return <View style={[styles.liveStateCard, isDarkMode && styles.liveCardDark]}><ActivityIndicator color="#667eea" /><Text style={[styles.liveStateText, isDarkMode && styles.textMutedDark]}>Loading your booking status...</Text></View>;
    if (liveError) return <View style={[styles.liveStateCard, isDarkMode && styles.liveCardDark]}><Ionicons name="warning-outline" size={26} color="#EF4444" /><Text style={[styles.liveStateText, isDarkMode && styles.textMutedDark]}>Unable to load booking status right now.</Text><TouchableOpacity onPress={() => loadLiveSummary(true)}><Text style={styles.liveRetry}>Try again</Text></TouchableOpacity></View>;

    const ongoing = liveSummary?.delayedService || liveSummary?.currentService || null;
    const next = liveSummary?.startingSoonBooking || liveSummary?.nextBooking || null;
    const renderSection = (booking, kind) => {
      const delayed = booking?.bookingStatus === 'DELAY_REPORTED';
      const soon = kind === 'next' && booking === liveSummary?.startingSoonBooking;
      const color = delayed ? '#D97706' : kind === 'current' ? '#2563EB' : soon ? '#7C3AED' : '#059669';
      const start = getBookingStartDate(booking);
      const end = getBookingEndDate(booking);
      return <View style={styles.liveInnerSection}>
        <View style={styles.liveInnerHeader}><Text style={[styles.liveInnerLabel, isDarkMode && styles.textDark]}>{kind === 'current' ? 'In Progress Booking' : 'Next Booking'}</Text><Text style={[styles.liveInnerStatus, { color }]}>{kind === 'current' ? (delayed ? 'Provider reported a delay' : 'Service in progress') : (soon ? `Starting soon · ${getTimeRemainingLabel(start)}` : getTimeRemainingLabel(start))}</Text></View>
        <Text style={[styles.liveServiceTitle, isDarkMode && styles.textDark]}>{getHumanServiceTitle(booking)}</Text>
        <Text style={[styles.liveDetail, isDarkMode && styles.textMutedDark]}>Provider: {getHumanProviderName(booking)}</Text>
        <Text style={[styles.liveDetail, isDarkMode && styles.textMutedDark]}>Location: {getHumanLocation(booking)}</Text>
        {kind === 'current' ? <Text style={[styles.liveDetail, isDarkMode && styles.textMutedDark]}>{delayed ? `Reason: ${booking?.delayInfo?.delayReason || 'Not provided'}` : `Started: ${formatLiveTime(booking.actualStartTime || start)}`}</Text> : <Text style={[styles.liveDetail, isDarkMode && styles.textMutedDark]}>Starts: {formatLiveTime(start)}</Text>}
        {kind === 'current' ? <Text style={[styles.liveDetail, isDarkMode && styles.textMutedDark]}>Expected end: {formatLiveTime(end)}</Text> : null}
        <TouchableOpacity style={[styles.liveDetailsButton, { backgroundColor: color }]} onPress={() => openBookingDetails(booking)}><Text style={styles.liveDetailsButtonText}>View Details</Text></TouchableOpacity>
      </View>;
    };
    const emptySection = (label, message) => <View style={styles.liveInnerSection}><Text style={[styles.liveInnerLabel, isDarkMode && styles.textDark]}>{label}</Text><Text style={[styles.liveDetail, styles.liveEmptyText, isDarkMode && styles.textMutedDark]}>{message}</Text></View>;
    return <View style={[styles.liveBookingCard, isDarkMode && styles.liveCardDark]}>
      {ongoing ? renderSection(ongoing, 'current') : emptySection('In Progress Booking', 'No in-progress booking')}
      <View style={[styles.liveDivider, isDarkMode && styles.liveDividerDark]} />
      {next ? renderSection(next, 'next') : emptySection('Next Booking', 'No upcoming confirmed booking')}
    </View>;
  };

  const totalUnreadMessages = Object.values(unreadCount).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  );

  const toggleExpand = (id) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedId(expandedId === id ? null : id);
  };

  const handleCreatePress = () => navigation.navigate('CreatePostScreen');
  const handleChatPress = () => navigation.navigate('ChatListScreen');
  const handleNotifications = () => navigation.navigate('NotificationScreen');

  const handleSubCategoryPress = (subcategory) => {
    Alert.alert('Service Selected', `${subcategory} service will be available soon`);
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) return;

    try {
      const token = await AsyncStorage.getItem('userToken');

      if (!token) {
        Alert.alert('Error', 'You are not logged in. Please log in again.');
        return;
      }

      const appLanguage = language === 'si' ? 'si' : 'en';
      const url = `http://10.0.2.2:5002/text-predict`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          text: searchQuery,
          app_lan: appLanguage,
        }),
      });

      if (response.status === 401) {
        Alert.alert('Session Expired', 'Please log in again.');
        return;
      }

      const data = await response.json();

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
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
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
              },
            },
          ]
        );
      } else {
        Alert.alert(t('common_error'), t('home_no_object_detected'));
      }
    } catch (error) {
      console.log('UPLOAD ERROR:', error);
      Alert.alert(
        t('common_error'),
        'Server connection failed. Please check if the backend is running.'
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#0f1121' : '#667eea'}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#667eea" />}
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ['#0f1121', '#1a1a2e', '#16213e']
              : ['#4765eb', '#926ee7', '#9d6aa3']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.brandArea}>
              <Text style={styles.appName}>Work Wave</Text>
            </View>

            <View style={styles.headerActionsPill}>
              <TouchableOpacity
                style={styles.createMiniBtn}
                onPress={handleCreatePress}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={27} color="#444" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.headerIconBtn} onPress={handleChatPress}>
                <Ionicons name="chatbubble-ellipses-outline" size={24} color="#444" />

                {totalUnreadMessages > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {totalUnreadMessages > 99 ? '99+' : totalUnreadMessages}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.headerIconBtn} onPress={handleNotifications}>
                <Ionicons name="notifications" size={23} color="#D97706" />

                {notificationUnreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={toggleTheme}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isDarkMode ? 'moon' : 'sunny'}
                  size={24}
                  color={isDarkMode ? '#818cf8' : '#FBBF24'}
                />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.searchWrapper}>
          <View
            style={[
              styles.searchContainer,
              isDarkMode && styles.searchContainerDark,
              isSearchFocused && styles.searchContainerFocused,
            ]}
          >
            <Feather
              name="search"
              size={20}
              color={isDarkMode ? '#818cf8' : '#667eea'}
            />

            <TextInput
              placeholder={t('search_placeholder')}
              placeholderTextColor={isDarkMode ? '#6B7280' : '#999'}
              style={[styles.searchInput, isDarkMode && styles.textDark]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />

            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearBtn}
              >
                <Feather
                  name="x"
                  size={18}
                  color={isDarkMode ? '#6B7280' : '#999'}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={[styles.filterIcon, isDarkMode && styles.filterIconDark]}
            >
              <Feather
                name="sliders"
                size={20}
                color={isDarkMode ? '#818cf8' : '#667eea'}
              />
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
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>
                  Top Rated
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>
                  Lowest Price
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>
                  Available Now
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.filterChip, isDarkMode && styles.filterChipDark]}>
                <Text style={[styles.filterChipText, isDarkMode && styles.textMutedDark]}>
                  24/7 Support
                </Text>
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>

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
                <Text style={styles.biddingSubtitle}>
                  Search repairs by uploading a photo
                </Text>
              </View>

              <View style={styles.biddingArrow}>
                <Feather
                  name={expandedId === 1 ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color="#fff"
                />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.liveSection}>
          <Text style={[styles.liveSectionTitle, isDarkMode && styles.textDark]}>Live Booking Status</Text>
          {renderLiveBooking()}
        </View>

        <Slideshow isDarkMode={isDarkMode} />

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
              {t('all_services')}
            </Text>

            <Text style={[styles.sectionSubtitle, isDarkMode && styles.textMutedDark]}>
              Browse by category
            </Text>
          </View>

          <TouchableOpacity style={styles.seeAllBtn}>
            <Text style={[styles.seeAllText, isDarkMode && styles.seeAllTextDark]}>
              {t('home_see_all')}
            </Text>

            <Feather
              name="arrow-right"
              size={14}
              color={isDarkMode ? '#818cf8' : '#667eea'}
            />
          </TouchableOpacity>
        </View>

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

        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0f1121',
  },
  scrollContent: {
    paddingBottom: 80,
  },
  liveSection: { paddingHorizontal: 20, paddingTop: 18 },
  liveSectionTitle: { fontSize: 19, fontWeight: '600', color: '#111827', marginBottom: 12 },
  liveStateCard: { minHeight: 105, borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', padding: 16, gap: 9 },
  liveCardDark: { backgroundColor: '#1a1a2e', borderColor: '#30304A' },
  liveStateText: { color: '#6B7280', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  liveRetry: { color: '#667eea', fontWeight: '800' },
  liveBookingCard: { borderRadius: 18, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF', padding: 16 },
  liveInnerSection: { paddingVertical: 2 },
  liveInnerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 7 },
  liveInnerLabel: { color: '#111827', fontSize: 14, fontWeight: '600' },
  liveInnerStatus: { fontSize: 12, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  liveDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 15 },
  liveDividerDark: { backgroundColor: '#30304A' },
  liveStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  liveStatusTitle: { fontSize: 14, fontWeight: '600', textTransform: 'uppercase' },
  liveServiceTitle: { color: '#111827', fontSize: 18, fontWeight: '500', marginBottom: 8 },
  liveDetail: { color: '#6B7280', fontSize: 13, lineHeight: 20 },
  liveEmptyText: { marginTop: 8 },
  liveRemaining: { fontSize: 13, fontWeight: '800', marginTop: 6 },
  liveDetailsButton: { alignSelf: 'flex-start', borderRadius: 11, paddingHorizontal: 16, paddingVertical: 10, marginTop: 14 },
  liveDetailsButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' },

  headerGradient: {
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    paddingBottom: 36,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) + 12 : (Platform.OS === 'ios' ? 48 : 20),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  brandArea: {
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 31,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  headerActionsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  createMiniBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtn: {
    position: 'relative',
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

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
  searchContainerDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
    shadowColor: '#000',
    shadowOpacity: 0.25,
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
  filterIconDark: {
    borderLeftColor: '#2d3561',
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
  filterChipDark: {
    backgroundColor: '#242f4d',
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

  slideshowContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  slideCard: {
    width: width - 32,
    height: 195,
    marginHorizontal: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1e1b4b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.15,
    shadowRadius: 14,
    elevation: 6,
  },
  slideCardDark: {
    backgroundColor: '#0f1123',
    borderColor: '#3730a3',
    borderWidth: 1,
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
    justifyContent: 'space-between',
    padding: 14,
  },
  slideHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  slideTagPill: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  slideTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  slideVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16,185,129,0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.45)',
  },
  slideVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  slideRatingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  slideRatingText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#FBBF24',
  },
  slideContent: {
    marginBottom: 4,
  },
  slideProviderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  slideAvatarThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#fff',
  },
  slideWatermarkWrap: {
    position: 'absolute',
    right: 15,
    top: 5,
    opacity: 0.18,
  },
  slideWatermarkInitial: {
    fontSize: 140,
    fontWeight: '900',
    color: '#ffffff',
  },
  slideAvatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  slideAvatarInitial: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  slideTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  slideSubtitle: {
    fontSize: 12,
    color: '#E2E8F0',
    fontWeight: '500',
  },
  slideButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  slideButtonText: {
    fontSize: 12,
    fontWeight: '700',
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
  seeAllTextDark: {
    color: '#818cf8',
  },

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
  accordionContainerDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
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
  expandIconDark: {
    backgroundColor: '#242f4d',
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
  subGridDark: {
    borderColor: '#2d3561',
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
  subThumbnailDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
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

  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
