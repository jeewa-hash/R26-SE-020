import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { Colors } from '../theme';
import TagGallerySection from '../components/portfolio/TagGallerySection';
import { usePortfolioUpload } from '../hooks/usePortfolioUpload';
import AIProcessingModal from '../components/portfolio/AIProcessingModal';
import PortfolioTagScreen from '../components/portfolio/PortfolioTagScreen';

export default function PortfolioGalleryScreen() {
  const { portfolioImages, getAllTags, getImagesByTag } = usePortfolio();
  const [searchTag, setSearchTag] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');

  const allTags = getAllTags();
  const {
    images,
    processing,
    progress,
    showTagScreen,
    initialTagHint,
    openGallery,
    cancelProcessing,
    resetAll,
  } = usePortfolioUpload();

  // Track which tags are new (added in last 24h)
  const newTags = useMemo(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentImages = portfolioImages.filter(
      (img) => new Date(img.uploadedAt) > yesterday
    );
    const recentTagSet = new Set();
    recentImages.forEach((img) => img.tags.forEach((t) => recentTagSet.add(t)));
    // Only mark as new if tag didn't exist before recent upload
    const oldTags = new Set();
    portfolioImages
      .filter((img) => new Date(img.uploadedAt) <= yesterday)
      .forEach((img) => img.tags.forEach((t) => oldTags.add(t)));
    return new Set([...recentTagSet].filter((t) => !oldTags.has(t)));
  }, [portfolioImages]);

  const filteredTags = useMemo(() => {
    if (selectedTag !== 'All') return [selectedTag];
    return allTags.filter((tag) =>
      tag.toLowerCase().includes(searchTag.toLowerCase())
    );
  }, [allTags, searchTag, selectedTag]);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>My Portfolio</Text>
          <Text style={styles.headerSub}>
            {portfolioImages.length} images · {allTags.length} categories
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <MaterialIcons name="label" size={14} color={Colors.white} />
            <Text style={styles.countText}>{allTags.length}</Text>
          </View>
        </View>
      </View>

      {portfolioImages.length === 0 ? (
        // Empty State
        <View style={styles.emptyContainer}>
          <MaterialIcons name="photo-library" size={64} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Portfolio Yet</Text>
          <Text style={styles.emptySubtitle}>
            Upload images from the Home screen.{'\n'}
            AI will automatically tag and organize them.
          </Text>
        </View>
      ) : (
        <>
          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{portfolioImages.length}</Text>
              <Text style={styles.statLabel}>Images</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{allTags.length}</Text>
              <Text style={styles.statLabel}>Tags</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{newTags.size}</Text>
              <Text style={styles.statLabel}>New Tags</Text>
            </View>
          </View>

          {/* Tag Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {['All', ...allTags].map((tag) => (
              <TouchableOpacity
                key={tag}
                onPress={() => setSelectedTag(tag)}
                style={[
                  styles.filterChip,
                  selectedTag === tag && styles.filterChipSelected,
                ]}
              >
                {newTags.has(tag) && (
                  <View style={styles.newDot} />
                )}
                <Text style={[
                  styles.filterChipText,
                  selectedTag === tag && styles.filterChipTextSelected,
                ]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Gallery Sections */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredTags.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No tags found</Text>
              </View>
            ) : (
              filteredTags.map((tag) => (
                <TagGallerySection
                  key={tag}
                  tag={tag}
                  images={getImagesByTag(tag)}
                  isNew={newTags.has(tag)}
                  onAdd={() => openGallery(tag)}
                />
              ))
            )}
            <View style={{ height: 90 }} />
          </ScrollView>
        </>
      )}

      <AIProcessingModal
        visible={processing}
        progress={progress}
        imageCount={images.length}
        onCancel={cancelProcessing}
      />
      {showTagScreen && images.length > 0 && (
        <PortfolioTagScreen images={images} onClose={resetAll} initialTagHint={initialTagHint} />
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 16,
    backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 5,
  },
  countText: { fontSize: 13, color: Colors.white, fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, padding: 16, marginBottom: 4,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: Colors.border },

  // Filter
  filterRow: { paddingHorizontal: 12, gap: 8, paddingVertical: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  filterChipSelected: {
    backgroundColor: Colors.primary, borderColor: Colors.primary,
  },
  filterChipText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  filterChipTextSelected: { color: Colors.white, fontWeight: '700' },
  newDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A',
  },

  // Gallery
  scrollContent: { padding: 12 },
  noResults: { alignItems: 'center', paddingVertical: 32 },
  noResultsText: { fontSize: 14, color: Colors.textLight },

  // Empty
  emptyContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', lineHeight: 22 },
});