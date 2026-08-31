import React, { useMemo, useState, useContext, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { ThemeContext } from '../context/ThemeContext';
import { Colors } from '../theme';
import TagGallerySection from '../components/portfolio/TagGallerySection';

export default function PortfolioGalleryScreen({ navigation, route }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { portfolioImages, getAllTags, getImagesByTag, loadPortfolio, loading } = usePortfolio();
  const [searchTag, setSearchTag] = useState('');
  const [selectedTag, setSelectedTag] = useState(route?.params?.category || 'All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route?.params?.category) {
      setSelectedTag(route.params.category);
    }
  }, [route?.params?.category]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  const allTags = getAllTags();

  // Track which tags are new (added in last 24h)
  const newTags = useMemo(() => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentImages = portfolioImages.filter(
      (img) => new Date(img.uploadedAt) > yesterday
    );
    const recentTagSet = new Set();
    recentImages.forEach((img) => {
      if (Array.isArray(img.tags)) img.tags.forEach((t) => recentTagSet.add(t));
    });
    const oldTags = new Set();
    portfolioImages
      .filter((img) => new Date(img.uploadedAt) <= yesterday)
      .forEach((img) => {
        if (Array.isArray(img.tags)) img.tags.forEach((t) => oldTags.add(t));
      });
    return new Set([...recentTagSet].filter((t) => !oldTags.has(t)));
  }, [portfolioImages]);

  const filteredTags = useMemo(() => {
    if (selectedTag !== 'All') return [selectedTag];
    return allTags.filter((tag) =>
      tag.toLowerCase().includes(searchTag.toLowerCase())
    );
  }, [allTags, searchTag, selectedTag]);

  const C = isDark
    ? {
        bg: '#0f0f0f',
        card: '#1c1c1e',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#2c2c2e',
        chipBg: '#2a2a2a',
        chipBorder: '#3a3a3c',
        divider: '#2c2c2e',
      }
    : {
        bg: '#F8FAFC',
        card: '#FFFFFF',
        text: '#111111',
        textSub: '#6B7280',
        border: '#E2E8F0',
        chipBg: '#FFFFFF',
        chipBorder: '#E2E8F0',
        divider: '#E2E8F0',
      };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={styles.headerLeft}>
          {navigation?.canGoBack() && (
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={24} color={C.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.headerTitle, { color: C.text }]}>Portfolio Gallery</Text>
            <Text style={[styles.headerSub, { color: C.textSub }]}>
              {portfolioImages.length} images · {allTags.length} categories & tags
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <MaterialIcons name="label" size={13} color="#FFFFFF" />
            <Text style={styles.countText}>{allTags.length}</Text>
          </View>
        </View>
      </View>

      {portfolioImages.length === 0 ? (
        // Empty State
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
        >
          <MaterialIcons name="photo-library" size={64} color={isDark ? '#334155' : '#CBD5E1'} />
          <Text style={[styles.emptyTitle, { color: C.text }]}>No Saved Portfolio Items</Text>
          <Text style={[styles.emptySubtitle, { color: C.textSub }]}>
            Upload work photos from your Profile screen.{'\n'}
            AI ML Engine will classify, tag, and save them automatically.
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
          }
        >
          {/* Stats Row */}
          <View style={[styles.statsRow, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: C.text }]}>{portfolioImages.length}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Saved Photos</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#6366F1' }]}>{allTags.length}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Tags & Categories</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>{newTags.size}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Recent</Text>
            </View>
          </View>

          {/* Tag Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {['All', ...allTags].map((tag) => {
              const isSelected = selectedTag === tag;
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => setSelectedTag(tag)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: C.chipBg, borderColor: C.chipBorder },
                    isSelected && styles.filterChipSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  {newTags.has(tag) && <View style={styles.newDot} />}
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: C.text },
                      isSelected && styles.filterChipTextSelected,
                    ]}
                  >
                    {tag}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Gallery Sections */}
          <View style={styles.sectionsWrap}>
            {filteredTags.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={[styles.noResultsText, { color: C.textSub }]}>No tags or photos found</Text>
              </View>
            ) : (
              filteredTags.map((tag) => (
                <TagGallerySection
                  key={tag}
                  tag={tag}
                  images={getImagesByTag(tag)}
                  isNew={newTags.has(tag)}
                />
              ))
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    borderBottomWidth: 0.5,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: 8 },
  countBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#6366F1', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  countText: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, borderRadius: 14, borderWidth: 0.5,
    marginHorizontal: 14, marginTop: 14, marginBottom: 4,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 26 },

  // Filter
  filterRow: { paddingHorizontal: 14, gap: 8, paddingVertical: 12 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipSelected: {
    backgroundColor: '#6366F1', borderColor: '#6366F1',
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  newDot: {
    width: 6, height: 6, borderRadius: 3, backgroundColor: '#16A34A',
  },

  // Gallery
  scrollContent: { paddingBottom: 20 },
  sectionsWrap: { paddingHorizontal: 14 },
  noResults: { alignItems: 'center', paddingVertical: 32 },
  noResultsText: { fontSize: 14 },

  // Empty
  emptyContainer: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});