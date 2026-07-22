import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
export const CARD_WIDTH = width - 32;

export const ANNOUNCEMENTS = [
  {
    id: '1',
    image: 'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?w=800',
    badgeLabel: 'New Feature',
    time: '2 hrs ago',
    title: 'Instant booking is now live for all pros',
    message: 'Clients can now book you directly without waiting for approval. Enable it in your settings to get more jobs faster.',
    ctaLabel: 'Learn More',
  },
  {
    id: '2',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&q=80',
    badgeLabel: 'Promotion',
    time: 'Yesterday',
    title: 'Earn 2× on every job this weekend',
    message: 'Complete 3 or more bookings between Fri–Sun and receive a 20% bonus on your total earnings automatically.',
    ctaLabel: 'View Offer',
  },
  {
    id: '3',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&auto=format&q=80',
    badgeLabel: 'Update',
    time: '3 days ago',
    title: 'Profile verification is faster than ever',
    message: 'We upgraded ID verification to under 2 minutes. Verified pros get 40% more visibility in search results.',
    ctaLabel: 'Get Verified',
  },
];

export default function AnnouncementCard({ item, onPress }) {
  const [saved, setSaved] = useState(false);

  return (
    <View style={styles.card}>
      {/* ── Image ── */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        <View style={styles.overlay} />

        <View style={styles.badge}>
          <Text style={styles.badgeText}>{item.badgeLabel}</Text>
        </View>

        <View style={styles.timeChip}>
          <MaterialIcons name="access-time" size={10} color="rgba(255,255,255,0.8)" />
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.message} numberOfLines={2}>{item.message}</Text>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.ctaBtn}
            activeOpacity={0.8}
            onPress={onPress}
          >
            <Text style={styles.ctaText}>{item.ctaLabel}</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.saveBtn}
            activeOpacity={0.7}
            onPress={() => setSaved((s) => !s)}
          >
            <MaterialCommunityIcons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={saved ? '#111' : '#AAAAAA'}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
  },

  imageWrap: {
    width: '100%',
    height: 160,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(84, 4, 93, 0.4)',
  },

  badge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },

  timeChip: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(84, 4, 93, 0.4)',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
  },

  body: {
    padding: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111111',
    lineHeight: 21,
    marginBottom: 5,
  },
  message: {
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 14,
  },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ctaBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingVertical: 11,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  saveBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: '#E5E5EA',
    backgroundColor: '#F9F9FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});