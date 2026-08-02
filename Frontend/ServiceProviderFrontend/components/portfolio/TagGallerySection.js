import React, { useState } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '../../theme';
import ImageDetailModal from './ImageDetailModal';

export default function TagGallerySection({ tag, images, isNew }) {
  const [selectedImage, setSelectedImage] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <View style={styles.section}>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={styles.tagDot} />
          <Text style={styles.tagTitle}>{tag}</Text>
          {isNew && (
            <View style={styles.newBadge}>
              <Text style={styles.newText}>NEW</Text>
            </View>
          )}
          <Text style={styles.imageCount}>{images.length > 5 ? `${images.length}+` : `${images.length}`}</Text>
        </View>

        <View style={styles.headerRightRow}>
          {typeof onAdd === 'function' && (
            <TouchableOpacity style={styles.smallAddBtn} onPress={() => onAdd(tag)}>
              <MaterialIcons name="add" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setCollapsed(!collapsed)}>
            <MaterialIcons
              name={collapsed ? 'expand-more' : 'expand-less'}
              size={22}
              color={Colors.textLight}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Images Grid */}
      {!collapsed && (
        <View style={styles.grid}>
          {images.map((img) => (
            <TouchableOpacity
              key={img.id}
              style={styles.imageWrapper}
              onPress={() => setSelectedImage(img)}
            >
              <Image source={{ uri: img.uri }} style={styles.image} />
              {/* Tag count badge */}
              <View style={styles.tagCountBadge}>
                <MaterialIcons name="label" size={10} color={Colors.white} />
                <Text style={styles.tagCountText}>{img.tags.length}</Text>
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
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 4,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  tagTitle: { fontSize: 15, fontWeight: '700', color: Colors.text },
  newBadge: {
    backgroundColor: '#DBEAFE', borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  newText: { fontSize: 10, color: Colors.primary, fontWeight: '800' },
  imageCount: {
    fontSize: 13, color: Colors.textLight,
    backgroundColor: '#F1F5F9',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
  },
  headerRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  smallAddBtn: { marginRight: 6, width: 34, height: 34, borderRadius: 17, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  grid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 3,
  },
  imageWrapper: {
    width: '32.5%', aspectRatio: 1,
    borderRadius: 8, overflow: 'hidden',
    position: 'relative',
  },
  image: { width: '100%', height: '100%' },
  tagCountBadge: {
    position: 'absolute', bottom: 6, right: 6,
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3,
  },
  tagCountText: { fontSize: 10, color: Colors.white, fontWeight: '700' },
});