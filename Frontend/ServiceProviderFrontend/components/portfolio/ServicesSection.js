// components/portfolio/ServicesSection.js
import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../../config';
import { ThemeContext } from '../../context/ThemeContext';

const CATEGORY_META = {
  plumbing:   { icon: 'plumbing',            color: '#2563EB' },
  electrical: { icon: 'electrical-services', color: '#F59E0B' },
  carpentry:  { icon: 'handyman',            color: '#7C3AED' },
  cleaning:   { icon: 'cleaning-services',   color: '#059669' },
  painting:   { icon: 'format-paint',        color: '#DC2626' },
  roofing:    { icon: 'home-repair-service', color: '#0891B2' },
  gardening:  { icon: 'yard',                color: '#16A34A' },
  repairing:  { icon: 'build',               color: '#D97706' },
};
const DEFAULT_META = { icon: 'build', color: '#6B7280' };

const getMeta = (key) => CATEGORY_META[(key || '').toLowerCase()] || DEFAULT_META;

const INITIAL_SERVICE_LIMIT = 4;

export default function ServicesSection({ navigation, C, initialCategory, onAddServicePress }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [addedServices, setAddedServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllServices, setShowAllServices] = useState(false);

  const fetchAddedServices = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${CONFIG.ML_SERVICE_URL}/portfolio/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
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
          };
        } else {
          grouped[key].count += (item.image_count || 1);
        }
      });

      setAddedServices(Object.values(grouped));
    } catch (err) {
      console.log('Portfolio categories fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAddedServices();
  }, [fetchAddedServices]);

  const handleAddService = () => {
    if (onAddServicePress) {
      onAddServicePress();
    } else {
      navigation.getParent()?.navigate('PortfolioGallery');
    }
  };

  const handleCategoryPress = (categoryLabel) => {
    navigation.getParent()?.navigate('PortfolioGallery', { category: categoryLabel });
  };

  const displayedServices = showAllServices
    ? addedServices
    : addedServices.slice(0, INITIAL_SERVICE_LIMIT);

  const remainingServicesCount = Math.max(0, addedServices.length - INITIAL_SERVICE_LIMIT);

  return (
    <View style={[styles.section, { backgroundColor: C.card, borderColor: C.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: C.text }]}>My Services</Text>
        <TouchableOpacity onPress={handleAddService}>
          <Text style={styles.seeAll}>+ Add Service</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.servicesRow}>
        {/* Primary category from signup */}
        {initialCategory && (
          <View style={[styles.squareCard, {
            backgroundColor: getMeta(initialCategory).color + '18',
            borderColor: getMeta(initialCategory).color + '40',
          }]}>
            <View style={styles.primaryBadge}>
              <MaterialIcons name="star" size={10} color="#F59E0B" />
            </View>
            <MaterialIcons name={getMeta(initialCategory).icon} size={26} color={getMeta(initialCategory).color} />
            <Text style={[styles.squareLabel, { color: getMeta(initialCategory).color }]} numberOfLines={1}>
              {initialCategory}
            </Text>
          </View>
        )}

        {/* Services detected from tagged portfolio images */}
        {displayedServices.map((svc) => {
          const meta = getMeta(svc.categoryGroup);
          return (
            <TouchableOpacity
              key={svc.id}
              style={[styles.squareCard, { backgroundColor: meta.color + '18', borderColor: meta.color + '40' }]}
              onPress={() => handleCategoryPress(svc.title)}
              activeOpacity={0.85}
            >
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{svc.count}</Text>
              </View>
              <MaterialIcons name={meta.icon} size={26} color={meta.color} />
              <Text style={[styles.squareLabel, { color: meta.color }]} numberOfLines={1}>
                {svc.title}
              </Text>
            </TouchableOpacity>
          );
        })}
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
            color="#2563EB"
          />
        </TouchableOpacity>
      )}

      {loading && <Text style={[styles.loadingText, { color: C.textSub }]}>Loading services…</Text>}
      {!loading && !initialCategory && addedServices.length === 0 && (
        <Text style={[styles.emptyText, { color: C.textSub }]}>No services yet</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section:       { borderRadius: 18, borderWidth: 0.5, padding: 16, marginBottom: 14 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: 15, fontWeight: '700' },
  seeAll:        { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  servicesRow:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  squareCard: {
    width: 88, height: 88, borderRadius: 14, borderWidth: 1,
    justifyContent: 'center', alignItems: 'center', gap: 6,
    position: 'relative', paddingHorizontal: 6,
  },
  primaryBadge: { position: 'absolute', top: 6, right: 6 },
  countBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8,
    minWidth: 16, paddingHorizontal: 4, alignItems: 'center',
  },
  countBadgeText: { fontSize: 9, color: '#fff', fontWeight: '700' },
  squareLabel:  { fontSize: 11, fontWeight: '700', textAlign: 'center' },
  seeMoreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, marginTop: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1,
  },
  seeMoreText: { fontSize: 12, fontWeight: '600', color: '#2563EB' },
  loadingText:  { fontSize: 11, marginTop: 8, fontStyle: 'italic' },
  emptyText:    { fontSize: 12 },
});

