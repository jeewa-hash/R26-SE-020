import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../theme';
import { POSTS, CATEGORIES } from '../constants/feedData';
import PostCard from '../components/feed/PostCard';
import AnnouncementSlideshow from '../components/feed/AnnouncementSlideshow';
import MidAnnouncementCard from '../components/feed/MidAnnouncementCard';

export default function NewsFeedScreen() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredPosts = useMemo(() =>
    POSTS.filter((post) => {
      const matchCat = selectedCategory === 'All' || post.category === selectedCategory;
      const matchSearch =
        post.description.toLowerCase().includes(search.toLowerCase()) ||
        post.category.toLowerCase().includes(search.toLowerCase()) ||
        post.location.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    }),
    [search, selectedCategory]
  );

  // Insert mid announcement after every 2 posts
  const feedItems = useMemo(() => {
    const items = [];
    filteredPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      if ((index + 1) % 2 === 0 && index !== filteredPosts.length - 1) {
        items.push({ type: 'mid' });
      }
    });
    return items;
  }, [filteredPosts]);

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('serviceRequests')}</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <MaterialIcons name="notifications-none" size={24} color={Colors.text} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <Searchbar
        placeholder={t('searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        inputStyle={{ fontSize: 14 }}
      />

      {/* Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[styles.chip, selectedCategory === cat && styles.chipSelected]}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextSelected]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.feedContent}
      >
        <AnnouncementSlideshow />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('recentOpportunities')}</Text>
          <View style={styles.newBadge}>
            <Text style={styles.newText}>{filteredPosts.length} {t('new')}</Text>
          </View>
        </View>

        {feedItems.map((item, index) =>
          item.type === 'post'
            ? <PostCard key={item.data.id} post={item.data} />
            : <MidAnnouncementCard key={`mid_${index}`} />
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab}>
        <MaterialIcons name="auto-awesome" size={24} color={Colors.white} />
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 10,
    backgroundColor: Colors.white,
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.text },
  bellBtn: { position: 'relative', padding: 4 },
  bellDot: {
    position: 'absolute', top: 4, right: 4,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: Colors.white,
  },
  searchBar: {
    margin: 12, marginTop: 8, borderRadius: 12,
    elevation: 0, backgroundColor: Colors.white,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipsRow: { paddingHorizontal: 12, gap: 8, paddingBottom: 10 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.white, borderWidth: 1, borderColor: '#E2E8F0',
  },
  chipSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.text, fontWeight: '500' },
  chipTextSelected: { color: Colors.white, fontWeight: '700' },
  feedContent: { padding: 16, gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  newBadge: { backgroundColor: '#DBEAFE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  newText: { fontSize: 12, color: Colors.primary, fontWeight: '700' },
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    elevation: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
});