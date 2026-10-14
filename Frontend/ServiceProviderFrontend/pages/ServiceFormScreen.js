import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Text, TextInput as PaperInput, Chip, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { CONFIG } from '../config';
import { Colors } from '../theme';

const CATEGORY_OPTIONS = [
  { label: 'Plumbing', value: 'plumbing', group: 'plumbing', icon: 'plumbing', color: '#2563EB' },
  { label: 'Electrical', value: 'electrical', group: 'electrical', icon: 'electrical-services', color: '#F59E0B' },
  { label: 'Carpentry', value: 'carpentry', group: 'carpentry', icon: 'handyman', color: '#7C3AED' },
  { label: 'Cleaning', value: 'cleaning', group: 'cleaning', icon: 'cleaning-services', color: '#059669' },
  { label: 'Painting', value: 'painting', group: 'painting', icon: 'format-paint', color: '#DC2626' },
  { label: 'Roofing', value: 'roofing', group: 'roofing', icon: 'home-repair-service', color: '#0891B2' },
  { label: 'Planting / Gardening', value: 'planting', group: 'planting', icon: 'local-florist', color: '#15803D' },
  { label: 'Home Service', value: 'home service', group: 'other', icon: 'home', color: '#6B7280' },
  { label: 'Other', value: 'other', group: 'other', icon: 'build', color: '#6B7280' },
];

const PRICE_UNIT_OPTIONS = [
  { label: 'Per Hour', value: 'hour' },
  { label: 'Per Day', value: 'day' },
  { label: 'Per Job', value: 'job' },
  { label: 'Per Sq Ft', value: 'sqft' },
  { label: 'Per Item', value: 'item' },
];

export default function ServiceFormScreen({ navigation, route }) {
  const { isDark } = useContext(ThemeContext);
  const serviceId = route.params?.serviceId;
  const isEditMode = !!serviceId;

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'home service',
    basePrice: '',
    priceUnit: 'job',
    tags: [],
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const [availability, setAvailability] = useState({
    checking: false,
    available: null,
    message: '',
    existingService: null,
  });

  const C = isDark
    ? { bg: '#0f0f0f', card: '#1c1c1e', text: '#F2F2F7', textSub: '#8E8E93', border: '#2c2c2e', inputBg: '#2c2c2e' }
    : { bg: '#F8FAFC', card: '#FFFFFF', text: '#111111', textSub: '#6B7280', border: '#E2E8F0', inputBg: '#FFFFFF' };

  const selectedCategory = CATEGORY_OPTIONS.find((c) => c.value === form.category) || CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 2];

  const fetchServiceForEdit = useCallback(async () => {
    if (!serviceId) return;
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const res = await fetch(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/${serviceId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      );
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (data.success) {
        const svc = data.data;
        setForm({
          name: svc.name || '',
          description: svc.description || '',
          category: svc.category || 'home service',
          basePrice: svc.basePrice ? String(svc.basePrice) : '',
          priceUnit: svc.priceUnit || 'job',
          tags: svc.tags || [],
        });
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to load service data');
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchServiceForEdit();
  }, [fetchServiceForEdit]);

  const checkAvailabilityDebounceRef = React.useRef(null);

  useEffect(() => {
    if (!form.name.trim() || form.name.length < 2 || isEditMode) {
      setAvailability({ checking: false, available: null, message: '', existingService: null });
      return;
    }

    if (checkAvailabilityDebounceRef.current) {
      clearTimeout(checkAvailabilityDebounceRef.current);
    }

    checkAvailabilityDebounceRef.current = setTimeout(async () => {
      try {
        setAvailability((prev) => ({ ...prev, checking: true }));
        const token = await AsyncStorage.getItem('userToken');
        const res = await fetch(
          `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/check-availability`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: form.name,
            }),
          }
        );
        const data = await res.json();
        if (data.success) {
          setAvailability({
            checking: false,
            available: data.available,
            message: data.message,
            existingService: data.existingService,
          });
        }
      } catch (err) {
        setAvailability({ checking: false, available: null, message: '', existingService: null });
      }
    }, 400);

    return () => {
      if (checkAvailabilityDebounceRef.current) {
        clearTimeout(checkAvailabilityDebounceRef.current);
      }
    };
  }, [form.name, isEditMode]);

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const addTag = () => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (form.tags.includes(trimmed)) {
      setTagInput('');
      return;
    }
    if (form.tags.length >= 10) {
      Alert.alert('Limit reached', 'Maximum 10 tags allowed');
      return;
    }
    updateField('tags', [...form.tags, trimmed]);
    setTagInput('');
  };

  const removeTag = (tag) => {
    updateField(
      'tags',
      form.tags.filter((t) => t !== tag)
    );
  };

  const validate = () => {
    if (!form.name.trim()) {
      Alert.alert('Required', 'Service name is required');
      return false;
    }
    if (!isEditMode && availability.available === false) {
      Alert.alert(
        'Duplicate Service',
        `"${form.name}" already exists in your services. Please choose a different name.`
      );
      return false;
    }
    if (form.basePrice && isNaN(Number(form.basePrice))) {
      Alert.alert('Invalid Price', 'Please enter a valid number for base price');
      return false;
    }
    if (form.basePrice && Number(form.basePrice) < 0) {
      Alert.alert('Invalid Price', 'Base price cannot be negative');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setSubmitLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        categoryGroup: selectedCategory.group,
        basePrice: form.basePrice ? Number(form.basePrice) : 0,
        priceUnit: form.priceUnit,
        tags: form.tags,
      };

      const url = isEditMode
        ? `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services/${serviceId}`
        : `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/services`;

      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.error === 'DUPLICATE_SERVICE') {
        Alert.alert(
          'Duplicate Service',
          data.message || 'A service with this name already exists'
        );
        setSubmitLoading(false);
        return;
      }

      if (!data.success) {
        throw new Error(data.message || 'Failed to save');
      }

      Alert.alert(
        isEditMode ? 'Updated!' : 'Created!',
        isEditMode
          ? 'Service has been updated successfully.'
          : 'New service has been added successfully.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save service');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: C.bg }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.loadingText, { color: C.textSub }]}>Loading service...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={[styles.headerPreview, { backgroundColor: C.card, borderColor: C.border }]}>
          <View
            style={[
              styles.previewIcon,
              {
                backgroundColor: selectedCategory.color + '18',
                borderColor: selectedCategory.color + '40',
              },
            ]}
          >
            <MaterialIcons name={selectedCategory.icon} size={32} color={selectedCategory.color} />
          </View>
          <View style={styles.previewInfo}>
            <Text style={[styles.previewName, { color: C.text }]} numberOfLines={1}>
              {form.name.trim() || 'Service Name'}
            </Text>
            <Text style={[styles.previewCategory, { color: selectedCategory.color }]}>
              {selectedCategory.label}
            </Text>
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="badge" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Basic Details</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: C.text }]}>
              Service Name <Text style={{ color: '#DC2626' }}>*</Text>
            </Text>
            <PaperInput
              mode="outlined"
              placeholder="e.g. Bathroom Plumbing Repair"
              value={form.name}
              onChangeText={(v) => updateField('name', v)}
              outlineStyle={{ borderRadius: 12 }}
              style={styles.input}
              theme={{
                colors: {
                  text: C.text,
                  onSurfaceVariant: C.textSub,
                  primary: Colors.primary,
                  outline: C.border,
                  background: C.inputBg,
                },
                roundness: 12,
              }}
              right={
                availability.checking ? (
                  <PaperInput.Icon icon={() => <ActivityIndicator size="small" color={Colors.primary} />} />
                ) : availability.available === true ? (
                  <PaperInput.Icon
                    icon={() => <MaterialIcons name="check-circle" size={20} color="#16A34A" />}
                  />
                ) : availability.available === false ? (
                  <PaperInput.Icon
                    icon={() => <MaterialIcons name="error" size={20} color="#DC2626" />}
                  />
                ) : null
              }
            />
            {availability.available === true && (
              <View style={[styles.statusRow, styles.statusOk]}>
                <MaterialIcons name="check-circle" size={14} color="#16A34A" />
                <Text style={styles.statusOkText}>{availability.message}</Text>
              </View>
            )}
            {availability.available === false && (
              <View style={[styles.statusRow, styles.statusErr]}>
                <MaterialIcons name="error" size={14} color="#DC2626" />
                <Text style={styles.statusErrText}>{availability.message}</Text>
              </View>
            )}
          </View>

          <View style={styles.formGroup}>
            <Text style={[styles.label, { color: C.text }]}>Description</Text>
            <PaperInput
              mode="outlined"
              multiline
              numberOfLines={4}
              placeholder="Describe the service you offer, what's included, specializations, etc."
              value={form.description}
              onChangeText={(v) => updateField('description', v)}
              outlineStyle={{ borderRadius: 12 }}
              style={[styles.input, { minHeight: 110 }]}
              theme={{
                colors: {
                  text: C.text,
                  onSurfaceVariant: C.textSub,
                  primary: Colors.primary,
                  outline: C.border,
                  background: C.inputBg,
                },
                roundness: 12,
              }}
            />
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="category" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Category</Text>
          </View>

          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: form.category === cat.value ? cat.color + '18' : C.subCard,
                    borderColor: form.category === cat.value ? cat.color : C.border,
                    borderWidth: form.category === cat.value ? 2 : 0.5,
                  },
                ]}
                onPress={() => updateField('category', cat.value)}
                activeOpacity={0.7}
              >
                <MaterialIcons name={cat.icon} size={20} color={cat.color} />
                <Text
                  style={[
                    styles.categoryCardLabel,
                    { color: form.category === cat.value ? cat.color : C.text },
                  ]}
                  numberOfLines={1}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="attach-money" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Pricing</Text>
          </View>

          <View style={styles.pricingRow}>
            <View style={[styles.formGroup, styles.priceField]}>
              <Text style={[styles.label, { color: C.text }]}>Base Price (LKR)</Text>
              <PaperInput
                mode="outlined"
                keyboardType="numeric"
                placeholder="0"
                value={form.basePrice}
                onChangeText={(v) => updateField('basePrice', v.replace(/[^0-9.]/g, ''))}
                outlineStyle={{ borderRadius: 12 }}
                style={styles.input}
                theme={{
                  colors: {
                    text: C.text,
                    onSurfaceVariant: C.textSub,
                    primary: Colors.primary,
                    outline: C.border,
                    background: C.inputBg,
                  },
                  roundness: 12,
                }}
                left={<PaperInput.Affix text="Rs. " />}
              />
            </View>

            <View style={[styles.formGroup, styles.priceUnitField]}>
              <Text style={[styles.label, { color: C.text }]}>Unit</Text>
              <View style={[styles.pickerWrap, { backgroundColor: C.inputBg, borderColor: C.border }]}>
                {PRICE_UNIT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.pickerOption,
                      {
                        backgroundColor: form.priceUnit === opt.value ? Colors.primary : 'transparent',
                      },
                    ]}
                    onPress={() => updateField('priceUnit', opt.value)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: form.priceUnit === opt.value ? '#fff' : C.textSub },
                      ]}
                    >
                      {opt.value === 'hour' ? 'Hr' : opt.value === 'day' ? 'Day' : opt.value === 'job' ? 'Job' : opt.value === 'sqft' ? 'Ft²' : 'Item'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="label" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Tags</Text>
            <Text style={[styles.tagCounter, { color: C.textSub }]}>{form.tags.length}/10</Text>
          </View>

          <View style={styles.tagInputRow}>
            <PaperInput
              mode="outlined"
              placeholder="Add a tag (e.g. residential, emergency, 24/7)"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
              outlineStyle={{ borderRadius: 12 }}
              style={[styles.input, styles.tagInput]}
              theme={{
                colors: {
                  text: C.text,
                  onSurfaceVariant: C.textSub,
                  primary: Colors.primary,
                  outline: C.border,
                  background: C.inputBg,
                },
                roundness: 12,
              }}
            />
            <TouchableOpacity style={[styles.addTagBtn, { backgroundColor: Colors.primary }]} onPress={addTag}>
              <MaterialIcons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {form.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {form.tags.map((tag) => (
                <Chip
                  key={tag}
                  mode="flat"
                  style={[styles.chipTag, { backgroundColor: selectedCategory.color + '14' }]}
                  textStyle={{ color: selectedCategory.color, fontWeight: '600' }}
                  onClose={() => removeTag(tag)}
                  closeIcon={() => <MaterialIcons name="close" size={14} color={selectedCategory.color} />}
                >
                  {tag}
                </Chip>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          disabled={submitLoading}
        >
          <Text style={[styles.secondaryBtnText, { color: C.text }]}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { backgroundColor: Colors.primary, opacity: submitLoading ? 0.6 : 1 },
          ]}
          onPress={handleSubmit}
          disabled={submitLoading}
        >
          {submitLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name={isEditMode ? 'save' : 'add-circle'} size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>{isEditMode ? 'Save Changes' : 'Create Service'}</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
  },

  scrollContent: {
    padding: 16,
  },

  headerPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 16,
  },
  previewIcon: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '700',
  },
  previewCategory: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },

  formSection: {
    borderRadius: 16,
    borderWidth: 0.5,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  tagCounter: {
    fontSize: 11,
    fontWeight: '600',
  },

  formGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'transparent',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusOk: {
    backgroundColor: '#DCFCE7',
  },
  statusOkText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#166534',
  },
  statusErr: {
    backgroundColor: '#FEE2E2',
  },
  statusErrText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#991B1B',
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '31.5%',
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  categoryCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  pricingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  priceField: {
    flex: 1.3,
  },
  priceUnitField: {
    flex: 1,
  },
  pickerWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 12,
    borderWidth: 0.5,
    padding: 4,
    gap: 2,
  },
  pickerOption: {
    flex: 1,
    minWidth: '31%',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionText: {
    fontSize: 11,
    fontWeight: '600',
  },

  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  tagInput: {
    flex: 1,
    marginBottom: 0,
  },
  addTagBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chipTag: {
    margin: 0,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 0.5,
    paddingBottom: Platform.OS === 'ios' ? 28 : 14,
  },
  secondaryBtn: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  primaryBtn: {
    flex: 1.4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});
