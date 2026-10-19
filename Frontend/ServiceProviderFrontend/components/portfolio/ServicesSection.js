import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../../config';
import { ThemeContext } from '../../context/ThemeContext';

const CATEGORY_META = {
  plumbing:   { icon: 'plumbing',            color: '#15803D' },
  electrical: { icon: 'electrical-services', color: '#F59E0B' },
  carpentry:  { icon: 'handyman',            color: '#166534' },
  cleaning:   { icon: 'cleaning-services',   color: '#059669' },
  painting:   { icon: 'format-paint',        color: '#DC2626' },
  roofing:    { icon: 'home-repair-service', color: '#0284C7' },
  gardening:  { icon: 'yard',                color: '#16A34A' },
  planting:   { icon: 'local-florist',       color: '#15803D' },
  repairing:  { icon: 'build',               color: '#D97706' },
};
const DEFAULT_META = { icon: 'build', color: '#6B7280' };

const CATEGORY_DEFAULT_COVERS = {
  plumbing:   'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=800&auto=format&fit=crop&q=80',
  electrical: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=80',
  carpentry:  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80',
  cleaning:   'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=80',
  painting:   'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=800&auto=format&fit=crop&q=80',
  roofing:    'https://images.unsplash.com/photo-1632759145351-1d592919f522?w=800&auto=format&fit=crop&q=80',
  gardening:  'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=800&auto=format&fit=crop&q=80',
  planting:   'https://images.unsplash.com/photo-1592417817098-8f3d6910985c?w=800&auto=format&fit=crop&q=80',
  repairing:  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
  other:      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=80',
};

const getMeta = (key) => CATEGORY_META[(key || '').toLowerCase()] || DEFAULT_META;

const getDefaultCover = (key) => {
  const k = (key || '').toLowerCase();
  for (const cat of Object.keys(CATEGORY_DEFAULT_COVERS)) {
    if (k.includes(cat)) return CATEGORY_DEFAULT_COVERS[cat];
  }
  return CATEGORY_DEFAULT_COVERS.other;
};

const PRICE_UNIT_LABEL = {
  hour: '/hr',
  day: '/day',
  job: '/job',
  sqft: '/sqft',
  item: '/item',
};

const INITIAL_SERVICE_LIMIT = 4;

const resolveUrl = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file://') || raw.startsWith('data:')) {
    return raw;
  }
  if (raw.startsWith('/uploads/')) return `${CONFIG.ML_SERVICE_URL}${raw}`;
  return raw;
};

export default function ServicesSection({ navigation, C, initialCategory }) {
  const { t } = useTranslation();
  const { isDark } = useContext(ThemeContext) || {};
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllServices, setShowAllServices] = useState(false);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      // 1. Fetch provider's created services from Provider Service backend
      let providerServices = [];
      if (token) {
        try {
          const res = await fetch(`${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/provider`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && Array.isArray(data.data)) {
              providerServices = data.data;
            }
          }
        } catch (err) {
          console.log('Error fetching provider services:', err);
        }
      }

      // 2. Fetch portfolio categories from ML Engine
      let portfolioMap = {};
      if (token) {
        try {
          const catRes = await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/categories`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });
          if (catRes.ok) {
            const catData = await catRes.json();
            const rawCats = Array.isArray(catData) ? catData : catData?.categories || [];
            rawCats.forEach((c) => {
              const key = (c.service_key || c.label || '').toLowerCase();
              portfolioMap[key] = {
                title: c.label || c.service_key,
                count: c.image_count || 1,
                coverImage: resolveUrl(c.latest_image),
              };
            });
          }
        } catch (e) {
          console.log('Portfolio categories fetch error:', e);
        }
      }

      // Merge and construct services list
      const combined = [];
      const seenTitles = new Set();

      if (providerServices.length > 0) {
        providerServices.forEach((svc) => {
          const key = (svc.categoryGroup || svc.category || svc.name || '').toLowerCase();
          const port = portfolioMap[key] || {};
          const directCover = Array.isArray(svc.images) && svc.images.length > 0 ? resolveUrl(svc.images[0]) : null;
          const fallbackCover = getDefaultCover(svc.category || svc.name);

          seenTitles.add((svc.name || '').toLowerCase());
          combined.push({
            ...svc,
            id: svc._id,
            title: svc.name,
            name: svc.name,
            description: svc.description || '',
            basePrice: svc.basePrice || 0,
            priceUnit: svc.priceUnit || 'job',
            coverImage: directCover || port.coverImage || fallbackCover,
            photoCount: (svc.images?.length || 0) + (port.count || 0),
          });
        });
      }

      // Add any portfolio categories not yet created as explicit services
      Object.keys(portfolioMap).forEach((key) => {
        const item = portfolioMap[key];
        const title = item.title || key.replace(/_/g, ' ');
        if (!seenTitles.has(title.toLowerCase())) {
          seenTitles.add(title.toLowerCase());
          combined.push({
            id: `portfolio-${key}`,
            title,
            name: title,
            category: key,
            categoryGroup: key,
            description: '',
            basePrice: 0,
            priceUnit: 'job',
            coverImage: item.coverImage || getDefaultCover(key),
            photoCount: item.count || 0,
            isFromPortfolio: true,
          });
        }
      });

      // If initialCategory is provided from profile and not already in list, add it
      if (initialCategory && !seenTitles.has(initialCategory.toLowerCase())) {
        combined.unshift({
          id: `initial-${initialCategory}`,
          title: initialCategory,
          name: initialCategory,
          category: initialCategory,
          description: '',
          basePrice: 0,
          priceUnit: 'job',
          coverImage: getDefaultCover(initialCategory),
          photoCount: 0,
          isPrimary: true,
        });
      }

      setServices(combined);
    } catch (err) {
      console.log('Services fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [initialCategory]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchServices();
    });
    return unsubscribe;
  }, [navigation, fetchServices]);

  // CRITICAL: Always navigate to ServiceDetail screen with full service data
  const handleServicePress = (serviceItem) => {
    navigation.navigate('ServiceDetail', {
      serviceId: serviceItem._id || serviceItem.id,
      service: serviceItem,
      serviceName: serviceItem.name || serviceItem.title,
      category: serviceItem.category || serviceItem.title,
      coverImage: serviceItem.coverImage,
    });
  };

  const handleAddService = () => {
    navigation.navigate('ServiceForm');
  };

  const displayedServices = showAllServices
    ? services
    : services.slice(0, INITIAL_SERVICE_LIMIT);

  const accent = isDark ? '#86C99A' : '#15803D';
  const remainingServicesCount = Math.max(0, services.length - INITIAL_SERVICE_LIMIT);

  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleWrap}>
          <Text style={[styles.sectionTitle, { color: C.text }]}>{t('myServices', 'My Services')}</Text>
          {services.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('ServicesList')}>
              <Text style={[styles.viewAllText, { color: accent }]}>{t('viewAll', 'View All')} ({services.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.addImageBtn, { backgroundColor: isDark ? '#86C99A' : '#15803D' }]}
          onPress={handleAddService}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={17} color={isDark ? '#0C0F0D' : '#FFFFFF'} />
          <Text style={[styles.addImageBtnText, { color: isDark ? '#0C0F0D' : '#FFFFFF' }]}>{t('addService', 'Add Service')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.servicesRow}>
        {displayedServices.map((svc) => {
          const meta = svc.meta || getMeta(svc.categoryGroup || svc.category);
          const hasDesc = !!svc.description?.trim();
          const hasPrice = svc.basePrice !== undefined && svc.basePrice > 0;

          return (
            <TouchableOpacity
              key={svc.id || svc._id}
              style={[styles.serviceRow, { backgroundColor: C.subCard, borderColor: C.border }]}
              onPress={() => handleServicePress(svc)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`View ${svc.title || svc.name} details`}
            >
              {/* Cover Image or Themed Icon */}
              <View style={[styles.serviceIcon, { backgroundColor: meta.color + '18' }]}>
                {svc.coverImage ? (
                  <Image source={{ uri: svc.coverImage }} style={styles.coverImage} resizeMode="cover" />
                ) : (
                  <MaterialIcons name={meta.icon} size={26} color={meta.color || accent} />
                )}
              </View>

              {/* Service Details */}
              <View style={styles.serviceDetails}>
                <View style={styles.serviceTitleRow}>
                  <Text style={[styles.serviceTitle, { color: C.text }]} numberOfLines={1}>
                    {svc.title || svc.name}
                  </Text>
                  {svc.isPrimary && (
                    <View style={[styles.primaryBadge, { backgroundColor: accent + '18' }]}>
                      <MaterialIcons name="star" size={12} color={accent} />
                    </View>
                  )}
                  {svc.isActive !== undefined && !svc.isPrimary && (
                    <View
                      style={[
                        styles.activeDot,
                        { backgroundColor: svc.isActive ? '#15803D' : '#9CA3AF' },
                      ]}
                    />
                  )}
                </View>

                {/* Description snippet or prompt */}
                <Text style={[styles.serviceDesc, { color: hasDesc ? C.textSub : accent }]} numberOfLines={1}>
                  {hasDesc ? svc.description : '✨ Tap to view & auto-generate with AI'}
                </Text>

                {/* Price and photo count row */}
                <View style={styles.priceRow}>
                  {hasPrice ? (
                    <Text style={[styles.priceTag, { color: meta.color || accent }]}>
                      Rs. {svc.basePrice?.toLocaleString()}
                      <Text style={[styles.priceUnit, { color: C.textSub }]}>
                        {PRICE_UNIT_LABEL[svc.priceUnit] || `/${svc.priceUnit || 'job'}`}
                      </Text>
                    </Text>
                  ) : (
                    <Text style={[styles.priceUnit, { color: C.textSub, fontStyle: 'italic' }]}>
                      Rates negotiable
                    </Text>
                  )}

                  {svc.photoCount > 0 ? (
                    <Text style={[styles.photoCountText, { color: C.textSub }]}>
                      📷 {svc.photoCount} photo{svc.photoCount === 1 ? '' : 's'}
                    </Text>
                  ) : null}
                </View>
              </View>

              <MaterialIcons name="chevron-right" size={22} color={C.textSub} />
            </TouchableOpacity>
          );
        })}
      </View>

      {/* See More / Show Less Button */}
      {services.length > INITIAL_SERVICE_LIMIT && (
        <TouchableOpacity
          style={[styles.seeMoreBtn, { borderColor: C.border, backgroundColor: C.subCard }]}
          onPress={() => setShowAllServices(!showAllServices)}
          activeOpacity={0.7}
        >
          <Text style={styles.seeMoreText}>
            {showAllServices ? 'Show Less Services' : `See More Services (+${remainingServicesCount} more)`}
          </Text>
          <MaterialIcons
            name={showAllServices ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={16}
            color="#15803D"
          />
        </TouchableOpacity>
      )}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={accent} />
          <Text style={[styles.loadingText, { color: C.textSub }]}>Loading services…</Text>
        </View>
      )}

      {!loading && services.length === 0 && (
        <View style={styles.emptyWrap}>
          <Text style={[styles.emptyText, { color: C.textSub }]}>No services created yet</Text>
          <TouchableOpacity style={[styles.createPromptBtn, { borderColor: accent }]} onPress={handleAddService}>
            <Text style={[styles.createPromptText, { color: accent }]}>Create your first service</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  titleWrap:     { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },
  viewAllText:   { fontSize: 12, fontWeight: '600' },

  addImageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingHorizontal: 12, minHeight: 36, borderRadius: 10,
  },
  addImageBtnText: { fontSize: 12, fontWeight: '700' },
  servicesRow: { gap: 10 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 10, borderRadius: 14, borderWidth: 0.5,
  },
  serviceIcon: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  coverImage: { width: 56, height: 56 },
  serviceDetails: { flex: 1, minWidth: 0 },
  serviceTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  serviceTitle: { fontSize: 14, fontWeight: '700', flex: 1 },
  primaryBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  serviceDesc: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  priceTag: { fontSize: 13, fontWeight: '700' },
  priceUnit: { fontSize: 11, fontWeight: '400' },
  photoCountText: { fontSize: 11 },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  seeMoreText: { fontSize: 12, fontWeight: '600', color: '#15803D' },
  loadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  loadingText:  { fontSize: 11, fontStyle: 'italic' },
  emptyWrap: { alignItems: 'center', paddingVertical: 12, gap: 6 },
  emptyText:    { fontSize: 12 },
  createPromptBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  createPromptText: { fontSize: 12, fontWeight: '600' },
});
