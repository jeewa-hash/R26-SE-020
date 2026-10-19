import { resolvePortfolioImage } from '../../utils/portfolioMedia';
import { getStoredProviderAuth } from '../../pages/IT22129376/services/providerAuthStorage';
import { fetchProviderWithTimeout } from '../../utils/providerHttp';
// components/portfolio/ServicesSection.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
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
  repairing:  { icon: 'build',               color: '#D97706' },
};
const DEFAULT_META = { icon: 'build', color: '#6B7280' };

const getMeta = (key) => CATEGORY_META[(key || '').toLowerCase()] || DEFAULT_META;

const INITIAL_SERVICE_LIMIT = 4;

// Resolve image URL the same way PortfolioContext does
const resolveUrl = raw => resolvePortfolioImage(raw, CONFIG.ML_SERVICE_URL);

export default function ServicesSection({ navigation, C, initialCategory }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [addedServices, setAddedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [showAllServices, setShowAllServices] = useState(false);

  const fetchAddedServices = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const { token } = await getStoredProviderAuth();
      if (!token) { setAddedServices([]); setLoadError('Sign in to load your portfolio services.'); return; }

      const res = await fetchProviderWithTimeout(`${CONFIG.ML_SERVICE_URL}/portfolio/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(res.status === 401 ? 'Your session could not be verified. Sign in again to load your services.' : 'Unable to load portfolio services. Please retry.');
      const data = await res.json();

      const raw = Array.isArray(data) ? data : data?.categories || [];
      const grouped = {};
      raw.forEach((item) => {
        const key = item.service_key || item.label;
        if (!grouped[key]) {
          grouped[key] = {
            id: key,
            title: item.label,
            categoryGroup: item.category_group,
            count: item.image_count || 1,
            coverImage: resolveUrl(item.latest_image),
          };
        } else {
          grouped[key].count += (item.image_count || 1);
          if (!grouped[key].coverImage && item.latest_image) {
            grouped[key].coverImage = resolveUrl(item.latest_image);
          }
        }
      });

      setAddedServices(Object.values(grouped));
    } catch (err) {
      setLoadError(err.message || 'Unable to load your services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddedServices();
  }, [fetchAddedServices]);

  const handleCategoryPress = (categoryLabel) => {
    navigation.navigate('ServiceForm', {
      ...(typeof categoryLabel === 'string' ? { category: categoryLabel } : {}),
    });
  };

  const displayedServices = showAllServices
    ? addedServices
    : addedServices.slice(0, INITIAL_SERVICE_LIMIT);

  const accent = isDark ? '#86C99A' : '#15803D';
  const remainingServicesCount = Math.max(0, addedServices.length - INITIAL_SERVICE_LIMIT);

  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>My Services</Text>
        <TouchableOpacity
          style={[styles.addImageBtn, { backgroundColor: isDark ? '#86C99A' : '#15803D' }]}
          onPress={() => handleCategoryPress()}
          activeOpacity={0.8}
        >
          <MaterialIcons name="add" size={17} color={isDark ? '#0C0F0D' : '#FFFFFF'} />
          <Text style={[styles.addImageBtnText, { color: isDark ? '#0C0F0D' : '#FFFFFF' }]}>Add Services</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.servicesRow}>
        {initialCategory && (
          <View style={[styles.serviceRow, { backgroundColor: C.subCard, borderColor: C.border }]}>
            <View style={[styles.serviceIcon, { backgroundColor: accent + '18' }]}>
              <MaterialIcons name={getMeta(initialCategory).icon} size={24} color={accent} />
            </View>
            <View style={styles.serviceDetails}>
              <Text style={[styles.serviceTitle, { color: C.text }]}>{initialCategory}</Text>
              <Text style={[styles.serviceSubtitle, { color: C.textSub }]}>Primary service</Text>
            </View>
            <View style={[styles.primaryBadge, { backgroundColor: accent + '18' }]}>
              <MaterialIcons name="star" size={14} color={accent} />
            </View>
          </View>
        )}
        {displayedServices.map((svc) => (
          <TouchableOpacity
            key={svc.id}
            style={[styles.serviceRow, { backgroundColor: C.subCard, borderColor: C.border }]}
            onPress={() => handleCategoryPress(svc.title)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`View ${svc.title}`}
          >
            <View style={[styles.serviceIcon, { backgroundColor: accent + '18' }]}>
              {svc.coverImage ? (
                <Image source={{ uri: svc.coverImage }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <MaterialIcons name={getMeta(svc.categoryGroup).icon} size={24} color={accent} />
              )}
            </View>
            <View style={styles.serviceDetails}>
              <Text style={[styles.serviceTitle, { color: C.text }]}>{svc.title}</Text>
              <Text style={[styles.serviceSubtitle, { color: C.textSub }]}>
                {svc.count} portfolio photo{svc.count === 1 ? '' : 's'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color={C.textSub} />
          </TouchableOpacity>
        ))}
      </View>

      {/* See More / Show Less Button */}
      {addedServices.length > INITIAL_SERVICE_LIMIT && (
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

      {loadError && <View><Text accessibilityRole="alert" style={[styles.emptyText, { color: C.textSub }]}>{loadError}</Text><TouchableOpacity accessibilityRole="button" onPress={fetchAddedServices} style={{ paddingVertical: 12 }}><Text style={{ color: accent, fontWeight: '600' }}>Retry</Text></TouchableOpacity></View>}
      {loading && <Text style={[styles.loadingText, { color: C.textSub }]}>Loading services…</Text>}
      {!loading && !loadError && !initialCategory && addedServices.length === 0 && (
        <Text style={[styles.emptyText, { color: C.textSub }]}>No services yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },

  addImageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingHorizontal: 12, minHeight: 36, borderRadius: 10,
  },
  addImageBtnText: { fontSize: 12, fontWeight: '700' },
  servicesRow: { gap: 8 },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, borderRadius: 12, borderWidth: 0.5,
  },
  serviceIcon: {
    width: 44, height: 44, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  serviceDetails: { flex: 1, minWidth: 0 },
  serviceTitle: { fontSize: 14, fontWeight: '700' },
  serviceSubtitle: { fontSize: 11, marginTop: 3 },
  primaryBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  coverImage: { width: 44, height: 44 },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  seeMoreText: { fontSize: 12, fontWeight: '600', color: '#15803D' },
  loadingText:  { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  emptyText:    { fontSize: 12 },
});
