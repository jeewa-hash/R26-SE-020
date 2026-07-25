import React, { useContext } from 'react';
import {
  View, ScrollView, TouchableOpacity, StyleSheet, StatusBar, Dimensions
} from 'react-native';
import { Text, FAB, Surface } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient'; // Ensure this is installed
import { ThemeContext } from '../context/ThemeContext';
import { usePortfolioUpload } from '../hooks/usePortfolioUpload';
import AIProcessingModal from '../components/portfolio/AIProcessingModal';
import PortfolioTagScreen from '../components/portfolio/PortfolioTagScreen';
import { usePortfolio } from '../context/PortfolioContext';
import { Colors } from '../theme';
import ProfileHeader from '../navigation/ProfileHeader';

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

  const allTags       = getAllTags();
  const previewImages = portfolioImages.slice(0, 6);

  const C = isDark
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', subCard: '#2a2a2a' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', subCard: '#F8FAFC' };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* ── Header + Sidebar ── */}
      <ProfileHeader navigation={navigation} onLogout={() => { /* handle logout */ }} />

      {/* ── Scrollable body ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >

        {/* ── Hero card ── */}
        <View style={[styles.heroCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitials}>KP</Text>
            </View>
            <View style={[styles.onlineDot, { borderColor: C.card }]} />
          </View>

          <Text style={[styles.profileName, { color: C.text }]}>Kasun Perera</Text>
          <Text style={[styles.profileHandle, { color: C.textSub }]}>@kasunperera · Colombo, Sri Lanka</Text>

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
              { val: '124',   lbl: 'Jobs',       icon: 'work',                   color: '#2563EB' },
              { val: '4.9★', lbl: 'Rating',      icon: 'star',                   color: '#F59E0B' },
              { val: '98%',  lbl: 'Completion',   icon: 'check-circle',           color: '#16A34A' },
              { val: '45K',  lbl: 'Earned',       icon: 'account-balance-wallet', color: '#7C3AED' },
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
            Professional plumber with 8+ years of experience in residential and commercial
            plumbing. Specialized in emergency repairs, pipe installations, and water supply
            systems. Serving Colombo and surrounding areas.
          </Text>
          <Text style={[styles.bioTextSi, { color: isDark ? '#555' : '#C4C9D4' }]}>
            වසර 8කට වැඩි පළපුරුද්දක් ඇති වෘත්තීය නළ සේවා ක්‍රියාකරු.
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

        {/* ── Portfolio ── */}
        <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: C.text }]}>Portfolio</Text>
            <TouchableOpacity onPress={() => navigation.getParent()?.navigate('PortfolioGallery')}>
              <Text style={styles.seeAll}>View All ({portfolioImages.length})</Text>
            </TouchableOpacity>
          </View>

          {previewImages.length === 0 ? (
            <TouchableOpacity style={[styles.portfolioEmpty, { backgroundColor: C.subCard, borderColor: C.border }]} onPress={openGallery}>
              <MaterialIcons name="add-photo-alternate" size={32} color={Colors.primary} />
              <Text style={[styles.portfolioEmptyTitle, { color: C.text }]}>Add Portfolio Images</Text>
              <Text style={[styles.portfolioEmptySub, { color: C.textSub }]}>Upload work photos — AI will tag them automatically</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.portfolioGrid}>
              {previewImages.map((img, index) => {
                const tagColors = ['#2563EB', '#7C3AED', '#059669', '#F59E0B', '#DC2626', '#0891B2'];
                const color = tagColors[index % tagColors.length];
                return (
                  <TouchableOpacity
                    key={img.id}
                    style={[styles.portfolioItem, { backgroundColor: color + '20' }]}
                    onPress={() => navigation.getParent()?.navigate('PortfolioGallery')}
                  >
                    <MaterialIcons name="photo" size={28} color={color} />
                    <View style={styles.portfolioTagCount}>
                      <Text style={styles.portfolioTagCountText}>{img.tags.length}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
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
  portfolioGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  portfolioItem: {
    width: '30%', aspectRatio: 1, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center', position: 'relative',
  },
  portfolioTagCount:     { position: 'absolute', bottom: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 },
  portfolioTagCountText: { fontSize: 9, color: '#fff', fontWeight: '700' },

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
});