import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Text, FAB, Surface } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { usePortfolioUpload } from '../hooks/usePortfolioUpload';
import AIProcessingModal from '../components/portfolio/AIProcessingModal';
import PortfolioTagScreen from '../components/portfolio/PortfolioTagScreen';
import { usePortfolio } from '../context/PortfolioContext';
import { Colors } from '../theme';
import HeaderSection from '../components/HeaderSection';
import { CONFIG, IP_ADDRESS } from '../config';
import ProviderPostsSection from './Providerpostssection .js';
import ServicesSection from '../components/portfolio/ServicesSection';
import {
  getProviderAvailabilityStatus,
  updateProviderAvailabilityStatus,
} from './IT22129376/services/providerAvailabilityApi';

const { width } = Dimensions.get('window');

const REVIEWS = [
  {
    id: '1',
    name: 'Kumara P.',
    rating: 5,
    comment: 'Excellent work! Fixed the pipe quickly and professionally.',
    date: 'May 8',
  },
  {
    id: '2',
    name: 'Anoma S.',
    rating: 5,
    comment: 'Very reliable and honest. Will hire again.',
    date: 'May 3',
  },
  {
    id: '3',
    name: 'Samira W.',
    rating: 4,
    comment: 'Good service, arrived on time and completed the job well.',
    date: 'Apr 28',
  },
];

const getInitials = (name) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase();

export default function ProfileScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext);
  const { portfolioImages, portfolioCategories, specialization, loadPortfolio, getAllTags } = usePortfolio();
  const {
    images, processing, progress,
    showTagScreen, openGallery, cancelProcessing, resetAll,
  } = usePortfolioUpload();

  const [profileSkills, setProfileSkills] = useState([]);
  const [showAllSkills, setShowAllSkills] = useState(false);
  const INITIAL_SKILLS_LIMIT = 6;

  // Penalty restriction state
  const [showPenaltyModal, setShowPenaltyModal] = useState(false);
  const [penaltyRatio, setPenaltyRatio] = useState('3/3');
  const [checkingPenalty, setCheckingPenalty] = useState(false);

  const handleFabPress = async () => {
    try {
      setCheckingPenalty(true);
      let userId = await AsyncStorage.getItem('userId');
      if (!userId) {
        const token = (await AsyncStorage.getItem('userToken')) || (await AsyncStorage.getItem('token'));
        if (token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
              userId = decoded.id || decoded._id || decoded.userId || decoded.user?.id || decoded.user?._id;
            }
          } catch (_) {}
        }
      }

      if (!userId) {
        userId = '69fc31f3cfe41c4d62e6f9ee';
      }

      const adminUrl = CONFIG.ADMIN_SERVICE_URL || `http://${IP_ADDRESS || '192.168.1.38'}:5001`;
      const res = await fetch(`${adminUrl}/api/inquiries/check-bookable/${userId}`);
      if (res.ok) {
        const statusData = await res.json();
        const score = typeof statusData.penaltyScore === 'number' ? statusData.penaltyScore : (statusData.activeMissedBookingsCount || 0);
        if (score >= 3 || statusData.isRestricted || statusData.isBlocked) {
          setPenaltyRatio(statusData.penaltyRatio || `${score}/3`);
          setShowPenaltyModal(true);
          setCheckingPenalty(false);
          return;
        }
      }
    } catch (e) {
      console.log('Error checking penalty status before posting (FAB):', e.message);
    } finally {
      setCheckingPenalty(false);
    }
    navigation.getParent()?.navigate('PostGeneration');
  };

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) return;

        const response = await fetch(
          `${CONFIG.ML_SERVICE_URL}/portfolio/items`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const skills = [
            ...new Set(
              (data.items || []).flatMap((item) =>
                Array.isArray(item.tags) ? item.tags : []
              )
            ),
          ];
          setProfileSkills(skills);
        }
      } catch (e) {
        console.log('Error fetching skills from ML engine:', e);
      }
    };

    fetchSkills();
  }, [portfolioImages]);

  // Profile data state
  const [profile, setProfile] = useState({
    name: 'Loading...',
    email: '',
    telephone: '',
    category: '',
    district: '',
    address: '',
    bio: 'Loading profile...',
    gender: '',
    profileImage: null,
    isVerified: false,
    jobs: '0',
    rating: '★',
    completion: '%',
    earned: 'K',
  });
  const [loading, setLoading] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [updatingAvailability, setUpdatingAvailability] = useState(false);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');

        if (!token) {
          Alert.alert('Error', 'No authentication token found. Please login again.');
          setLoading(false);
          return;
        }

        const res = await fetch(`${CONFIG.AUTH_SERVICE_URL}/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        const data = await res.json();

        if (data && data.provider) {
          const p = data.provider;
          setProfile({
            name: p.name || 'Unknown',
            email: p.email || '',
            telephone: p.telephone || '',
            category: p.category || 'Not specified',
            district: p.district || 'Not specified',
            address: p.address || 'Not specified',
            bio: p.bio || 'No bio added yet',
            gender: p.gender || 'Not specified',
            profileImage: p.profileImage || null,
            isVerified: p.isVerified || false,
            jobs: 'N/A',
            rating: 'N/A★',
            completion: 'N/A%',
            earned: 'N/AK',
          });

          try {
            const availabilityStatus = await getProviderAvailabilityStatus();
            setIsAvailable(availabilityStatus !== false);
          } catch (availabilityError) {
            console.log('Availability status error:', availabilityError?.message);
          }
        }
      } catch (err) {
        console.log('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const allTags = getAllTags();
  const [showAddTooltip, setShowAddTooltip] = React.useState(false);

  // Categories computed from backend portfolioCategories or grouped local images
  const categories = React.useMemo(() => {
    if (portfolioCategories && portfolioCategories.length > 0) {
      return portfolioCategories.map((c) => ({
        name: c.label || c.category_group,
        count: c.image_count || 1,
        latest_image: c.latest_image,
      }));
    }
    const categoryMap = {};
    portfolioImages.forEach((img) => {
      const name = img.label || img.category || 'General';
      if (!categoryMap[name]) categoryMap[name] = 0;
      categoryMap[name] += 1;
    });
    return Object.keys(categoryMap).map((tag) => ({
      name: tag,
      count: categoryMap[tag],
    }));
  }, [portfolioCategories, portfolioImages]);

  const CATEGORY_COLORS = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#DC2626', '#0891B2'];

  const handleAddPress = () => {
    setShowAddTooltip(true);
    openGallery();
    setTimeout(() => setShowAddTooltip(false), 1600);
  };

  const handleCloseTagScreen = () => {
    resetAll();
    loadPortfolio();
  };

  const displayedSkills = showAllSkills
    ? profileSkills
    : profileSkills.slice(0, INITIAL_SKILLS_LIMIT);

  const remainingSkillsCount = Math.max(0, profileSkills.length - INITIAL_SKILLS_LIMIT);

  const toggleAvailability = async () => {
    try {
      setUpdatingAvailability(true);

      const result = await updateProviderAvailabilityStatus(!isAvailable);

      if (typeof result === 'boolean') {
        setIsAvailable(result);
      } else if (typeof result?.isAvailable === 'boolean') {
        setIsAvailable(result.isAvailable);
      } else if (typeof result?.isActive === 'boolean') {
        setIsAvailable(result.isActive);
      } else {
        setIsAvailable((previous) => !previous);
      }
    } catch (error) {
      Alert.alert('Unable to update', error.message || 'Please try again.');
    } finally {
      setUpdatingAvailability(false);
    }
  };

  const C = isDark
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', subCard: '#2a2a2a' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', subCard: '#F8FAFC' };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <HeaderSection
        navigation={navigation}
        onInboxPress={() => navigation.navigate('InboxScreen')}
      />

      {/* ── Scrollable body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── Hero card ── */}
        <View style={[styles.heroCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>{profile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}</Text>
            </View>
            <View style={[styles.onlineDot, { borderColor: C.card }]} />
          </View>

          <Text style={[styles.profileName, { color: C.text }]}>{profile.name}</Text>
          <Text style={[styles.profileHandle, { color: C.textSub }]}>{profile.district}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={12} color="#2563EB" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>

            {specialization?.awarded ? (
              <View style={[styles.verifiedBadge, { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' }]}>
                <MaterialIcons name="workspace-premium" size={13} color="#D97706" />
                <Text style={[styles.verifiedBadgeText, { color: '#B45309', fontWeight: '600' }]}>
                  {specialization.badge || 'Top Specialization'}: {specialization.specific_label || specialization.label}
                </Text>
              </View>
            ) : null}

            <View style={[styles.onlineBadge, !isAvailable && styles.offlineBadge]}>
              <View style={[styles.onlineDotSmall, !isAvailable && styles.offlineDotSmall]} />
              <Text style={[styles.onlineBadgeText, !isAvailable && styles.offlineBadgeText]}>
                {isAvailable ? 'Available' : 'Unavailable'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.availabilityToggle,
                updatingAvailability && styles.availabilityToggleDisabled,
              ]}
              onPress={toggleAvailability}
              disabled={updatingAvailability}
              activeOpacity={0.8}
            >
              <Text style={styles.availabilityToggleText}>
                {updatingAvailability ? 'Updating...' : isAvailable ? 'Go Unavailable' : 'Go Available'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats strip */}
          <View style={[styles.statsStrip, { borderTopColor: C.border }]}>
            {[
              { val: profile.jobs, lbl: 'Jobs', icon: 'work', color: '#2563EB' },
              { val: profile.rating, lbl: 'Rating', icon: 'star', color: '#F59E0B' },
              { val: profile.completion, lbl: 'Completion', icon: 'check-circle', color: '#16A34A' },
              { val: profile.earned, lbl: 'Earned', icon: 'account-balance-wallet', color: '#7C3AED' },
            ].map((s, i, arr) => (
              <React.Fragment key={i}>
                <View style={styles.statCell}>
                  <MaterialIcons name={s.icon} size={16} color={s.color} />
                  <Text style={[styles.statVal, { color: s.color }]}>{s.val}</Text>
                  <Text style={[styles.statLbl, { color: C.textSub }]}>{s.lbl}</Text>
                </View>
                {i < arr.length - 1 && <View style={[styles.statDivider, { backgroundColor: C.border }]} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 12 }]}>
            Unlock New Feature
          </Text>

          <View style={styles.featureRow}>
            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: C.subCard, borderColor: C.border }]}
              onPress={() => navigation.navigate('HomeTab')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="work-history" size={23} color="#2563EB" />
              <Text style={[styles.featureTitle, { color: C.text }]}>Live Job Status</Text>
              <Text style={[styles.featureSubtitle, { color: C.textSub }]}>
                View current and next booking
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.featureCard, { backgroundColor: C.subCard, borderColor: C.border }]}
              onPress={() => navigation.getParent()?.navigate('ProviderAvailability')}
              activeOpacity={0.85}
            >
              <MaterialIcons name="event-available" size={23} color="#7C3AED" />
              <Text style={[styles.featureTitle, { color: C.text }]}>Update Availability</Text>
              <Text style={[styles.featureSubtitle, { color: C.textSub }]}>
                Manage available service slots
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Bio ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>About Me</Text>
          <Text style={[styles.bioText, { color: C.textSub }]}>
            {profile.bio}
          </Text>
        </View>

        <ServicesSection navigation={navigation} C={C} initialCategory={profile.category} />
        <ProviderPostsSection navigation={navigation} isDark={isDark} />

        {/* ── Skills & Expertise (Tags with See More toggle) ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Skills & Expertise</Text>
            <Text style={[styles.countBadgeTextSmall, { color: C.textSub }]}>
              {profileSkills.length} Total Tags
            </Text>
          </View>

          <View style={styles.skillsWrap}>
            {displayedSkills.map((tag) => (
              <View key={tag} style={[styles.skillChipAI, {
                backgroundColor: isDark ? '#0d2820' : '#F0FDF4',
                borderColor: isDark ? '#145040' : '#A7F3D0',
              }]}>
                <MaterialIcons name="auto-awesome" size={10} color="#16A34A" />
                <Text style={[styles.skillTextAI, { color: '#16A34A' }]}>{tag}</Text>
              </View>
            ))}
          </View>

          {profileSkills.length > INITIAL_SKILLS_LIMIT && (
            <TouchableOpacity
              style={[styles.seeMoreTagsBtn, { borderColor: C.border, backgroundColor: C.subCard }]}
              onPress={() => setShowAllSkills(!showAllSkills)}
              activeOpacity={0.7}
            >
              <Text style={styles.seeMoreTagsText}>
                {showAllSkills ? 'Show Less Tags' : `See More Tags (+${remainingSkillsCount} more)`}
              </Text>
              <MaterialIcons
                name={showAllSkills ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={16}
                color="#16A34A"
              />
            </TouchableOpacity>
          )}

          {profileSkills.length > 0 && (
            <Text style={styles.aiTagNote}>✨ {profileSkills.length} skills & tags verified by AI ML Engine</Text>
          )}
        </View>

        {/* ── Portfolio Section ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Portfolio</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('PortfolioGallery')}>
              <Text style={{ fontSize: 13, color: '#2563EB', fontWeight: '600' }}>View Gallery →</Text>
            </TouchableOpacity>
          </View>

          {categories.length === 0 && portfolioImages.length === 0 ? (
            <TouchableOpacity style={[styles.portfolioEmpty, { backgroundColor: C.subCard, borderColor: C.border }]} onPress={openGallery}>
              <MaterialIcons name="add-photo-alternate" size={32} color="#6366F1" />
              <Text style={[styles.portfolioEmptyTitle, { color: C.text }]}>Add Portfolio Images</Text>
              <Text style={[styles.portfolioEmptySub, { color: C.textSub }]}>Upload work photos — AI ML Engine will classify and tag them</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.portfolioContainer}>
              {/* Corner "add more" button */}
              <TouchableOpacity
                style={[styles.addImageCorner, { borderColor: C.card }]}
                onPress={handleAddPress}
                activeOpacity={0.85}
              >
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
              </TouchableOpacity>

              {showAddTooltip && (
                <View style={styles.addTooltip}>
                  <Text style={styles.addTooltipText}>Add Portfolio Images</Text>
                </View>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
              >
                {categories.map((cat, index) => {
                  const color = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
                  return (
                    <TouchableOpacity
                      key={cat.name}
                      style={[styles.categoryCard, { backgroundColor: color + '25' }]}
                      activeOpacity={0.85}
                      onPress={() => navigation.getParent()?.navigate('PortfolioGallery', { category: cat.name })}
                    >
                      <MaterialIcons name="photo-library" size={28} color={color} />

                      <View style={styles.categoryCountBadge}>
                        <Text style={styles.categoryCountText}>{cat.count}</Text>
                      </View>

                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.80)']}
                        style={styles.categoryLabelGradient}
                      >
                        <Text style={styles.categoryLabelText} numberOfLines={1}>{cat.name}</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </View>

        {/* ── Reviews ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Reviews</Text>
            <View style={styles.ratingPill}>
              <MaterialIcons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingPillText}>4.9 · 124 reviews</Text>
            </View>
          </View>
          {REVIEWS.map((review) => (
            <View key={review.id} style={[styles.reviewCard, { backgroundColor: C.subCard, borderColor: C.border }]}>
              <View style={styles.reviewHeader}>
                <View style={[styles.reviewAvatar, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.reviewAvatarText}>{getInitials(review.name)}</Text>
                </View>
                <View style={styles.reviewMeta}>
                  <Text style={[styles.reviewName, { color: C.text }]}>{review.name}</Text>
                  <View style={styles.reviewStars}>
                    {Array(review.rating).fill(0).map((_, i) => (
                      <MaterialIcons key={i} name="star" size={12} color="#F59E0B" />
                    ))}
                    <Text style={[styles.reviewDate, { color: C.textSub }]}> · {review.date}</Text>
                  </View>
                </View>
              </View>
              <Text style={[styles.reviewComment, { color: C.textSub }]}>{review.comment}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Floating Action Button ── */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={handleFabPress}
        style={styles.fabButton}
        disabled={checkingPenalty}
      >
        <LinearGradient
          colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          {checkingPenalty ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <MaterialIcons name="add" size={28} color="#FFFFFF" />
          )}
        </LinearGradient>
      </TouchableOpacity>

      <AIProcessingModal
        visible={processing}
        progress={progress}
        imageCount={images.length}
        onCancel={cancelProcessing}
      />
      {showTagScreen && images.length > 0 && (
        <PortfolioTagScreen images={images} onClose={handleCloseTagScreen} />
      )}

      {/* ── Penalty Restriction Warning Modal ── */}
      <Modal
        visible={showPenaltyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPenaltyModal(false)}
      >
        <Pressable
          style={styles.penaltyModalOverlay}
          onPress={() => setShowPenaltyModal(false)}
        >
          <Pressable
            style={[
              styles.penaltyModalContainer,
              { backgroundColor: isDark ? '#1C192E' : '#FFFFFF', borderColor: isDark ? '#3D2A5C' : '#E2E8F0' },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Warning Icon Badge */}
            <View style={styles.penaltyWarningBadge}>
              <MaterialIcons name="warning" size={32} color="#EF4444" />
            </View>

            {/* Score Pill */}
            <View style={styles.penaltyScoreCapsule}>
              <MaterialCommunityIcons name="shield-alert" size={14} color="#EF4444" />
              <Text style={styles.penaltyScoreCapsuleText}>
                Penalty Score: {penaltyRatio} (Critical Limit)
              </Text>
            </View>

            <Text style={[styles.penaltyModalTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
              Posting Restricted
            </Text>

            <Text style={[styles.penaltyModalBody, { color: isDark ? '#CBD5E1' : '#475569' }]}>
              Your penalty score has reached <Text style={{ fontWeight: '600', color: '#EF4444' }}>{penaltyRatio}</Text> due to missed or cancelled bookings. You cannot create new posts until your penalty points are reduced below 3.
              {'\n\n'}
              Please submit an inquiry for your missed bookings as soon as possible to get approval from Administration and restore your account access.
            </Text>

            {/* Action Buttons */}
            <TouchableOpacity
              style={styles.penaltySubmitBtn}
              onPress={() => {
                setShowPenaltyModal(false);
                navigation.navigate('SubmitInquiry');
              }}
              activeOpacity={0.85}
            >
              <MaterialIcons name="rate-review" size={18} color="#FFFFFF" />
              <Text style={styles.penaltySubmitBtnText}>Submit Inquiry Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.penaltyDismissBtn, { borderColor: isDark ? '#334155' : '#E2E8F0' }]}
              onPress={() => setShowPenaltyModal(false)}
              activeOpacity={0.7}
            >
              <Text style={[styles.penaltyDismissBtnText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                Close
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

  heroCard: {
    borderRadius: 24, borderWidth: 0.5,
    alignItems: 'center', paddingTop: 24,
    marginBottom: 14, overflow: 'hidden',
  },
  avatarRing: {
    width: 82, height: 82, borderRadius: 41,
    borderWidth: 3, borderColor: '#7C3AED',
    padding: 3, marginBottom: 12, position: 'relative',
  },
  avatarCircle: {
    width: '100%', height: '100%', borderRadius: 38,
    backgroundColor: '#2563EB',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarInitials: { fontSize: 28, fontWeight: '600', color: '#ecc5c5', fontFamily: 'sans-serif' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#16A34A', borderWidth: 2.5,
  },
  profileName: { fontSize: 20, fontWeight: '600', marginBottom: 3 },
  profileHandle: { fontSize: 12, marginBottom: 12 },

  badgeRow: { flexDirection: 'row', gap: 7, marginBottom: 18, flexWrap: 'wrap', justifyContent: 'center' },
  goldBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFFBEB', borderWidth: 1, borderColor: '#FDE68A',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  goldBadgeText: { fontSize: 11, color: '#B45309', fontWeight: '600' },
  verifiedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  verifiedBadgeText: { fontSize: 11, color: '#1D4ED8', fontWeight: '600' },
  onlineBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#ECFDF5', borderWidth: 1, borderColor: '#A7F3D0',
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  onlineDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  onlineBadgeText: { fontSize: 11, color: '#065F46', fontWeight: '600' },
  offlineBadge: { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' },
  offlineBadgeText: { color: '#6B7280' },
  offlineDotSmall: { backgroundColor: '#9CA3AF' },
  availabilityToggle: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#7C3AED',
  },
  availabilityToggleDisabled: {
    opacity: 0.65,
  },
  availabilityToggleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  statsStrip: { flexDirection: 'row', width: '100%', borderTopWidth: 0.5, paddingVertical: 14 },
  statCell: { flex: 1, alignItems: 'center', gap: 3 },
  statVal: { fontSize: 15, fontWeight: '600' },
  statLbl: { fontSize: 10, textAlign: 'center' },
  statDivider: { width: 0.5 },

  section: { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '600' },
  seeAll: { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  bioText: { fontSize: 18, lineHeight: 21, marginBottom: 8, color: '#010101', fontFamily: 'sans-serif', fontWeight: '400' },
  bioTextSi: { fontSize: 12, lineHeight: 19, fontStyle: 'italic', fontWeight: '400' },

  featureRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    minHeight: 112,
    borderRadius: 14,
    borderWidth: 0.5,
    padding: 13,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 3,
  },
  featureSubtitle: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
  },

  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard: { width: '47%', borderRadius: 12, padding: 14, borderWidth: 0.5 },
  serviceIconBg: { width: 42, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  serviceTitle: { fontSize: 12, fontWeight: '600', marginBottom: 4, lineHeight: 17 },
  servicePrice: { fontSize: 12, fontWeight: '600' },

  skillsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  skillChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  skillText: { fontSize: 12, fontWeight: '500' },
  skillChipAI: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  skillTextAI: { fontSize: 12, fontWeight: '500' },
  aiTagNote: { fontSize: 11, color: '#16A34A', fontStyle: 'italic', marginTop: 4 },
  countBadgeTextSmall: { fontSize: 12, fontWeight: '600' },
  seeMoreTagsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 10, marginBottom: 4, paddingVertical: 8, borderRadius: 12, borderWidth: 1,
  },
  seeMoreTagsText: { fontSize: 12, fontWeight: '600', color: '#16A34A' },

  portfolioEmpty: { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' },
  portfolioEmptyTitle: { fontSize: 14, fontWeight: '600', marginTop: 8, marginBottom: 4 },
  portfolioEmptySub: { fontSize: 12, textAlign: 'center' },

  // Wraps the category scroller so the corner button/tooltip can be absolutely positioned against it
  portfolioContainer: { position: 'relative', paddingTop: 14, paddingRight: 6 },

  // Small round "add more" button pinned to the top-right corner of the portfolio section
  addImageCorner: {
    position: 'absolute',
    top: -2,
    right: -8,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },

  // Tooltip bubble that pops up above the corner button when tapped
  addTooltip: {
    position: 'absolute',
    top: -34,
    right: -8,
    zIndex: 20,
    backgroundColor: 'rgba(17,17,17,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addTooltipText: { color: '#fff', fontSize: 11, fontWeight: '600' },

  // Horizontal category scroller
  categoryScrollContent: { gap: 12, paddingVertical: 4, paddingRight: 8 },
  categoryCard: {
    width: 96, height: 96, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
    position: 'relative', overflow: 'hidden',
  },
  categoryCountBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 10,
    minWidth: 20, paddingHorizontal: 5, paddingVertical: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  categoryCountText: { fontSize: 10, color: '#fff', fontWeight: '600' },
  categoryLabelGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 18, paddingBottom: 8, paddingHorizontal: 6,
    alignItems: 'center',
  },
  categoryLabelText: { fontSize: 12, fontWeight: '600', color: '#fff' },

  ratingPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  ratingPillText: { fontSize: 12, color: '#B45309', fontWeight: '600' },

  reviewCard: { borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 0.5 },
  reviewHeader: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  reviewMeta: { flex: 1 },
  reviewName: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  reviewStars: { flexDirection: 'row', alignItems: 'center' },
  reviewDate: { fontSize: 11 },
  reviewComment: { fontSize: 13, lineHeight: 19 },

  // ── Eye-Catching Round FAB Button Styles ──
  fabButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitInquiryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#f3f4ff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12 },
  submitInquiryBtnText: { fontSize: 13, fontWeight: '600', color: '#6366f1' },

  // ── Penalty Restriction Modal Styles ──
  penaltyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 22,
  },
  penaltyModalContainer: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
  },
  penaltyWarningBadge: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: 'rgba(239, 68, 68, 0.14)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  penaltyScoreCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 12,
  },
  penaltyScoreCapsuleText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#EF4444',
  },
  penaltyModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  penaltyModalBody: {
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  penaltySubmitBtn: {
    width: '100%',
    height: 48,
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  penaltySubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  penaltyDismissBtn: {
    width: '100%',
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  penaltyDismissBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});