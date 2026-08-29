import React, { useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTranslatePost } from '../../hooks/useTranslatePost';
import { useAppliedJobs } from '../../context/AppliedJobsContext';
import { CATEGORY_COLORS } from '../../constants/feedData';
import { JOB_STATUS } from '../../constants/jobStatus';
import { Colors } from '../../theme';
import i18n from '../../locales';
import { CONFIG } from '../../config';
import { useNavigation } from '@react-navigation/native';
import { ThemeContext } from '../../context/ThemeContext';

const { width } = Dimensions.get('window');

const getAvatarColor = (name) => {
  const colors = [
    '#2563EB', '#7C3AED', '#059669', '#DC2626',
    '#D97706', '#0891B2', '#BE185D', '#4F46E5',
  ];
  let hash = 0;
  for (let i = 0; i < (name || 'U').length; i++) hash += (name || 'U').charCodeAt(i);
  return colors[hash % colors.length];
};

const getInitials = (name) => {
  if (!name) return 'U';
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
};

const resolveImage = (post, categoryImage) => {
  if (!post) return categoryImage;
  const raw = post.postImage || post.image;
  if (!raw) return categoryImage;
  if (raw.startsWith('http')) return raw;
  return `${CONFIG.SEEKER_SERVICE_URL}/${String(raw).replace(/\\/g, '/')}`;
};

const resolvePosterName = (post) => {
  if (!post) return 'Unknown User';
  return (
    post.poster?.name ||
    post.user?.name ||
    post.user?.fullName ||
    post.user?.userName ||
    post.user?.createdBy ||
    post.customer ||
    'Unknown User'
  );
};

const resolvePosterAvatar = (post) => {
  if (!post) return null;
  const raw =
    post.poster?.profilePicture ||
    post.user?.profilePicture ||
    post.user?.profileImage ||
    post.user?.avatar ||
    null;
  if (!raw) return null;
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('data:')) return raw;
  return `${CONFIG.AUTH_SERVICE_URL}/${String(raw).replace(/\\/g, '/')}`;
};

const getCategoryImage = (category) => {
  const images = {
    'Plumbing': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
    'Electrical': 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400',
    'Cleaning': 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=400',
    'Painting': 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=400',
    'Gardening': 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400',
    'Carpentry': 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=400',
    'Moving': 'https://images.unsplash.com/photo-1609513437641-2f7155c2e287?w=400',
    'Renovation': 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=400',
    'default': 'https://images.unsplash.com/photo-1581091226033-d5c48150dbaa?w=400',
  };
  return images[category] || images.default;
};

// =======================================================
// LOCATION HELPER
// Extracts address, city, and district from post safely
// =======================================================
const resolveLocationDetails = (post) => {
  if (!post) return { address: '', district: '', city: '', headerLocation: 'Unknown' };

  let address = post.locationAddress || '';
  let city = post.locationCity || '';
  let district = post.locationDistrict || post.poster?.district || post.user?.district || '';

  if (typeof post.location === 'object' && post.location !== null) {
    address = address || post.location.address || post.location.formattedAddress || '';
    city = city || post.location.city || post.location.town || '';
    district = district || post.location.district || post.location.state || '';
  } else if (typeof post.location === 'string' && post.location.trim().length > 0) {
    address = address || post.location;
  }

  const headerLocation = district || city || address || 'Unknown';
  const regionText = [district, city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');

  return {
    address,
    regionText,
    headerLocation,
  };
};

export default function PostCard({ post, onApply, applying }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isDark } = useContext(ThemeContext);
  const { displayText, handleTranslate, loading, isTranslated, targetLang } =
    useTranslatePost(post?.lang);
  const { isApplied, getJobStatus } = useAppliedJobs();

  const postId = post?._id || post?.id;
  const applied = isApplied(postId);
  const statusKey = getJobStatus(postId);
  const status = statusKey ? Object.values(JOB_STATUS).find((s) => s.key === statusKey) : null;
  const categoryColor = CATEGORY_COLORS[post?.category] || Colors.primary;
  const isSi = i18n.language === 'si';

  // Theme colors
  const C = isDark
    ? { 
        card: '#1C1C1E', 
        text: '#F2F2F7', 
        textSub: '#8E8E93', 
        border: '#2C2C2E',
        subCard: '#2A2A2A',
        statsBg: '#2C2C2E',
        locationBg: '#2A2A2A',
        locationBorder: '#3A3A3C',
        tagBg: '#2D1B3D',
        tagBorder: '#3D2B4D',
        tagText: '#A78BFA',
        translateBg: '#2D1B3D',
        statusBg: '#2A2A2A',
        shadowColor: 'rgba(0,0,0,0.4)',
      }
    : { 
        card: '#FFFFFF', 
        text: '#1F2937', 
        textSub: '#6B7280', 
        border: '#E5E7EB',
        subCard: '#F9FAFB',
        statsBg: '#F9FAFB',
        locationBg: '#F9FAFB',
        locationBorder: '#F3F4F6',
        tagBg: '#F3E8FF',
        tagBorder: '#EDE9FE',
        tagText: '#6D28D9',
        translateBg: '#F3E8FF',
        statusBg: '#F9FAFB',
        shadowColor: 'rgba(0,0,0,0.08)',
      };

  const posterName = resolvePosterName(post);
  const posterAvatar = resolvePosterAvatar(post);
  const avatarColor = getAvatarColor(posterName);
  const initials = getInitials(posterName);

  const categoryImage = getCategoryImage(post?.category);
  const coverImage = resolveImage(post, categoryImage);

  const locationData = resolveLocationDetails(post);

  const urgencyStyles = {
    low: { bg: isDark ? '#1A2A4A' : '#DBEAFE', color: isDark ? '#60A5FA' : '#1D4ED8', label: 'Low Priority' },
    medium: { bg: isDark ? '#3D2A1A' : '#FEF3C7', color: isDark ? '#FBBF24' : '#B45309', label: 'Medium' },
    high: { bg: isDark ? '#3D1A1A' : '#FEE2E2', color: isDark ? '#F87171' : '#DC2626', label: '🔥 High Priority' },
  };
  const urgency = urgencyStyles[post?.urgency] || urgencyStyles.medium;

  const appliedCount = Number(
    (post?.appliedCount ?? 0) || (post?.applied ?? 0) || 0
  );

  const openDetail = () => {
    navigation.navigate('ProviderPostDetail', { post: { ...post, _id: postId } });
  };

  const doApply = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onApply) onApply(post);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[styles.card, { 
        backgroundColor: C.card,
        shadowColor: C.shadowColor,
      }]}
      onPress={openDetail}
    >
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: coverImage }}
          style={styles.coverImage}
          defaultSource={{ uri: categoryImage }}
        />
        <View style={styles.imageOverlay} />

        {/* Category Badge on Image */}
        <View style={[styles.imageCategoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.imageCategoryText}>{post?.category}</Text>
        </View>

        {/* Badges */}
        <View style={styles.imageBadges}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
            <MaterialIcons
              name={post?.urgency === 'high' ? 'priority-high' : post?.urgency === 'low' ? 'low-priority' : 'flag'}
              size={12}
              color={urgency.color}
            />
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>
          {appliedCount > 0 && (
            <View style={[styles.bidsBadge, { backgroundColor: isDark ? '#1A1A3A' : '#EEF2FF' }]}>
              <MaterialIcons name="people" size={12} color="#6366F1" />
              <Text style={styles.bidsBadgeText}>{appliedCount} bids</Text>
            </View>
          )}
          {post?.urgent && (
            <View style={styles.urgentBadge}>
              <MaterialIcons name="whatshot" size={12} color="#DC2626" />
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
          {post?.aiMatch && (
            <View style={styles.aiMatchBadge}>
              <MaterialIcons name="auto-awesome" size={12} color="#FF9800" />
              <Text style={styles.aiMatchText}>{post.aiMatch}% Match</Text>
            </View>
          )}
        </View>

        {/* Budget Badge */}
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetBadgeLabel}>Budget</Text>
          <Text style={styles.budgetBadgeValue}>{post?.budget || 'N/A'}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Post Title */}
        {post?.title ? (
          <Text style={[styles.postTitle, { color: C.text }]}>{displayText(post.title)}</Text>
        ) : null}

        {/* Header with Avatar and Customer Info */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: posterAvatar ? 'transparent' : avatarColor }]}>
            {posterAvatar ? (
              <Image
                source={{ uri: posterAvatar }}
                style={{ width: '100%', height: '100%', borderRadius: 24 }}
                defaultSource={{ uri: `https://randomuser.me/api/portraits/lego/${(posterName.length % 10) + 1}.jpg` }}
              />
            ) : (
              <Avatar.Text size={48} label={initials} style={{ backgroundColor: avatarColor }} labelStyle={{ fontSize: 16, fontWeight: 'bold', color: '#fff' }} />
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.customerName, { color: C.text }]}>{posterName}</Text>
            <View style={styles.locationTime}>
              <MaterialIcons name="location-on" size={12} color={C.textSub} />
              <Text style={[styles.metaText, { color: C.textSub }]} numberOfLines={1}>
                {locationData.headerLocation}
              </Text>
              <View style={[styles.dot, { backgroundColor: C.border }]} />
              <MaterialIcons name="access-time" size={12} color={C.textSub} />
              <Text style={[styles.metaText, { color: C.textSub }]}>{post?.time || 'Recently'}</Text>
            </View>
          </View>
        </View>

        {/* Full Location Details */}
        {(locationData.address || locationData.regionText) ? (
          <View style={[styles.locationDetails, { 
            backgroundColor: C.locationBg,
            borderColor: C.locationBorder,
          }]}>
            {locationData.address ? (
              <View style={styles.locationRow}>
                <MaterialIcons name="home" size={13} color={C.textSub} />
                <Text style={[styles.locationDetailText, { color: C.textSub }]} numberOfLines={2}>
                  {locationData.address}
                </Text>
              </View>
            ) : null}
            {locationData.regionText ? (
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={13} color={C.textSub} />
                <Text style={[styles.locationDetailText, { color: C.textSub }]}>
                  {locationData.regionText}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Description */}
        <Text style={[styles.description, { color: C.textSub }]} numberOfLines={3}>
          {displayText(post?.description)}
        </Text>

        {/* Tags */}
        {post?.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.slice(0, 6).map((tag, i) => (
              <View key={`${tag}-${i}`} style={[styles.tagChip, { 
                backgroundColor: C.tagBg,
                borderColor: C.tagBorder,
              }]}>
                <MaterialIcons name="label" size={10} color={C.tagText} />
                <Text style={[styles.tagText, { color: C.tagText }]}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Translate Button */}
        <TouchableOpacity
          style={[styles.translateBtn, { backgroundColor: C.translateBg }]}
          onPress={(e) => { if (e && e.stopPropagation) e.stopPropagation(); handleTranslate(post?.description); }}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size={14} color="#7C3AED" />
          ) : (
            <MaterialIcons name="g-translate" size={16} color="#7C3AED" />
          )}
          <Text style={styles.translateText}>
            {loading
              ? t('translating')
              : isTranslated
              ? t('showOriginal')
              : `${t('translateTo')} ${targetLang === 'si' ? 'සිංහල' : 'English'}`}
          </Text>
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={[styles.statsContainer, { backgroundColor: C.statsBg }]}>
          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: isDark ? '#2D1B3D' : '#EDE9FE' }]}>
              <MaterialIcons name="people" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: C.text }]}>{appliedCount + (applied ? 1 : 0)}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Applied</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: C.border }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: isDark ? '#2D1B3D' : '#EDE9FE' }]}>
              <MaterialIcons name="visibility" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: C.text }]}>{post?.views || 0}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Views</Text>
            </View>
          </View>

          <View style={[styles.statDivider, { backgroundColor: C.border }]} />

          <View style={styles.statItem}>
            <View style={[styles.statIconBg, { backgroundColor: isDark ? '#2D1B3D' : '#EDE9FE' }]}>
              <MaterialIcons name="chat-bubble-outline" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={[styles.statValue, { color: C.text }]}>Open</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Tap to View Details</Text>
            </View>
          </View>
        </View>

        {/* Status Banner */}
        {applied && status && (
          <View style={[styles.statusBanner, { 
            backgroundColor: C.statusBg,
            borderLeftColor: status.color,
          }]}>
            <MaterialIcons name={status.icon} size={18} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {isSi ? status.labelSi : status.label}
            </Text>
          </View>
        )}

        {/* Apply Button */}
        <TouchableOpacity
          style={[
            styles.applyBtn,
            applied && { backgroundColor: status?.color || '#10B981' },
            applying && { backgroundColor: '#A78BFA', opacity: 0.9 },
          ]}
          onPress={doApply}
          disabled={applied || applying}
          activeOpacity={applied ? 1 : 0.9}
        >
          {applying ? (
            <ActivityIndicator size={18} color="#FFFFFF" />
          ) : (
            <MaterialIcons
              name={applied ? 'check-circle' : 'send'}
              size={18}
              color="#FFFFFF"
            />
          )}
          <Text style={styles.applyBtnText}>
            {applying
              ? 'Applying...'
              : applied
              ? (isSi ? status?.labelSi : status?.label) || 'Applied'
              : t('applyNow')}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  imageContainer: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  imageCategoryBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  imageBadges: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
    alignItems: 'flex-end',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: 0.5,
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  bidsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  bidsBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
  },
  aiMatchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  aiMatchText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF9800',
  },
  budgetBadge: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
  },
  budgetBadgeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  budgetBadgeValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 2,
  },
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    marginTop: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  locationTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  translateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  translateText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  postTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
    lineHeight: 24,
  },
  locationDetails: {
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  locationDetailText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
});