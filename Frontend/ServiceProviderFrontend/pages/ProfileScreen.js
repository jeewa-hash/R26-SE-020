import React, { useContext, useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Dimensions, Alert
} from 'react-native';
import { Text, FAB, Surface } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Ensure this is installed
import { ThemeContext } from '../context/ThemeContext';
import { usePortfolioUpload } from '../hooks/usePortfolioUpload';
import AIProcessingModal from '../components/portfolio/AIProcessingModal';
import PortfolioTagScreen from '../components/portfolio/PortfolioTagScreen';
import { usePortfolio } from '../context/PortfolioContext';
import { Colors } from '../theme';
import HeaderSection from '../components/HeaderSection';
import { CONFIG } from '../config';
import ProviderPostsSection from './Providerpostssection .js';


const { width } = Dimensions.get('window');

const SKILLS = [
  'Pipe Repair', 'Water Supply', 'Drain Cleaning',
  'Emergency', 'Residential', 'Commercial',
];

const REVIEWS = [
  { id: '1', name: 'Kumara P.',  rating: 5, comment: 'Excellent work! Fixed the pipe quickly and professionally.', date: 'May 8'  },
  { id: '2', name: 'Anoma S.',   rating: 5, comment: 'Very reliable and honest. Will hire again.',                  date: 'May 3'  },
  { id: '3', name: 'Samira W.',  rating: 4, comment: 'Good service, arrived on time and completed the job well.',   date: 'Apr 28' },
];

const SERVICES = [
  { id: '1', title: 'Emergency Pipe Repair',  price: 'LKR 2,500+', icon: 'plumbing', color: '#2563EB' },
  { id: '2', title: 'Drain Cleaning',          price: 'LKR 1,800+', icon: 'water',    color: '#0891B2' },
  { id: '3', title: 'Water Tank Service',      price: 'LKR 3,500+', icon: 'opacity',  color: '#7C3AED' },
  { id: '4', title: 'Full Plumbing Install',   price: 'LKR 8,000+', icon: 'build',    color: '#059669' },
];

const getInitials = (name) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase();

export default function ProfileScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext);
  const { portfolioImages, getAllTags } = usePortfolio();
  const {
    images, processing, progress,
    showTagScreen, openGallery, cancelProcessing, resetAll,
  } = usePortfolioUpload();

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
    rating: '4.9★',
    completion: '98%',
    earned: '45K',
  });
  const [loading, setLoading] = useState(true);

  // Fetch profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get token from AsyncStorage
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
            jobs: '124', // From hardcoded stats or backend if available
            rating: '4.9★', // From hardcoded stats or backend if available
            completion: '98%', // From hardcoded stats or backend if available
            earned: '45K', // From hardcoded stats or backend if available
          });
        }
      } catch (err) {
        Alert.alert('Error', `Failed to load profile\n${err.message}`);
        console.log('Profile fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const allTags       = getAllTags();
  const [showAddTooltip, setShowAddTooltip] = React.useState(false);

  // Group portfolio images by their AI/user tags into categories for the horizontal scroller
  const categoryMap = {};
  portfolioImages.forEach((img) => {
    const tags = img.tags && img.tags.length > 0 ? img.tags : ['Uncategorized'];
    tags.forEach((tag) => {
      if (!categoryMap[tag]) categoryMap[tag] = [];
      categoryMap[tag].push(img);
    });
  });
  const categories = Object.keys(categoryMap).map((tag) => ({
    name: tag,
    count: categoryMap[tag].length,
  }));

  const CATEGORY_COLORS = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#DC2626', '#0891B2'];
  
  const handleAddPress = () => {
    setShowAddTooltip(true);
    openGallery();
    setTimeout(() => setShowAddTooltip(false), 1600);
  };

  const C = isDark
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', subCard: '#2a2a2a' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', subCard: '#F8FAFC' };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        
         <HeaderSection 
              navigation={navigation}
              //userName={userName}          // From your state: 'Kasun' or loaded from storage
              //avatarUrl={userAvatar}       // From your state: null or loaded from storage
              //search={search}              // Your search state
              //onSearchChange={setSearch}   // Your search setter
              //unreadCount={unreadCount}    // Your notification count
              onInboxPress={() => navigation.navigate('Messages')}
              // onMenuPress is optional - the HeaderSection now handles it internally
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
          <Text style={[styles.profileHandle, { color: C.textSub }]}>{profile.category} · {profile.district}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.goldBadge}>
              <MaterialIcons name="emoji-events" size={12} color="#F59E0B" />
              <Text style={styles.goldBadgeText}>Top Rated Pro</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <MaterialIcons name="verified" size={12} color="#2563EB" />
              <Text style={styles.verifiedBadgeText}>Verified</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDotSmall} />
              <Text style={styles.onlineBadgeText}>Available</Text>
            </View>
          </View>

          {/* Stats strip */}
          <View style={[styles.statsStrip, { borderTopColor: C.border }]}>
            {[
              { val: profile.jobs,       lbl: 'Jobs',       icon: 'work',                   color: '#2563EB' },
              { val: profile.rating,     lbl: 'Rating',      icon: 'star',                   color: '#F59E0B' },
              { val: profile.completion, lbl: 'Completion',   icon: 'check-circle',           color: '#16A34A' },
              { val: profile.earned,     lbl: 'Earned',       icon: 'account-balance-wallet', color: '#7C3AED' },
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

        {/* ── Bio ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>About Me</Text>
          <Text style={[styles.bioText, { color: C.textSub }]}>
            {profile.bio}
          </Text>
    
        </View>

        {/* ── Services ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>My Services</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>+ Add Service</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.servicesGrid}>
            {SERVICES.map((svc) => (
              <View key={svc.id} style={[styles.serviceCard, { backgroundColor: C.subCard, borderColor: C.border }]}>
                <View style={[styles.serviceIconBg, { backgroundColor: svc.color + '18' }]}>
                  <MaterialIcons name={svc.icon} size={22} color={svc.color} />
                </View>
                <Text style={[styles.serviceTitle, { color: C.text }]} numberOfLines={2}>{svc.title}</Text>
                <Text style={[styles.servicePrice, { color: svc.color }]}>{svc.price}</Text>
              </View>
            ))}
          </View>
        </View>
        <ProviderPostsSection navigation={navigation} isDark={isDark} />

        {/* ── Skills ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>Skills & Expertise</Text>
          <View style={styles.skillsWrap}>
            {SKILLS.map((skill) => (
              <View key={skill} style={[styles.skillChip, {
                backgroundColor: isDark ? '#1e1b3a' : '#EFF6FF',
                borderColor:     isDark ? '#2d2860' : '#BFDBFE',
              }]}>
                <Text style={[styles.skillText, { color: isDark ? '#AFA9EC' : '#1D4ED8' }]}>{skill}</Text>
              </View>
            ))}
            {allTags.map((tag) => (
              <View key={tag} style={[styles.skillChipAI, {
                backgroundColor: isDark ? '#0d2820' : '#F0FDF4',
                borderColor:     isDark ? '#145040' : '#A7F3D0',
              }]}>
                <MaterialIcons name="auto-awesome" size={10} color="#16A34A" />
                <Text style={[styles.skillTextAI, { color: '#16A34A' }]}>{tag}</Text>
              </View>
            ))}
          </View>
          {allTags.length > 0 && (
            <Text style={styles.aiTagNote}>✨ {allTags.length} tags detected by AI from your portfolio</Text>
          )}
        </View>
        <View style={styles.btnContainer}>
                    <TouchableOpacity 
                      style={styles.submitInquiryBtn}
                      onPress={() => navigation.navigate('SubmitInquiry')}
                    >
                      <MaterialIcons name="rate-review" size={18} color="#6366f1" />
                      <Text style={styles.submitInquiryBtnText}>Submit Inquiries</Text>
                    </TouchableOpacity>
                  </View>

        {/* ── Portfolio ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Portfolio</Text>
          </View>

          {portfolioImages.length === 0 ? (
            <TouchableOpacity style={[styles.portfolioEmpty, { backgroundColor: C.subCard, borderColor: C.border }]} onPress={openGallery}>
              <MaterialIcons name="add-photo-alternate" size={32} color={Colors.primary} />
              <Text style={[styles.portfolioEmptyTitle, { color: C.text }]}>Add Portfolio Images</Text>
              <Text style={[styles.portfolioEmptySub, { color: C.textSub }]}>Upload work photos — AI will tag them automatically</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.portfolioContainer}>
              {/* Corner "add more" button — only shown once the user has images */}
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
                      <MaterialIcons name="photo" size={30} color={color} />

                      <View style={styles.categoryCountBadge}>
                        <Text style={styles.categoryCountText}>{cat.count}</Text>
                      </View>

                      <LinearGradient
                        colors={['transparent', 'rgba(0,0,0,0.78)']}
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

      {/* ── Eye-Catching Round Floating Action Button ── */}
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.getParent()?.navigate('PostGeneration')}
        style={styles.fabButton}
      >
        <LinearGradient
          colors={['#7C3AED', '#8B5CF6', '#A78BFA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>

      <AIProcessingModal
        visible={processing}
        progress={progress}
        imageCount={images.length}
        onCancel={cancelProcessing}
      />
      {showTagScreen && images.length > 0 && (
        <PortfolioTagScreen images={images} onClose={resetAll} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1 },
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
  avatarInitials: { fontSize: 28, fontWeight: 'bold', color: '#ecc5c5', fontFamily: 'sans-serif' },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#16A34A', borderWidth: 2.5,
  },
  profileName:   { fontSize: 20, fontWeight: '700', marginBottom: 3 },
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
  onlineDotSmall:  { width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A' },
  onlineBadgeText: { fontSize: 11, color: '#065F46', fontWeight: '600' },

  statsStrip:  { flexDirection: 'row', width: '100%', borderTopWidth: 0.5, paddingVertical: 14 },
  statCell:    { flex: 1, alignItems: 'center', gap: 3 },
  statVal:     { fontSize: 15, fontWeight: '700' },
  statLbl:     { fontSize: 10, textAlign: 'center' },
  statDivider: { width: 0.5 },

  section:       { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },
  seeAll:        { fontSize: 13, color: Colors.primary, fontWeight: '600' },

  bioText:   { fontSize: 18, lineHeight: 21, marginBottom: 8, color: '#010101', fontFamily: 'sans-serif', fontWeight: 'bold' },
  bioTextSi: { fontSize: 12, lineHeight: 19, fontStyle: 'italic', fontWeight: 'bold' },

  servicesGrid:  { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceCard:   { width: '47%', borderRadius: 12, padding: 14, borderWidth: 0.5 },
  serviceIconBg: { width: 42, height: 42, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  serviceTitle:  { fontSize: 12, fontWeight: '600', marginBottom: 4, lineHeight: 17 },
  servicePrice:  { fontSize: 12, fontWeight: '700' },

  skillsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  skillChip:   { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  skillText:   { fontSize: 12, fontWeight: '500' },
  skillChipAI: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  skillTextAI: { fontSize: 12, fontWeight: '500' },
  aiTagNote:   { fontSize: 11, color: '#16A34A', fontStyle: 'italic' },

  portfolioEmpty:      { alignItems: 'center', padding: 24, borderRadius: 12, borderWidth: 2, borderStyle: 'dashed' },
  portfolioEmptyTitle: { fontSize: 14, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
  portfolioEmptySub:   { fontSize: 12, textAlign: 'center' },

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
  categoryCountText: { fontSize: 10, color: '#fff', fontWeight: '700' },
  categoryLabelGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingTop: 18, paddingBottom: 8, paddingHorizontal: 6,
    alignItems: 'center',
  },
  categoryLabelText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  ratingPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  ratingPillText: { fontSize: 12, color: '#B45309', fontWeight: '700' },

  reviewCard:       { borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 0.5 },
  reviewHeader:     { flexDirection: 'row', gap: 10, marginBottom: 8 },
  reviewAvatar:     { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  reviewAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  reviewMeta:       { flex: 1 },
  reviewName:       { fontSize: 13, fontWeight: '700', marginBottom: 3 },
  reviewStars:      { flexDirection: 'row', alignItems: 'center' },
  reviewDate:       { fontSize: 11 },
  reviewComment:    { fontSize: 13, lineHeight: 19 },

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
  submitInquiryBtnText: { fontSize: 13, fontWeight: '700', color: '#6366f1' },
});