import React, { useState, useContext } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import { ThemeContext } from '../../context/ThemeContext';
import ImageDetailModal from './ImageDetailModal';

export default function TagGallerySection({ tag, images, isNew }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [selectedImage, setSelectedImage] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const C = isDark
    ? { text: '#F2F2F7', textSub: '#8E8E93', border: '#303C33', chipBg: '#161C18' }
    : { text: '#111111', textSub: '#6B7280', border: '#D8E8DC', chipBg: '#F1F5F9' };

  return (
    <View style={styles.section}>

      {/* Section Header */}
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setCollapsed(!collapsed)}
        activeOpacity={0.7}
      >
        <View style={styles.sectionLeft}>
          <View style={styles.tagDot} />
          <Text style={[styles.tagTitle, { color: C.text }]}>{tag}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
          <Text style={[styles.imageCount, { color: C.textSub, backgroundColor: C.chipBg }]}>{images.length}</Text>
        </View>
        <MaterialIcons
          name={collapsed ? 'expand-more' : 'expand-less'}
          size={22}
          color={C.textSub}
        />
      </TouchableOpacity>

      {/* Images Grid */}
      {!collapsed && (
        <View style={styles.grid}>
          {images.map((img) => (
            <TouchableOpacity
              key={img.id}
              style={[styles.imageWrapper, { backgroundColor: isDark ? '#162C49' : '#D8E8DC' }]}
              onPress={() => setSelectedImage(img)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: img.uri }} style={styles.image} resizeMode="cover" />
              {/* AI Analysis status badge */}
              <View
                style={[
                  styles.confBadge,
                  {
                    backgroundColor:
                      img.ai_analyzed || img.isAiAnalyzed
                        ? 'rgba(21, 128, 61, 0.92)'
                        : 'rgba(30, 41, 59, 0.88)',
                  },
                ]}
              >
                <MaterialIcons
                  name={img.ai_analyzed || img.isAiAnalyzed ? 'auto-awesome' : 'photo-camera'}
                  size={9}
                  color="#FFFFFF"
                />
                <Text style={styles.confBadgeText}>
                  {img.ai_analyzed || img.isAiAnalyzed
                    ? img.confidence > 0
                      ? `${Math.round(img.confidence)}%`
                      : 'AI'
                    : 'Direct'}
                </Text>
              </View>
              {/* Tag count badge */}
              <View style={styles.tagCountBadge}>
                <MaterialIcons name="local-offer" size={10} color="#FFFFFF" />
                <Text style={styles.tagCountText}>{Array.isArray(img.tags) ? img.tags.length : 0}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Image Detail Modal */}
      {selectedImage && (
        <ImageDetailModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: 12 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 4,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#15803D',
  },
  tagTitle: { fontSize: 15, fontWeight: '700' },
  newBadge: {
    backgroundColor: '#DBEAFE', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  newText: { fontSize: 10, color: '#15803D', fontWeight: '800' },
  imageCount: {
    fontSize: 12, fontWeight: '600',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
  },
  imageWrapper: {
    width: '31.8%', aspectRatio: 1,
    borderRadius: 10, overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  tagCountBadge: {
    position: 'absolute', bottom: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.65)',
    borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2,
  },
  tagCountText: { fontSize: 10, color: '#FFFFFF', fontWeight: '700' },
  confBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(22,163,74,0.85)',
    borderRadius: 6, paddingHorizontal: 4, paddingVertical: 1,
  },
  confBadgeText: { fontSize: 9, color: '#FFFFFF', fontWeight: '800' },
});
