import React from 'react';
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

export default function PostCard({ post, onApply, applying }) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { displayText, handleTranslate, loading, isTranslated, targetLang } =
    useTranslatePost(post.lang);
  const { isApplied, getJobStatus } = useAppliedJobs();

  const applied = isApplied(post.id);
  const statusKey = getJobStatus(post.id);
  const status = statusKey ? Object.values(JOB_STATUS).find((s) => s.key === statusKey) : null;
  const categoryColor = CATEGORY_COLORS[post.category] || Colors.primary;
  const isSi = i18n.language === 'si';

  const posterName = resolvePosterName(post);
  const posterAvatar = resolvePosterAvatar(post);
  const avatarColor = getAvatarColor(posterName);
  const initials = getInitials(posterName);

  const categoryImage = getCategoryImage(post.category);
  const coverImage = resolveImage(post, categoryImage);

  const urgencyStyles = {
    low: { bg: '#DBEAFE', color: '#1D4ED8', label: 'Low Priority' },
    medium: { bg: '#FEF3C7', color: '#B45309', label: 'Medium' },
    high: { bg: '#FEE2E2', color: '#DC2626', label: '🔥 High Priority' },
  };
  const urgency = urgencyStyles[post.urgency] || urgencyStyles.medium;

  const appliedCount = Number(
    (post.appliedCount ?? 0) || (post.applied ?? 0) || 0
  );

  const openDetail = () => {
    navigation.navigate('ProviderPostDetail', { post: { ...post, _id: post._id || post.id } });
  };

  const doApply = (e) => {
    if (e) e.stopPropagation && e.stopPropagation();
    if (onApply) onApply(post);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={styles.card}
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
          <Text style={styles.imageCategoryText}>{post.category}</Text>
        </View>

        {/* Badges */}
        <View style={styles.imageBadges}>
          <View style={[styles.urgencyBadge, { backgroundColor: urgency.bg }]}>
            <MaterialIcons
              name={post.urgency === 'high' ? 'priority-high' : post.urgency === 'low' ? 'low-priority' : 'flag'}
              size={12}
              color={urgency.color}
            />
            <Text style={[styles.urgencyText, { color: urgency.color }]}>
              {urgency.label}
            </Text>
          </View>
          {appliedCount > 0 && (
            <View style={styles.bidsBadge}>
              <MaterialIcons name="people" size={12} color="#6366F1" />
              <Text style={styles.bidsBadgeText}>{appliedCount} bids</Text>
            </View>
          )}
          {post.urgent && (
            <View style={styles.urgentBadge}>
              <MaterialIcons name="whatshot" size={12} color="#DC2626" />
              <Text style={styles.urgentText}>URGENT</Text>
            </View>
          )}
          {post.aiMatch && (
            <View style={styles.aiMatchBadge}>
              <MaterialIcons name="auto-awesome" size={12} color="#FF9800" />
              <Text style={styles.aiMatchText}>{post.aiMatch}% Match</Text>
            </View>
          )}
        </View>

        {/* Budget Badge */}
        <View style={styles.budgetBadge}>
          <Text style={styles.budgetBadgeLabel}>Budget</Text>
          <Text style={styles.budgetBadgeValue}>{post.budget || 'N/A'}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Post Title */}
        {post.title ? (
          <Text style={styles.postTitle}>{displayText(post.title)}</Text>
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
            <Text style={styles.customerName}>{posterName}</Text>
            <View style={styles.locationTime}>
              <MaterialIcons name="location-on" size={12} color="#6B7280" />
              <Text style={styles.metaText} numberOfLines={1}>
                {post.poster?.district || post.locationCity || post.locationDistrict || post.location || 'Unknown'}
              </Text>
              <View style={styles.dot} />
              <MaterialIcons name="access-time" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{post.time}</Text>
            </View>
          </View>
        </View>

        {/* Full Location Details */}
        {(post.locationAddress || post.locationDistrict || post.locationCity) && (
          <View style={styles.locationDetails}>
            {post.locationAddress ? (
              <View style={styles.locationRow}>
                <MaterialIcons name="home" size={13} color="#6B7280" />
                <Text style={styles.locationDetailText} numberOfLines={2}>
                  {post.locationAddress}
                </Text>
              </View>
            ) : null}
            {(post.locationDistrict || post.locationCity) && (
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={13} color="#6B7280" />
                <Text style={styles.locationDetailText}>
                  {[post.locationDistrict, post.locationCity].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Description */}
        <Text style={styles.description} numberOfLines={3}>{displayText(post.description)}</Text>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {post.tags.slice(0, 6).map((tag, i) => (
              <View key={`${tag}-${i}`} style={styles.tagChip}>
                <MaterialIcons name="label" size={10} color="#7C3AED" />
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Translate Button */}
        <TouchableOpacity
          style={styles.translateBtn}
          onPress={(e) => { e.stopPropagation && e.stopPropagation(); handleTranslate(post.description); }}
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
              : `${t('translateTo')} ${targetLang === 'si' ? 'සිංහල' : 'English'}`
            }
          </Text>
        </TouchableOpacity>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <MaterialIcons name="people" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statValue}>{appliedCount + (applied ? 1 : 0)}</Text>
              <Text style={styles.statLabel}>Applied</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <MaterialIcons name="visibility" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statValue}>{post.views || 0}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <MaterialIcons name="chat-bubble-outline" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statValue}>Open</Text>
              <Text style={styles.statLabel}>Tap to View Details</Text>
            </View>
          </View>
        </View>

        {/* Status Banner */}
        {applied && status && (
          <View style={[styles.statusBanner, { backgroundColor: status.bg, borderLeftColor: status.color }]}>
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
              : t('applyNow')
            }
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000',
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
    backgroundColor: '#EEF2FF',
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
    backdropFilter: 'blur(10px)',
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
  avatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  locationTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#D1D5DB',
  },
  description: {
    fontSize: 14,
    color: '#4B5563',
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
    backgroundColor: '#F3E8FF',
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
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
    marginBottom: 12,
    lineHeight: 24,
  },
  locationDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
  },
  locationDetailText: {
    flex: 1,
    fontSize: 12,
    color: '#4B5563',
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
    backgroundColor: '#F3E8FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6D28D9',
  },
});
