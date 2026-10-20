/**
 * pages/CreatePostScreen.js
 *
 * Modern AI Ad Post Generation & Editing screen.
 * Supports both creating new AI-powered advertisements with Gemini,
 * and editing existing advertisements with instant preview, tag management,
 * portfolio image selection, and full backend persistence.
 */

import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Text, Surface } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { ThemeContext } from '../context/ThemeContext';
import { CONFIG, IP_ADDRESS } from '../config';
import { Colors } from '../theme';
import { usePortfolio } from '../context/PortfolioContext';

const { width } = Dimensions.get('window');

const TONES = [
  { id: 'professional', label: 'Professional', icon: 'business-center', color: '#15803D' },
  { id: 'friendly', label: 'Friendly', icon: 'sentiment-satisfied', color: '#2563EB' },
  { id: 'urgent', label: 'Urgent', icon: 'bolt', color: '#DC2626' },
  { id: 'promotional', label: 'Promo', icon: 'campaign', color: '#D97706' },
  { id: 'trustworthy', label: 'Trusted', icon: 'verified', color: '#059669' },
];

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
];

export default function CreatePostScreen({ navigation, route }) {
  const { isDark } = useContext(ThemeContext);
  const { portfolioImages = [] } = usePortfolio() || {};

  // Check if we are in Edit Mode
  const editPost = route?.params?.post || null;
  const isEditMode = route?.params?.mode === 'edit' || Boolean(editPost);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatedBy, setGeneratedBy] = useState(null);
  const [providerInfo, setProviderInfo] = useState({
    providerId: '',
    providerName: '',
    location: '',
    contact: '',
  });

  const [form, setForm] = useState({
    serviceLabel: '',
    specificLabel: '',
    tags: [],
    tone: 'professional',
    language: 'en',
    extraInfo: '',
    selectedImages: [],
  });

  const [imagePickerVisible, setImagePickerVisible] = useState(false);
  const [result, setResult] = useState(null);
  const [generatedPostId, setGeneratedPostId] = useState(null);
  const [regenerating, setRegenerating] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [penaltyRestricted, setPenaltyRestricted] = useState(false);
  const [penaltyRatio, setPenaltyRatio] = useState('3/3');

  // Populate data if in Edit Mode
  useEffect(() => {
    if (editPost) {
      const initialImages = [];
      if (editPost.image) initialImages.push(editPost.image);
      if (Array.isArray(editPost.images)) {
        editPost.images.forEach((img) => {
          if (img && !initialImages.includes(img)) initialImages.push(img);
        });
      }

      setForm({
        serviceLabel: editPost.title || editPost.serviceLabel || '',
        specificLabel: editPost.specificLabel || '',
        tags: Array.isArray(editPost.tags) ? editPost.tags : [],
        tone: editPost.tone || 'professional',
        language: editPost.language || 'en',
        extraInfo: editPost.extraInfo || '',
        selectedImages: initialImages,
      });

      const initialCaption =
        editPost.description ||
        editPost.caption ||
        editPost.posts?.[0]?.caption ||
        '';
      if (initialCaption) {
        setResult(initialCaption);
      }

      setGeneratedPostId(editPost.id || editPost._id || null);
    }
  }, [editPost]);

  // Theme-based colors
  const C = isDark
    ? {
        bg: '#0C0F0D',
        card: '#161C18',
        cardBorder: '#303C33',
        text: '#F1F5F9',
        textSecondary: '#94A3B8',
        textMuted: '#64748B',
        input: '#1A231C',
        inputBorder: '#303C33',
        primary: '#10B981',
        primaryLight: '#064E3B',
        primaryDark: '#047857',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        border: '#303C33',
        white: '#FFFFFF',
        gradientStart: '#161C18',
        gradientEnd: '#0C0F0D',
      }
    : {
        bg: '#F6FAF7',
        card: '#FFFFFF',
        cardBorder: '#E2E8F0',
        text: '#0F172A',
        textSecondary: '#475569',
        textMuted: '#94A3B8',
        input: '#F8FAFC',
        inputBorder: '#E2E8F0',
        primary: '#15803D',
        primaryLight: '#DCFCE7',
        primaryDark: '#166534',
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        border: '#E2E8F0',
        white: '#FFFFFF',
        gradientStart: '#15803D',
        gradientEnd: '#166534',
      };

  useEffect(() => {
    const fetchProviderInfo = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        let userId = await AsyncStorage.getItem('userId');

        if (!userId && token) {
          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const decoded = JSON.parse(decodeURIComponent(escape(atob(base64))));
              userId = decoded.id || decoded._id || decoded.userId || decoded.user?.id || decoded.user?._id;
            }
          } catch (_) {}
        }
        if (!userId) {
          userId = '69fc31f3cfe41c4d62e6f9ee';
        }

        // Check penalty score & restrictions (only strictly prevents creation, allow edits)
        try {
          const adminUrl = CONFIG.ADMIN_SERVICE_URL || 'https://r26-admin-service.onrender.com';
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1500);
          try {
            const statusRes = await fetch(`${adminUrl}/api/inquiries/check-bookable/${userId}`, {
              signal: controller.signal,
            });
            if (statusRes.ok) {
              const statusData = await statusRes.json();
              const score = typeof statusData.penaltyScore === 'number' ? statusData.penaltyScore : (statusData.activeMissedBookingsCount || 0);
              if (score >= 3 || statusData.isRestricted || statusData.isBlocked) {
                setPenaltyRestricted(true);
                setPenaltyRatio(statusData.penaltyRatio || `${score}/3`);
              }
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (e) {
          // Admin service optional or offline
        }

        const authController = new AbortController();
        const authTimeoutId = setTimeout(() => authController.abort(), 4000);
        let res;
        try {
          res = await fetch(`${CONFIG.AUTH_SERVICE_URL}/profile`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: authController.signal,
          });
        } finally {
          clearTimeout(authTimeoutId);
        }
        const data = await res.json();

        if (data.provider) {
          let locationString = 'Not specified';
          if (data.provider.location) {
            if (typeof data.provider.location === 'string') {
              locationString = data.provider.location;
            } else if (typeof data.provider.location === 'object') {
              if (data.provider.location.address) {
                locationString = data.provider.location.address;
              } else if (data.provider.location.city || data.provider.location.district) {
                const parts = [
                  data.provider.location.city,
                  data.provider.location.district,
                  data.provider.location.province,
                ].filter(Boolean);
                locationString = parts.join(', ') || 'Not specified';
              }
            }
          }

          setProviderInfo({
            providerId: userId || '',
            providerName: data.provider.name || 'Unknown Provider',
            location: locationString,
            contact: data.provider.telephone || data.provider.phone || 'Not specified',
          });
        }
      } catch (err) {
        console.log('Error fetching provider info:', err);
      }
    };
    fetchProviderInfo();
  }, []);

  const pickGalleryImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Gallery permission is required to select images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) {
      setForm((prev) => ({
        ...prev,
        selectedImages: [...prev.selectedImages, ...result.assets.map((a) => a.uri)],
      }));
    }
    setImagePickerVisible(false);
  };

  const selectPortfolioImage = (image) => {
    if (!image?.uri) return;
    setForm((prev) => ({
      ...prev,
      selectedImages: prev.selectedImages.includes(image.uri)
        ? prev.selectedImages.filter((uri) => uri !== image.uri)
        : [...prev.selectedImages, image.uri],
    }));
  };

  const useCurrentLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission required', 'Location permission is required.');
      return;
    }
    const position = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync(position.coords);
    const location = [place?.city, place?.district, place?.region].filter(Boolean).join(', ');
    if (location) setProviderInfo((prev) => ({ ...prev, location }));
  };

  const handleGenerate = async () => {
    if (penaltyRestricted && !isEditMode) {
      Alert.alert(
        'Post Creation Restricted',
        `Your penalty score has reached ${penaltyRatio} due to missed or cancelled bookings. You cannot create new posts until your penalty points are reduced below 3.`,
        [
          { text: 'Submit Inquiry', onPress: () => navigation.navigate('SubmitInquiry') },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }

    if (!form.serviceLabel.trim()) {
      return Alert.alert('Required', 'Please enter the service performed.');
    }

    setLoading(true);
    setGeneratedBy(null);
    try {
      const token = await AsyncStorage.getItem('userToken');
      const providerId = await AsyncStorage.getItem('userId');

      if (!providerId) {
        throw new Error('Provider session is missing. Please sign in again.');
      }

      const response = await axios.post(
        `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/generate`,
        {
          providerId,
          providerName: providerInfo.providerName,
          serviceLabel: form.serviceLabel,
          specificLabel: form.specificLabel,
          location: providerInfo.location,
          contact: providerInfo.contact,
          tone: form.tone,
          language: form.language,
          category: 'home service',
          tags: form.tags,
          extraInfo: form.extraInfo,
          images: form.selectedImages,
          platforms: ['facebook', 'instagram'],
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          timeout: 45000,
        }
      );

      if (response.data.success) {
        const generatedPosts = response.data.data?.posts || [];
        const source = response.data.generatedBy || 'gemini';
        setGeneratedBy(source);
        if (!isEditMode) {
          setGeneratedPostId(response.data.data?._id || null);
        }

        const captions = generatedPosts
          .map((post) => {
            if (typeof post === 'string') return post;
            if (post && typeof post.caption === 'string') return post.caption;
            if (post && typeof post.content === 'string') return post.content;
            return '';
          })
          .filter(Boolean);

        setResult(captions.join('\n\n'));
      } else {
        throw new Error(response.data?.error || 'Generation failed');
      }
    } catch (err) {
      const isTimeout = err.code === 'ECONNABORTED' || /timeout/i.test(err.message || '');
      const rawServer = err.response?.data?.error;
      const friendly = isTimeout
        ? 'Generation is taking longer than usual. You can use a template draft or try again.'
        : rawServer || err.message || 'Something went wrong.';

      Alert.alert('AI Notice', friendly, [
        {
          text: 'Use Template Draft',
          onPress: () => {
            const label = form.specificLabel || form.serviceLabel || 'our service';
            const provider = providerInfo.providerName || 'Professional Service';
            const loc = providerInfo.location || 'your area';
            const contact = providerInfo.contact || 'us';
            const sample = `${provider} offers top quality ${label} in ${loc}.\n\n` +
              (form.extraInfo ? `${form.extraInfo}\n\n` : '') +
              `Contact ${contact} for fast bookings and quality guaranteed work.\n\n` +
              `#${label.replace(/\s+/g, '')} #LocalServices #QualityService`;
            setResult(sample);
            setGeneratedBy('fallback');
          },
        },
        { text: 'Try Again', onPress: () => handleGenerate() },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Save / Update Post to backend
  const handleSavePost = async () => {
    if (!form.serviceLabel.trim()) {
      return Alert.alert('Required', 'Please enter a service name/title.');
    }

    setSaving(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      // In edit mode always update the original ad. Never prefer a newly
      // generated draft id, otherwise saving can create/update the wrong ad.
      const targetId = isEditMode
        ? (editPost?.id || editPost?._id)
        : generatedPostId;

      if (!targetId && !isEditMode) {
        // If not generated yet, generate first
        await handleGenerate();
        setSaving(false);
        return;
      }

      const postCaption = result || form.extraInfo || form.serviceLabel;
      const primaryImage = form.selectedImages?.[0] || null;

      const payload = {
        serviceLabel: form.serviceLabel,
        specificLabel: form.specificLabel,
        tone: form.tone,
        language: form.language,
        extraInfo: form.extraInfo,
        tags: form.tags,
        images: form.selectedImages,
        imageUrl: primaryImage,
        title: form.serviceLabel,
        caption: postCaption,
        status: 'published',
        posts: [
          {
            platform: 'facebook',
            title: form.serviceLabel,
            caption: postCaption,
            hashtags: form.tags,
          },
        ],
      };

      if (targetId) {
        const response = await axios.put(
          `${CONFIG.PROVIDER_SERVICE_URL}/api/provider/ads/${targetId}`,
          payload,
          { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
        );

        if (response.data && response.data.success) {
          Alert.alert(
            'Success',
            isEditMode ? 'Advertisement updated successfully!' : 'Advertisement published successfully!',
            [{ text: 'OK', onPress: () => navigation.navigate('Profile') }]
          );
        } else {
          throw new Error(response.data?.message || 'Failed to save changes');
        }
      } else {
        // If targetId is somehow still null, navigate back
        Alert.alert('Saved', 'Your post has been processed.', [
          { text: 'OK', onPress: () => navigation.navigate('Profile') },
        ]);
      }
    } catch (err) {
      console.log('Save post error:', err);
      Alert.alert(
        'Save Failed',
        err.response?.data?.error || err.message || 'Could not update advertisement.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    Alert.alert('Copied', 'Post content is ready to share.');
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...form.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Penalty Restriction Alert Banner */}
        {penaltyRestricted && !isEditMode && (
          <Surface
            style={[
              styles.penaltyAlertCard,
              { backgroundColor: isDark ? '#3D1A1A' : '#FEF2F2', borderColor: C.danger },
            ]}
            elevation={2}
          >
            <View style={styles.penaltyAlertHeader}>
              <MaterialIcons name="warning" size={22} color={C.danger} />
              <Text style={[styles.penaltyAlertTitle, { color: C.danger }]}>
                Posting Restricted ({penaltyRatio})
              </Text>
            </View>
            <Text style={[styles.penaltyAlertDesc, { color: isDark ? '#FCA5A5' : '#7F1D1D' }]}>
              Your penalty score has reached critical limit. Please submit an inquiry to resolve pending items.
            </Text>
          </Surface>
        )}

        {/* Mode Indicator Banner when Editing */}
        {isEditMode && (
          <View style={[styles.editModeBanner, { backgroundColor: isDark ? '#1C2E20' : '#E8F5E9', borderColor: Colors.primary }]}>
            <View style={styles.editModeLeft}>
              <MaterialIcons name="edit" size={18} color={Colors.primary} />
              <Text style={[styles.editModeTitle, { color: Colors.primary }]}>
                Editing Advertisement
              </Text>
            </View>
            <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
              <Text style={[styles.cancelEditText, { color: C.textSecondary }]}>Discard</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Modern Header Banner */}
        <LinearGradient
          colors={isDark ? ['#1B261E', '#0F1611'] : [C.gradientStart, C.gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerSection}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              hitSlop={8}
            >
              <MaterialIcons name="arrow-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.headerIconContainer}>
              <MaterialIcons
                name={isEditMode ? 'edit-note' : 'auto-awesome'}
                size={26}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                {isEditMode ? 'Edit Ad Post' : 'Create Ad Post'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEditMode
                  ? 'Update caption, details, and photos'
                  : 'Generate compelling content with Gemini AI'}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Provider Info Card */}
        <Surface
          style={[styles.providerCard, { backgroundColor: C.card, borderColor: C.cardBorder }]}
          elevation={1}
        >
          <View style={styles.providerContent}>
            <View style={[styles.avatarContainer, { backgroundColor: isDark ? '#233226' : '#DCFCE7' }]}>
              <MaterialIcons name="storefront" size={24} color={Colors.primary} />
            </View>
            <View style={styles.providerInfo}>
              <Text style={[styles.providerName, { color: C.text }]}>
                {providerInfo.providerName}
              </Text>
              <View style={styles.providerDetails}>
                <MaterialIcons name="location-on" size={13} color={C.textSecondary} />
                <Text style={[styles.providerDetailText, { color: C.textSecondary }]} numberOfLines={1}>
                  {providerInfo.location}
                </Text>
              </View>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: isDark ? '#1C3124' : '#DCFCE7' }]}>
              <MaterialIcons name="verified" size={16} color={Colors.primary} />
            </View>
          </View>
        </Surface>

        {/* Section 1: Service Name & Tags */}
        <Surface style={[styles.formCard, { backgroundColor: C.card, borderColor: C.cardBorder }]} elevation={1}>
          <View style={styles.cardHeaderRow}>
            <MaterialIcons name="home-repair-service" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Service Details</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text }]}>Service Name / Title *</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.input, borderColor: C.inputBorder }]}>
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="e.g. Electrical Repair & Wiring"
                placeholderTextColor={C.textMuted}
                value={form.serviceLabel}
                onChangeText={(v) => setForm({ ...form, serviceLabel: v })}
              />
            </View>
          </View>

          {/* Tags */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text }]}>Service Tags & Keywords</Text>
            <View style={styles.tagInputRow}>
              <View style={[styles.tagInputWrapper, { backgroundColor: C.input, borderColor: C.inputBorder }]}>
                <MaterialIcons name="tag" size={16} color={C.textMuted} style={{ marginLeft: 10 }} />
                <TextInput
                  style={[styles.input, styles.tagInput, { color: C.text }]}
                  placeholder="Add a tag and tap +"
                  placeholderTextColor={C.textMuted}
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={addTag}
                />
              </View>
              <TouchableOpacity
                style={[styles.addTagButton, { backgroundColor: Colors.primary }]}
                onPress={addTag}
                activeOpacity={0.8}
              >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {form.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {form.tags.map((tag, index) => (
                  <View key={index} style={[styles.tag, { backgroundColor: isDark ? '#233226' : '#E8F5E9' }]}>
                    <Text style={[styles.tagText, { color: Colors.primary }]}>#{tag}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        const newTags = form.tags.filter((_, i) => i !== index);
                        setForm({ ...form, tags: newTags });
                      }}
                    >
                      <MaterialIcons name="close" size={14} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Surface>

        {/* Section 2: Tone & Voice */}
        <Surface style={[styles.formCard, { backgroundColor: C.card, borderColor: C.cardBorder }]} elevation={1}>
          <View style={styles.cardHeaderRow}>
            <MaterialIcons name="record-voice-over" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Tone of Voice</Text>
          </View>

          <View style={styles.toneGrid}>
            {TONES.map((tone) => {
              const active = form.tone === tone.id;
              return (
                <TouchableOpacity
                  key={tone.id}
                  onPress={() => setForm({ ...form, tone: tone.id })}
                  style={[
                    styles.toneCard,
                    {
                      backgroundColor: active ? (isDark ? '#233226' : '#E8F5E9') : C.input,
                      borderColor: active ? Colors.primary : C.cardBorder,
                    },
                  ]}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={tone.icon}
                    size={22}
                    color={active ? Colors.primary : tone.color}
                  />
                  <Text
                    style={[
                      styles.toneText,
                      { color: active ? Colors.primary : C.text, fontWeight: active ? '700' : '600' },
                    ]}
                  >
                    {tone.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Surface>

        {/* Section 3: Language & Description Details */}
        <Surface style={[styles.formCard, { backgroundColor: C.card, borderColor: C.cardBorder }]} elevation={1}>
          <View style={styles.cardHeaderRow}>
            <MaterialIcons name="tune" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Content Preferences</Text>
          </View>

          {/* Language Selector */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text }]}>Generation Language</Text>
            <View style={styles.languageRow}>
              {LANGUAGES.map((lang) => {
                const active = form.language === lang.code;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    onPress={() => setForm({ ...form, language: lang.code })}
                    style={[
                      styles.languageChip,
                      {
                        backgroundColor: active ? Colors.primary : C.input,
                        borderColor: active ? Colors.primary : C.cardBorder,
                      },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        { color: active ? '#FFFFFF' : C.textSecondary, fontWeight: active ? '700' : '600' },
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Additional details to highlight */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text }]}>Highlights / Special Offers</Text>
            <View style={[styles.inputWrapper, { backgroundColor: C.input, borderColor: C.inputBorder }]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: C.text }]}
                placeholder="e.g. 24/7 emergency service, 10% discount on first booking, certified technicians..."
                placeholderTextColor={C.textMuted}
                value={form.extraInfo}
                onChangeText={(v) => setForm({ ...form, extraInfo: v })}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Service Location */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: C.text }]}>Service Area</Text>
            <View style={styles.locationRow}>
              <View style={[styles.locationInputWrapper, { backgroundColor: C.input, borderColor: C.inputBorder }]}>
                <MaterialIcons name="location-pin" size={18} color={Colors.primary} style={{ marginLeft: 10 }} />
                <TextInput
                  style={[styles.input, { color: C.text }]}
                  value={providerInfo.location}
                  onChangeText={(location) => setProviderInfo((prev) => ({ ...prev, location }))}
                  placeholder="Enter service location"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <TouchableOpacity
                style={[styles.locationButton, { backgroundColor: isDark ? '#233226' : '#DCFCE7' }]}
                onPress={useCurrentLocation}
                activeOpacity={0.8}
              >
                <MaterialIcons name="my-location" size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Photos Section */}
          <View style={styles.inputGroup}>
            <View style={styles.photoHeaderRow}>
              <Text style={[styles.inputLabel, { color: C.text, marginBottom: 0 }]}>Post Photos</Text>
              <Text style={{ fontSize: 11, color: C.textSecondary }}>
                {form.selectedImages.length} attached
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addImagesButton, { borderColor: Colors.primary, backgroundColor: isDark ? '#1A231C' : '#F0FDF4' }]}
              onPress={() => setImagePickerVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialIcons name="add-photo-alternate" size={20} color={Colors.primary} />
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 13 }}>
                Attach Photos (Gallery or Portfolio)
              </Text>
            </TouchableOpacity>

            {form.selectedImages.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12 }}>
                {form.selectedImages.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.selectedImageWrap}>
                    <Image source={{ uri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() =>
                        setForm((prev) => ({
                          ...prev,
                          selectedImages: prev.selectedImages.filter((_, i) => i !== index),
                        }))
                      }
                    >
                      <MaterialIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                    {index === 0 && (
                      <View style={styles.coverBadge}>
                        <Text style={styles.coverBadgeText}>Cover</Text>
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </Surface>

        {/* Generate / Rewrite Action Button */}
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading || (penaltyRestricted && !isEditMode)}
          style={[styles.generateButton, (loading || (penaltyRestricted && !isEditMode)) && { opacity: 0.6 }]}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[Colors.primary, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.generateGradient}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={20} color="#FFFFFF" />
                <Text style={styles.generateButtonText}>
                  {result
                    ? 'Regenerate Caption with AI'
                    : 'Generate AI Post with Gemini'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Generated Caption / Editor Preview Card */}
        {result !== null && (
          <Surface
            style={[styles.resultCard, { backgroundColor: C.card, borderColor: isDark ? '#2E4C38' : '#BBF7D0' }]}
            elevation={2}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultBadge}>
                <MaterialIcons name="check-circle" size={16} color={Colors.primary} />
                <Text style={[styles.resultBadgeText, { color: Colors.primary }]}>
                  {isEditMode ? 'Advertisement Caption' : 'Generated Advertisement'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.copyButton, { backgroundColor: isDark ? '#233226' : '#DCFCE7' }]}
                onPress={handleCopy}
              >
                <MaterialIcons name="content-copy" size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.resultTextContainer, { backgroundColor: C.input, borderColor: C.cardBorder }]}>
              <TextInput
                style={[styles.resultText, { color: C.text }]}
                value={result}
                onChangeText={setResult}
                multiline
                textAlignVertical="top"
                placeholder="Edit your advertisement caption here..."
                placeholderTextColor={C.textMuted}
              />
            </View>

            {/* Bottom Final Actions */}
            <View style={styles.resultButtonRow}>
              <TouchableOpacity
                style={[styles.savePostBtnWrapper, saving && { opacity: 0.7 }]}
                onPress={handleSavePost}
                disabled={saving}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[Colors.primary, '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.savePostGradient}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <MaterialIcons name="check" size={20} color="#fff" />
                      <Text style={styles.savePostBtnText}>
                        {isEditMode ? 'Save & Update Post' : 'Publish Advertisement'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Surface>
        )}

        {/* Modal for Selecting Images */}
        <Modal
          visible={imagePickerVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setImagePickerVisible(false)}
        >
          <View style={styles.imageModalBackdrop}>
            <View style={[styles.imageModal, { backgroundColor: C.card }]}>
              <View style={styles.imageModalHeader}>
                <Text style={[styles.modalTitle, { color: C.text }]}>Select Post Photos</Text>
                <TouchableOpacity onPress={() => setImagePickerVisible(false)}>
                  <MaterialIcons name="close" size={22} color={C.text} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.modalOption, { borderColor: C.cardBorder, backgroundColor: isDark ? '#1A231C' : '#F0FDF4' }]}
                onPress={pickGalleryImages}
              >
                <MaterialIcons name="photo-library" size={24} color={Colors.primary} />
                <Text style={[styles.modalOptionText, { color: C.text }]}>
                  Choose from Phone Gallery
                </Text>
              </TouchableOpacity>

              <Text style={[styles.fieldHint, { color: C.textSecondary, marginTop: 18, marginBottom: 8 }]}>
                Saved Portfolio Photos ({portfolioImages.length})
              </Text>

              <ScrollView style={{ maxHeight: 220 }}>
                {portfolioImages.length === 0 ? (
                  <Text style={{ color: C.textMuted, fontSize: 13, fontStyle: 'italic', paddingVertical: 12 }}>
                    No saved portfolio photos found. Use Phone Gallery above.
                  </Text>
                ) : (
                  <View style={styles.savedImagesGrid}>
                    {portfolioImages.map((image) => {
                      const selected = form.selectedImages.includes(image.uri);
                      return (
                        <TouchableOpacity
                          key={image.id || image.uri}
                          onPress={() => selectPortfolioImage(image)}
                          style={[styles.savedImageWrap, selected && styles.savedImageSelected]}
                        >
                          <Image source={{ uri: image.uri }} style={styles.savedImage} />
                          {selected && (
                            <View style={styles.savedImageCheck}>
                              <MaterialIcons name="check" size={14} color="#fff" />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </ScrollView>

              <TouchableOpacity
                style={[styles.modalCloseButton, { backgroundColor: Colors.primary }]}
                onPress={() => setImagePickerVisible(false)}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '700' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },

  // Edit Mode Indicator
  editModeBanner: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editModeTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  cancelEditText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // Header Banner
  headerGradient: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    overflow: 'hidden',
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },

  // Provider Card
  providerCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  providerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  providerInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '700',
  },
  providerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  providerDetailText: {
    fontSize: 11.5,
  },
  verifiedBadge: {
    padding: 4,
    borderRadius: 12,
  },

  // Form Cards
  formCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrapper: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  input: {
    fontSize: 13.5,
    paddingVertical: 8,
  },
  textArea: {
    minHeight: 65,
    textAlignVertical: 'top',
  },

  // Tags
  tagInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tagInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  tagInput: {
    flex: 1,
    paddingHorizontal: 8,
  },
  addTagButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 11.5,
    fontWeight: '700',
  },

  // Tone Grid
  toneGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toneCard: {
    flexBasis: '31%',
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  toneText: {
    fontSize: 11.5,
  },

  // Language Chips
  languageRow: {
    flexDirection: 'row',
    gap: 8,
  },
  languageChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1.5,
    paddingVertical: 9,
    alignItems: 'center',
  },
  languageChipText: {
    fontSize: 12,
  },

  // Location Row
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  locationButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Photos
  photoHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  addImagesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 12,
  },
  selectedImageWrap: {
    width: 76,
    height: 76,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginRight: 10,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  coverBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
  },

  // Generate Button
  generateButton: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  generateGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '800',
  },

  // Result Card
  resultCard: {
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  resultBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  copyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultTextContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
  },
  resultText: {
    fontSize: 13.5,
    lineHeight: 20,
    minHeight: 120,
  },
  resultButtonRow: {
    flexDirection: 'row',
  },
  savePostBtnWrapper: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  savePostGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  savePostBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },

  // Modal
  imageModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  imageModal: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    maxHeight: '80%',
  },
  imageModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginTop: 6,
  },
  modalOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  fieldHint: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  savedImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  savedImageWrap: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  savedImageSelected: {
    borderColor: Colors.primary,
  },
  savedImage: {
    width: '100%',
    height: '100%',
  },
  savedImageCheck: {
    position: 'absolute',
    top: 3,
    right: 3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButton: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },

  // Penalty Card
  penaltyAlertCard: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  penaltyAlertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  penaltyAlertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  penaltyAlertDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
});
