import React, { useState, useMemo, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Text, Searchbar } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Colors } from '../theme';
import { POSTS, CATEGORIES } from '../constants/feedData';
import AnnouncementSlideshow from '../components/feed/AnnouncementSlideshow';
import MidAnnouncementCard from '../components/feed/MidAnnouncementCard';
import { getSeekerPosts } from '../services/seekerApi';

export default function NewsFeedScreen({ navigation }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [posts, setPosts] = useState(POSTS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSeekerPosts();
  }, []);

  const loadSeekerPosts = async () => {
    setIsLoading(true);
    try {
      const data = await getSeekerPosts();
      const postList = Array.isArray(data) ? data : data?.posts || [];

      if (postList.length === 0) {
        return;
      }

      const mappedPosts = postList.map((item) => ({
        id: item._id || item.id,
        title: item.title || 'Service Request',
        description: item.description || '',
        category: item.category || 'General',
        urgency: item.urgency || 'medium',
        location: item.location || {},
        locationLabel: item.location?.address || item.location?.district || item.location?.city || 'Unknown',
        createdAt: item.createdAt,
        seekerId: item.seekerId,
        _id: item._id,
      }));

      setPosts(mappedPosts);
    } catch (error) {
      console.log('Failed to fetch seeker posts:', error.message || error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPosts = useMemo(() =>
    posts.filter((post) => {
      const matchCat = selectedCategory === 'All' || post.category === selectedCategory;
      const postText = `${post.title} ${post.description} ${post.category} ${post.location}`.toLowerCase();
      const matchSearch = postText.includes(search.toLowerCase());
      return matchCat && matchSearch;
    }),
    [search, selectedCategory, posts]
  );

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

  const handleRequestPress = (post) => {
    navigation.navigate('RequestService', { post });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('serviceRequests')}</Text>
        <TouchableOpacity style={styles.bellBtn}>
          <MaterialIcons name="notifications-none" size={24} color={Colors.text} />
          <View style={styles.bellDot} />
        </TouchableOpacity>
      </View>

      <Searchbar
        placeholder={t('searchPlaceholder')}
        value={search}
        onChangeText={setSearch}
        style={styles.searchBar}
        inputStyle={{ fontSize: 14 }}
      />

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

        {isLoading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        )}

        {feedItems.map((item, index) =>
          item.type === 'post' ? (
            <View key={item.data.id} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={styles.postMeta}>
                  <Text style={styles.postTitle}>{item.data.title}</Text>
                  <Text style={styles.postLocation}>{item.data.locationLabel || item.data.location}</Text>
                </View>
                {item.data.urgency === 'high' || item.data.urgency === 'urgent' ? (
                  <View style={styles.urgentBadge}>
                    <Text style={styles.urgentText}>{t('urgent')}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.postDescription}>{item.data.description}</Text>
              <View style={styles.postFooter}>
                <Text style={styles.categoryTag}>{item.data.category}</Text>
                <TouchableOpacity
                  onPress={() => handleRequestPress(item.data)}
                  style={styles.requestButton}
                >
                  <Text style={styles.requestButtonText}>{t('requestService')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <MidAnnouncementCard key={`mid_${index}`} />
          )
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

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
  loadingSection: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  postCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  postMeta: { flex: 1, marginRight: 12 },
  postTitle: { fontSize: 16, fontWeight: '800', color: Colors.text, marginBottom: 4 },
  postLocation: { fontSize: 13, color: Colors.textLight },
  postDescription: { fontSize: 14, color: Colors.text, lineHeight: 20, marginBottom: 14 },
  postFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryTag: { color: Colors.primary, fontWeight: '700', fontSize: 13 },
  requestButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  requestButtonText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  urgentBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  urgentText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
  },
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