import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Text, FAB, Switch, Divider } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { CONFIG } from '../config';
import { Colors } from '../theme';

const CATEGORY_META = {
  plumbing:   { icon: 'plumbing',            color: '#2563EB' },
  electrical: { icon: 'electrical-services', color: '#F59E0B' },
  carpentry:  { icon: 'handyman',            color: '#7C3AED' },
  cleaning:   { icon: 'cleaning-services',   color: '#059669' },
  painting:   { icon: 'format-paint',        color: '#DC2626' },
  roofing:    { icon: 'home-repair-service', color: '#0891B2' },
  planting:   { icon: 'local-florist',       color: '#15803D' },
  other:      { icon: 'build',               color: '#6B7280' },
};

const getMeta = (group) => CATEGORY_META[(group || '').toLowerCase()] || CATEGORY_META.other;

const PRICE_UNIT_LABEL = {
  hour: '/hr',
  day: '/day',
  job: '/job',
  sqft: '/sqft',
  item: '/item',
};

export default function ServicesListScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext);
  const [services, setServices] = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('all');

  const C = isDark
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', subCard: '#2a2a2a', inputBg: '#2c2c2e' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', subCard: '#F8FAFC', inputBg: '#F1F5F9' };

  const fetchServices = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      const res = await fetch(`${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/provider`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      if (data.success) {
        setServices(data.data || []);
        applyFilters(data.data || [], searchQuery, filterActive);
      }
    } catch (err) {
      console.log('Services fetch error:', err);
      Alert.alert('Error', 'Failed to load services');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, filterActive]);

  const applyFilters = (list, query, active) => {
    let filtered = [...list];

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.description?.toLowerCase().includes(q) ||
          s.category?.toLowerCase().includes(q) ||
          (s.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }

    if (active === 'active') {
      filtered = filtered.filter((s) => s.isActive);
    } else if (active === 'inactive') {
      filtered = filtered.filter((s) => !s.isActive);
    }

    setFilteredServices(filtered);
  };

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchServices();
    });
    return unsubscribe;
  }, [navigation, fetchServices]);

  useEffect(() => {
    applyFilters(services, searchQuery, filterActive);
  }, [services, searchQuery, filterActive]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchServices();
  };

  const handleToggleActive = async (service) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/${service._id}/toggle-active`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error('Failed to toggle');
      fetchServices();
    } catch (err) {
      Alert.alert('Error', 'Failed to update service status');
    }
  };

  const handleEdit = (service) => {
    navigation.navigate('ServiceForm', { serviceId: service._id });
  };

  const handleDelete = (service) => {
    Alert.alert(
      'Delete Service',
      `Are you sure you want to delete "${service.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const res = await fetch(
                `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/${service._id}`,
                {
                  method: 'DELETE',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                  },
                }
              );

              if (!res.ok) throw new Error('Failed to delete');
              fetchServices();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete service');
            }
          },
        },
      ]
    );
  };

  const stats = {
    total: services.length,
    active: services.filter((s) => s.isActive).length,
    inactive: services.filter((s) => !s.isActive).length,
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <View style={[styles.searchBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: C.inputBg }]}>
          <MaterialIcons name="search" size={18} color={C.textSub} />
          <TextInput
            style={[styles.searchInput, { color: C.text }]}
            placeholder="Search services..."
            placeholderTextColor={C.textSub}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <View style={[styles.statsBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        {[
          { key: 'all', label: 'All', count: stats.total, color: '#2563EB' },
          { key: 'active', label: 'Active', count: stats.active, color: '#16A34A' },
          { key: 'inactive', label: 'Inactive', count: stats.inactive, color: '#DC2626' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabBtn,
              filterActive === tab.key && {
                backgroundColor: tab.color + '18',
                borderBottomColor: tab.color,
                borderBottomWidth: 2,
              },
            ]}
            onPress={() => setFilterActive(tab.key)}
          >
            <Text style={[styles.tabCount, { color: tab.color }]}>{tab.count}</Text>
            <Text style={[styles.tabLabel, { color: filterActive === tab.key ? tab.color : C.textSub }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: C.textSub }]}>Loading services...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
          }
        >
          {filteredServices.length === 0 ? (
            <View style={[styles.emptyState, { borderColor: C.border }]}>
              <MaterialIcons name="construction" size={56} color={C.textSub} />
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {searchQuery ? 'No matching services' : 'No services yet'}
              </Text>
              <Text style={[styles.emptySub, { color: C.textSub }]}>
                {searchQuery ? 'Try a different search term' : 'Tap the + button below to add your first service'}
              </Text>
              {!searchQuery && (
                <TouchableOpacity
                  style={[styles.ctaBtn, { backgroundColor: Colors.primary }]}
                  onPress={() => navigation.navigate('ServiceForm')}
                >
                  <MaterialIcons name="add" size={18} color="#fff" />
                  <Text style={styles.ctaBtnText}>Add Your First Service</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredServices.map((service) => {
              const meta = service.meta || getMeta(service.categoryGroup);
              return (
                <View key={service._id} style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <View
                        style={[
                          styles.iconBg,
                          { backgroundColor: meta.color + '18', borderColor: meta.color + '40' },
                        ]}
                      >
                        <MaterialIcons name={meta.icon} size={24} color={meta.color} />
                      </View>
                      <View style={styles.cardTitleWrap}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.serviceName, { color: C.text }]} numberOfLines={1}>
                            {service.name}
                          </Text>
                          {service.mlDetected && (
                            <View style={styles.mlBadge}>
                              <MaterialIcons name="auto-awesome" size={10} color="#7C3AED" />
                              <Text style={styles.mlBadgeText}>AI</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.serviceCategory, { color: C.textSub }]} numberOfLines={1}>
                          {service.category}
                        </Text>
                      </View>
                    </View>
                    <Switch
                      value={service.isActive}
                      onValueChange={() => handleToggleActive(service)}
                      color={Colors.primary}
                    />
                  </View>

                  {service.description ? (
                    <Text style={[styles.serviceDesc, { color: C.textSub }]} numberOfLines={2}>
                      {service.description}
                    </Text>
                  ) : null}

                  <View style={[styles.divider, { backgroundColor: C.border }]} />

                  <View style={styles.cardFooter}>
                    <View style={styles.priceWrap}>
                      <Text style={[styles.priceLabel, { color: C.textSub }]}>Starting</Text>
                      <Text style={[styles.priceVal, { color: meta.color }]}>
                        Rs. {service.basePrice?.toLocaleString() || 0}
                        <Text style={[styles.priceUnit, { color: C.textSub }]}>
                          {PRICE_UNIT_LABEL[service.priceUnit] || '/job'}
                        </Text>
                      </Text>
                    </View>

                    {(service.tags || []).length > 0 && (
                      <View style={styles.tagsWrap}>
                        {service.tags.slice(0, 3).map((tag, i) => (
                          <View key={i} style={[styles.tagChip, { backgroundColor: meta.color + '14', borderColor: meta.color + '30' }]}>
                            <Text style={[styles.tagText, { color: meta.color }]}>{tag}</Text>
                          </View>
                        ))}
                        {service.tags.length > 3 && (
                          <Text style={[styles.moreTags, { color: C.textSub }]}>+{service.tags.length - 3}</Text>
                        )}
                      </View>
                    )}
                  </View>

                  <View style={[styles.actionsRow, { borderTopColor: C.border }]}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionEdit]}
                      onPress={() => handleEdit(service)}
                    >
                      <MaterialIcons name="edit" size={14} color="#2563EB" />
                      <Text style={styles.actionEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.actionDelete]}
                      onPress={() => handleDelete(service)}
                    >
                      <MaterialIcons name="delete-outline" size={14} color="#DC2626" />
                      <Text style={styles.actionDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}

          <View style={{ height: 110 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ServiceForm')}
        style={styles.fabButton}
      >
        <View style={[styles.fabGradient, { backgroundColor: Colors.primary }]}>
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  searchInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },

  statsBar: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tabCount: {
    fontSize: 18,
    fontWeight: '800',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  scrollContent: {
    padding: 16,
  },

  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  ctaBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  card: {
    borderRadius: 16,
    borderWidth: 0.5,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: 14,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBg: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  cardTitleWrap: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  serviceCategory: {
    fontSize: 12,
    marginTop: 2,
  },
  mlBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#F5F3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  mlBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7C3AED',
  },

  serviceDesc: {
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },

  divider: {
    height: 0.5,
    marginHorizontal: 14,
  },

  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  priceWrap: {},
  priceLabel: {
    fontSize: 10,
    marginBottom: 2,
  },
  priceVal: {
    fontSize: 17,
    fontWeight: '800',
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '500',
  },
  tagsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '55%',
  },
  tagChip: {
    borderWidth: 0.5,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  moreTags: {
    fontSize: 11,
    fontWeight: '600',
  },

  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  actionEdit: {
    borderRightWidth: 0.5,
    borderRightColor: '#E2E8F0',
  },
  actionEditText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionDeleteText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },

  fabButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
