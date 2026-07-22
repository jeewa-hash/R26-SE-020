import React from 'react';
import { View, TouchableOpacity, StyleSheet, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTranslatePost } from '../../hooks/useTranslatePost';
import { useAppliedJobs } from '../../context/AppliedJobsContext';
import { CATEGORY_COLORS } from '../../constants/feedData';
import { JOB_STATUS } from '../../constants/jobStatus';
import { Colors } from '../../theme';
import i18n from '../../locales';

const { width } = Dimensions.get('window');

// Generate consistent color from string
const getAvatarColor = (name) => {
  const colors = [
    '#2563EB', '#7C3AED', '#059669', '#DC2626',
    '#D97706', '#0891B2', '#BE185D', '#4F46E5',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
};

const getInitials = (name) =>
  name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);

// Category image mapping
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

export default function PostCard({ post }) {
  const { t } = useTranslation();
  const { displayText, handleTranslate, loading, isTranslated, targetLang } =
    useTranslatePost(post.lang);
  const { applyToJob, isApplied, getJobStatus } = useAppliedJobs();

  const applied = isApplied(post.id);
  const statusKey = getJobStatus(post.id);
  const status = statusKey ? Object.values(JOB_STATUS).find((s) => s.key === statusKey) : null;
  const categoryColor = CATEGORY_COLORS[post.category] || Colors.primary;
  const isSi = i18n.language === 'si';
  const avatarColor = getAvatarColor(post.customer);
  const initials = getInitials(post.customer);
  const categoryImage = getCategoryImage(post.category);

  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.card}>
      {/* Cover Image */}
      <View style={styles.imageContainer}>
        <Image source={{ uri: categoryImage }} style={styles.coverImage} />
        <View style={styles.imageOverlay} />
        
        {/* Category Badge on Image */}
        <View style={[styles.imageCategoryBadge, { backgroundColor: categoryColor }]}>
          <Text style={styles.imageCategoryText}>{post.category}</Text>
        </View>
        
        {/* Badges */}
        <View style={styles.imageBadges}>
          {post.urgent && (
            <View style={styles.urgentBadge}>
              <MaterialIcons name="priority-high" size={12} color="#DC2626" />
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
          <Text style={styles.budgetBadgeValue}>{post.budget}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Header with Avatar and Customer Info */}
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.customerName}>{post.customer}</Text>
            <View style={styles.locationTime}>
              <MaterialIcons name="location-on" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{post.location}</Text>
              <View style={styles.dot} />
              <MaterialIcons name="access-time" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{post.time}</Text>
            </View>
          </View>
        </View>

        {/* Description */}
        <Text style={styles.description}>{displayText(post.description)}</Text>

        {/* Translate Button */}
        <TouchableOpacity
          style={styles.translateBtn}
          onPress={() => handleTranslate(post.description)}
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
              <Text style={styles.statValue}>{post.applied + (applied ? 1 : 0)}</Text>
              <Text style={styles.statLabel}>Applied</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <MaterialIcons name="visibility" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statValue}>{post.views}</Text>
              <Text style={styles.statLabel}>Views</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBg}>
              <MaterialIcons name="star" size={14} color="#7C3AED" />
            </View>
            <View>
              <Text style={styles.statValue}>4.8</Text>
              <Text style={styles.statLabel}>Rating</Text>
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
          ]}
          onPress={() => applyToJob(post)}
          disabled={applied}
          activeOpacity={applied ? 1 : 0.9}
        >
          <MaterialIcons
            name={applied ? 'check-circle' : 'send'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.applyBtnText}>
            {applied
              ? (isSi ? status?.labelSi : status?.label)
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

  // Image Section
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
    backgroundColor: 'rgba(0,0,0,0.3)',
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

  // Content Section
  contentContainer: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
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
    fontSize: 16,
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
});