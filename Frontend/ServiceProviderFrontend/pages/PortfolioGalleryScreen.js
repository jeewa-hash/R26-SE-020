import React, { useMemo, useState, useContext, useEffect } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  StatusBar,
  Image,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { usePortfolio } from '../context/PortfolioContext';
import { ThemeContext } from '../context/ThemeContext';
import { Colors } from '../theme';
import TagGallerySection from '../components/portfolio/TagGallerySection';
import { CONFIG } from '../config';

const resolveUrl = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file://')) return raw;
  if (raw.startsWith('/uploads/')) return `${CONFIG.ML_SERVICE_URL}${raw}`;
  return raw;
};

export default function PortfolioGalleryScreen({ navigation, route }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { portfolioImages, portfolioCategories, loadPortfolio, loading } = usePortfolio();
  const [selectedService, setSelectedService] = useState(route?.params?.category || 'All');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (route?.params?.category) {
      setSelectedService(route.params.category);
    }
  }, [route?.params?.category]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPortfolio();
    setRefreshing(false);
  };

  // Build service list from portfolioCategories or fall back to image labels
  const serviceList = useMemo(() => {
    if (portfolioCategories && portfolioCategories.length > 0) {
      const grouped = {};
      portfolioCategories.forEach((c) => {
        const key = c.label || c.category_group;
        if (!grouped[key]) {
          grouped[key] = {
            name: key,
            count: c.image_count || 1,
            coverImage: resolveUrl(c.latest_image),
          };
        } else {
          grouped[key].count += c.image_count || 1;
          if (!grouped[key].coverImage && c.latest_image) {
            grouped[key].coverImage = resolveUrl(c.latest_image);
          }
        }
      });
      return Object.values(grouped);
    }
    const groupMap = {};
    portfolioImages.forEach((img) => {
      const key = img.label || img.category || 'General';
      if (!groupMap[key]) groupMap[key] = { name: key, count: 0, coverImage: resolveUrl(img.uri) };
      groupMap[key].count += 1;
    });
    return Object.values(groupMap);
  }, [portfolioCategories, portfolioImages]);

  // Filter images by selected service
  const filteredImages = useMemo(() => {
    if (selectedService === 'All') return portfolioImages;
    return portfolioImages.filter(
      (img) => (img.label || img.category || 'General') === selectedService
    );
  }, [portfolioImages, selectedService]);

  // Group each image once by service/category, not once for every tag.
  const serviceGroups = useMemo(() => {
    const serviceMap = {};
    filteredImages.forEach((img) => {
      const service = img.label || img.category || 'General';
      if (!serviceMap[service]) serviceMap[service] = [];
      serviceMap[service].push(img);
    });
    return serviceMap;
  }, [filteredImages]);

  const serviceKeys = Object.keys(serviceGroups);

  const C = isDark
    ? {
        bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7',
        textSub: '#8E8E93', border: '#2c2c2e',
        chipBg: '#2a2a2a', chipBorder: '#3a3a3c', divider: '#2c2c2e',
      }
    : {
        bg: '#F8FAFC', card: '#FFFFFF', text: '#111111',
        textSub: '#6B7280', border: '#E2E8F0',
        chipBg: '#FFFFFF', chipBorder: '#E2E8F0', divider: '#E2E8F0',
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
              {portfolioImages.length} images · {serviceList.length} services
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.countBadge}>
            <MaterialIcons name="work-outline" size={13} color="#FFFFFF" />
            <Text style={styles.countText}>{serviceList.length}</Text>
          </View>
        </View>
      </View>

      {portfolioImages.length === 0 ? (
        // Empty State
        <ScrollView
          contentContainerStyle={styles.emptyContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7C3AED" />
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
              <Text style={[styles.statValue, { color: '#7C3AED' }]}>{serviceList.length}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Services</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: C.divider }]} />
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: '#16A34A' }]}>{filteredImages.length}</Text>
              <Text style={[styles.statLabel, { color: C.textSub }]}>Showing</Text>
            </View>
          </View>

          {/* Service Filter Pills (horizontal) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {/* "All" pill */}
            <TouchableOpacity
              onPress={() => setSelectedService('All')}
              style={[
                styles.filterChip,
                { backgroundColor: C.chipBg, borderColor: C.chipBorder },
                selectedService === 'All' && styles.filterChipSelected,
              ]}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterChipText, { color: C.text },
                selectedService === 'All' && styles.filterChipTextSelected,
              ]}>
                All
              </Text>
            </TouchableOpacity>

            {serviceList.map((svc) => {
              const isSelected = selectedService === svc.name;
              return (
                <TouchableOpacity
                  key={svc.name}
                  onPress={() => setSelectedService(svc.name)}
                  style={[
                    styles.filterChip,
                    { backgroundColor: C.chipBg, borderColor: C.chipBorder },
                    isSelected && styles.filterChipSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  {/* Mini cover thumbnail inside pill */}
                  {svc.coverImage && (
                    <Image
                      source={{ uri: svc.coverImage }}
                      style={styles.pillThumb}
                    />
                  )}
                  <Text style={[
                    styles.filterChipText, { color: C.text },
                    isSelected && styles.filterChipTextSelected,
                  ]}>
                    {svc.name}
                  </Text>
                  <Text style={[
                    styles.filterChipCount,
                    { color: isSelected ? 'rgba(255,255,255,0.8)' : C.textSub },
                  ]}>
                    {svc.count}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Gallery Sections — one section per service */}
          <View style={styles.sectionsWrap}>
            {serviceKeys.length === 0 ? (
              <View style={styles.noResults}>
                <MaterialIcons name="image-not-supported" size={36} color={isDark ? '#334155' : '#CBD5E1'} />
                <Text style={[styles.noResultsText, { color: C.textSub }]}>
                  No images in this service yet
                </Text>
              </View>
            ) : (
              serviceKeys.map((service) => (
                <TagGallerySection
                  key={service}
                  tag={service}
                  images={serviceGroups[service]}
                  isNew={false}
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
    backgroundColor: '#7C3AED', borderRadius: 12,
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
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1,
  },
  filterChipSelected: { backgroundColor: '#7C3AED', borderColor: '#7C3AED' },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  filterChipTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  filterChipCount: { fontSize: 11, fontWeight: '700' },
  pillThumb: { width: 16, height: 16, borderRadius: 4 },

  // Gallery
  scrollContent: { paddingBottom: 20 },
  sectionsWrap: { paddingHorizontal: 14 },
  noResults: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  noResultsText: { fontSize: 14 },

  // Empty
  emptyContainer: {
    flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', marginTop: 16, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
