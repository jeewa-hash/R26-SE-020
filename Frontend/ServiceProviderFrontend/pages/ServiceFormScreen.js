import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Text, TextInput as PaperInput, Chip, Button } from 'react-native-paper';
import { MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { CONFIG } from '../config';
import { Colors } from '../theme';
import { servicesAPI } from '../services/api';
import { usePortfolio } from '../context/PortfolioContext';
import AIProcessingModal from '../components/portfolio/AIProcessingModal';

const isMongoObjectId = (val) => /^[0-9a-fA-F]{24}$/.test(String(val || ''));

const resolveImageUrl = (raw) => {
  if (!raw) return null;
  const str = typeof raw === 'string' ? raw : (raw.url || raw.image_url || raw.uri || '');
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('file://') || str.startsWith('data:')) {
    return str;
  }
  if (str.startsWith('/uploads/')) return `${CONFIG.ML_SERVICE_URL}${str}`;
  return str;
};

const normalizeFormImages = (imgs, fallbackName = '', fallbackTags = []) => {
  if (!Array.isArray(imgs)) return [];
  return imgs.map((item, idx) => {
    if (typeof item === 'string') {
      return {
        id: `img_${idx}_${Date.now()}`,
        url: item,
        uri: resolveImageUrl(item),
        isAiAnalyzed: false,
        confidence: 0,
        tags: Array.isArray(fallbackTags) ? fallbackTags : [],
        label: fallbackName || 'Service Work',
        specificLabel: fallbackName || 'Service Work',
      };
    }
    const rawUrl = item.url || item.image_url || item.uri || '';
    return {
      id: item.id || `img_${idx}_${Date.now()}`,
      url: rawUrl,
      uri: resolveImageUrl(rawUrl),
      isAiAnalyzed: Boolean(item.isAiAnalyzed ?? item.ai_analyzed),
      confidence: Number(item.confidence) || 0,
      tags: Array.isArray(item.tags) ? item.tags : (Array.isArray(fallbackTags) ? fallbackTags : []),
      label: item.label || fallbackName || 'Service Work',
      specificLabel: item.specificLabel || item.specific_label || item.label || fallbackName || 'Service Work',
      uploadedAt: item.uploadedAt || new Date().toISOString(),
    };
  });
};

const CATEGORY_OPTIONS = [
  { label: 'Plumbing', value: 'plumbing', group: 'plumbing', icon: 'plumbing', color: '#15803D' },
  { label: 'Electrical', value: 'electrical', group: 'electrical', icon: 'electrical-services', color: '#F59E0B' },
  { label: 'Carpentry', value: 'carpentry', group: 'carpentry', icon: 'handyman', color: '#166534' },
  { label: 'Cleaning', value: 'cleaning', group: 'cleaning', icon: 'cleaning-services', color: '#059669' },
  { label: 'Planting / Gardening', value: 'planting', group: 'planting', icon: 'local-florist', color: '#15803D' },
  { label: 'Painting', value: 'painting', group: 'painting', icon: 'format-paint', color: '#DC2626' },
  { label: 'Roofing', value: 'roofing', group: 'roofing', icon: 'home-repair-service', color: '#0284C7' },
  { label: 'Repairing & Handyman', value: 'repairing', group: 'repairing', icon: 'build', color: '#D97706' },
  { label: 'Home Service', value: 'home service', group: 'other', icon: 'home', color: '#4F46E5' },
  { label: 'Other', value: 'other', group: 'other', icon: 'handyman', color: '#6B7280' },
];

const PRICE_UNIT_OPTIONS = [
  { label: 'Per Hour', value: 'hour' },
  { label: 'Per Day', value: 'day' },
  { label: 'Per Job', value: 'job' },
  { label: 'Per Sq Ft', value: 'sqft' },
  { label: 'Per Item', value: 'item' },
];

export default function ServiceFormScreen({ navigation, route }) {
  const { t, i18n } = useTranslation();
  const { isDark } = useContext(ThemeContext);
  const { portfolioImages = [], deleteImage: deletePortfolioImage } = usePortfolio() || {};

  const rawServiceId = route.params?.serviceId;
  const isEditMode = isMongoObjectId(rawServiceId);
  const routeService = route.params?.service || null;

  const [form, setForm] = useState({
    name: routeService?.name || routeService?.title || route.params?.serviceName || '',
    description: routeService?.description || '',
    category: routeService?.category || route.params?.category || 'home service',
    basePrice: routeService?.basePrice ? String(routeService.basePrice) : '',
    priceUnit: routeService?.priceUnit || 'job',
    tags: routeService?.tags || [],
    images: normalizeFormImages(routeService?.images || [], routeService?.name, routeService?.tags),
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiLanguage, setAiLanguage] = useState(i18n.language || 'en');
  const [imageAnalysisMode, setImageAnalysisMode] = useState('ml');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);

  // Category selection & auto-detection state
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [userLockedCategory, setUserLockedCategory] = useState(false);
  const [autoDetectedBadge, setAutoDetectedBadge] = useState(null);
  const [nameSuggestion, setNameSuggestion] = useState(null);
  const [nameSuggestionLoading, setNameSuggestionLoading] = useState(false);

  const [availability, setAvailability] = useState({
    checking: false,
    available: null,
    message: '',
    existingService: null,
  });

  const C = isDark
    ? {
        bg: '#0C0F0D',
        card: '#161C18',
        cardAlt: '#1B241F',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#303C33',
        inputBg: '#303C33',
        subCard: '#1F2922',
        accent: '#86C99A',
      }
    : {
        bg: '#F5FAF6',
        card: '#FFFFFF',
        cardAlt: '#F9FCFA',
        text: '#111111',
        textSub: '#6B7280',
        border: '#D8E8DC',
        inputBg: '#FFFFFF',
        subCard: '#F0FDF4',
        accent: '#15803D',
      };

  const selectedCategory =
    CATEGORY_OPTIONS.find((c) => c.value === form.category) ||
    CATEGORY_OPTIONS.find((c) => c.group === form.category) ||
    CATEGORY_OPTIONS[CATEGORY_OPTIONS.length - 2];

  const fetchServiceForEdit = useCallback(async () => {
    if (!isEditMode || !rawServiceId) return;
    try {
      setLoading(true);
      const response = await servicesAPI.getServiceById(rawServiceId);
      const svc = response.data?.data;
      if (response.data?.success && svc) {
        setForm({
          name: svc.name || '',
          description: svc.description || '',
          category: svc.category || 'home service',
          basePrice: svc.basePrice ? String(svc.basePrice) : '',
          priceUnit: svc.priceUnit || 'job',
          tags: svc.tags || [],
          images: normalizeFormImages(svc.images || [], svc.name, svc.tags),
        });
        setUserLockedCategory(true);
      } else {
        throw new Error(response.data?.message || 'Service not found');
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to load service data');
    } finally {
      setLoading(false);
    }
  }, [isEditMode, rawServiceId]);

  useEffect(() => {
    fetchServiceForEdit();
  }, [fetchServiceForEdit]);

  // If passed autoGenerate flag from detail screen, run AI generation once
  const autoGeneratedOnMountRef = useRef(false);
  useEffect(() => {
    if (route.params?.autoGenerate && !autoGeneratedOnMountRef.current && !form.description) {
      autoGeneratedOnMountRef.current = true;
      handleAutoGenerateAI(i18n.language || 'en');
    }
  }, []);

  const checkAvailabilityDebounceRef = useRef(null);

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
        const response = await servicesAPI.checkAvailability(form.name);
        const data = response.data;
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

  // Service Name Change with Category Auto-detection
  const handleNameChange = (val) => {
    updateField('name', val);
    setNameSuggestion(null);
    if (!userLockedCategory) setAutoDetectedBadge(null);
  };

  const handleSuggestProfessionalName = async () => {
    const enteredName = form.name.trim();
    if (enteredName.length < 2 || isEditMode) return;
    try {
      setNameSuggestionLoading(true);
      const response = await servicesAPI.generateAiDetails({
        name: enteredName,
        category: form.category,
        categoryGroup: selectedCategory.group,
      });
      const suggestion = response.data?.data;
      if (!suggestion?.name) return;

      const suggestedCategory = suggestion.categoryGroup || suggestion.category;
      const categoryMatch = CATEGORY_OPTIONS.find(
        (item) => item.value === suggestedCategory || item.group === suggestedCategory
      );
      if (!userLockedCategory && categoryMatch) {
        updateField('category', categoryMatch.value);
        setAutoDetectedBadge(categoryMatch.label);
      }
      if (suggestion.name.trim().toLowerCase() !== enteredName.toLowerCase()) {
        setNameSuggestion(suggestion.name.trim());
      }
    } catch (err) {
      console.log('Professional name suggestion failed:', err.message);
    } finally {
      setNameSuggestionLoading(false);
    }
  };

  const useProfessionalName = (mode) => {
    const professionalName = nameSuggestion;
    if (!professionalName) return;
    if (mode === 'professional') updateField('name', professionalName);
    if (mode === 'both') updateField('name', `${form.name.trim()} - ${professionalName}`);
    setNameSuggestion(null);
  };

  // Manual Trigger for Category Auto-Detection
  const handleTriggerAutoDetect = () => {
    if (!form.name.trim()) {
      Alert.alert(
        t('serviceName', 'Service Name'),
        'Please enter a service name first so AI can detect the matching category.'
      );
      return;
    }
    setUserLockedCategory(false);
    handleSuggestProfessionalName();
  };

  // User manually selects category
  const handleSelectCategory = (catValue) => {
    setUserLockedCategory(true);
    setAutoDetectedBadge(null);
    updateField('category', catValue);
    setCategoryModalVisible(false);
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

  const handlePickImage = () => {
    Alert.alert(
      'Add Service Photo',
      'Select how you would like to add this photo to your service:',
      [
        {
          text: '✨ Analyze with AI Vision',
          onPress: () => promptMediaSource(true),
        },
        {
          text: '📷 Direct Upload (No AI)',
          onPress: () => promptMediaSource(false),
        },
        {
          text: '📂 From My Portfolio',
          onPress: addPortfolioImages,
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const promptMediaSource = (analyzeWithMl) => {
    Alert.alert(
      analyzeWithMl ? '✨ AI Analyzer Photo' : '📷 Direct Photo Upload',
      'Choose image source:',
      [
        {
          text: 'Take Photo',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission Denied', 'Camera permission required.');
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.85,
            });
            if (!result.canceled && result.assets?.[0]) {
              await addServiceImage(result.assets[0], analyzeWithMl);
            }
          },
        },
        {
          text: 'Choose from Gallery',
          onPress: async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') return Alert.alert('Permission Denied', 'Gallery permission required.');
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: true,
              quality: 0.85,
            });
            if (!result.canceled && result.assets?.[0]) {
              await addServiceImage(result.assets[0], analyzeWithMl);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const addServiceImage = async (asset, analyzeWithMl) => {
    const localUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
    setAiProcessing(true);
    setAiProgress(20);
    const progressTimer = setInterval(() => setAiProgress((value) => Math.min(value + 12, 90)), 300);

    try {
      const formData = new FormData();
      formData.append('images', {
        uri: asset.uri,
        name: asset.fileName || 'service_photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      formData.append('analyze', analyzeWithMl ? 'true' : 'false');
      formData.append('service_name', form.name || '');
      formData.append('category', form.category || '');
      formData.append('category_group', selectedCategory?.group || '');
      formData.append('tags', JSON.stringify(form.tags || []));

      let savedData = null;
      try {
        const uploadRes = await servicesAPI.uploadServiceImage(formData);
        if (uploadRes?.images && uploadRes.images.length > 0) {
          savedData = uploadRes.images[0];
        }
      } catch (uploadErr) {
        console.log('Upload image API error:', uploadErr.message);
      }

      const isAi = Boolean(analyzeWithMl && (savedData?.isAiAnalyzed || savedData?.confidence > 0));
      const newImgItem = {
        id: savedData?.id || `img_${Date.now()}_${Math.random()}`,
        // The upload endpoint creates a portfolio item immediately. Keep this
        // flag so removing the image before saving the service can roll that
        // portfolio item back as well.
        portfolioPersisted: Boolean(savedData?.id),
        url: savedData?.url || savedData?.image_url || localUri,
        uri: resolveImageUrl(savedData?.url || savedData?.image_url || localUri),
        isAiAnalyzed: isAi,
        confidence: savedData?.confidence || 0,
        tags: savedData?.tags || form.tags || [],
        label: savedData?.label || form.name || 'Service Work',
        specificLabel: savedData?.specific_label || '',
        uploadedAt: new Date().toISOString(),
      };

      if (isAi && savedData) {
        if (savedData.label && !form.name.trim()) {
          updateField('name', savedData.label);
        }
        if (Array.isArray(savedData.tags) && savedData.tags.length > 0) {
          updateField('tags', Array.from(new Set([...(form.tags || []), ...savedData.tags])));
        }
        setAutoDetectedBadge(savedData.specific_label || savedData.label || 'AI Verified');
      }

      setForm((prev) => ({
        ...prev,
        images: [...(prev.images || []), newImgItem],
      }));

      Alert.alert(
        isAi ? 'AI Analyzed & Saved ✨' : 'Photo Added 📷',
        isAi
          ? `Work detected as "${savedData?.specific_label || savedData?.label || 'Service'}" (${Math.round(savedData?.confidence || 90)}% confidence). Skills auto-tagged and saved to portfolio!`
          : 'Service photo added directly and saved to your portfolio.'
      );
    } catch (err) {
      console.log('addServiceImage error:', err);
      const fallbackItem = {
        id: `img_${Date.now()}_${Math.random()}`,
        portfolioPersisted: false,
        url: localUri,
        uri: localUri,
        isAiAnalyzed: analyzeWithMl,
        confidence: 0,
        tags: form.tags || [],
        label: form.name || 'Service Work',
        uploadedAt: new Date().toISOString(),
      };
      setForm((prev) => ({ ...prev, images: [...(prev.images || []), fallbackItem] }));
    } finally {
      clearInterval(progressTimer);
      setAiProgress(100);
      setTimeout(() => setAiProcessing(false), 300);
    }
  };

  const addPortfolioImages = () => {
    if (!portfolioImages || portfolioImages.length === 0) {
      Alert.alert('No Portfolio Photos', 'Your portfolio has no uploaded photos yet. Take or choose photos to add.');
      return;
    }
    const currentUrls = new Set(
      (form.images || []).map((img) => (typeof img === 'string' ? img : img.url || img.uri))
    );
    const newItems = portfolioImages
      .filter((p) => !currentUrls.has(p.image_url) && !currentUrls.has(p.uri))
      .map((p) => ({
        id: p.id,
        url: p.image_url || p.uri,
        uri: resolveImageUrl(p.uri || p.image_url),
        isAiAnalyzed: Boolean(p.ai_analyzed || p.isAiAnalyzed || p.confidence > 0),
        confidence: p.confidence || 0,
        tags: p.tags || [],
        label: p.label || form.name || 'Service Work',
        specificLabel: p.specific_label || '',
        uploadedAt: p.uploadedAt || new Date().toISOString(),
      }));

    if (newItems.length === 0) {
      Alert.alert('Already Added', 'All portfolio photos are already attached to this service.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      images: [...(prev.images || []), ...newItems],
    }));
    Alert.alert('Success', `Imported ${newItems.length} photo(s) from your portfolio.`);
  };

  const handleRemoveImage = async (index) => {
    const removedImage = (form.images || [])[index];
    setForm((prev) => {
      return {
        ...prev,
        images: (prev.images || []).filter((_, i) => i !== index),
      };
    });

    // AI/direct uploads are persisted by /portfolio/upload-image before the
    // service form is submitted. Delete that portfolio record when the user
    // removes the image from the analyzer preview.
    if (removedImage?.portfolioPersisted && removedImage.id && deletePortfolioImage) {
      await deletePortfolioImage(removedImage.id);
    }
  };

  // AI Gemini Auto-Generation with Multi-Language Support
  const handleAutoGenerateAI = async (langOverride) => {
    const langToUse = langOverride || aiLanguage || i18n.language || 'en';
    try {
      setAiGenerating(true);
      const nameToUse = form.name.trim() || route.params?.serviceName || route.params?.category || selectedCategory.label || 'Home Service';
      const categoryToUse = form.category || 'home service';
      const groupToUse = selectedCategory.group || 'other';

      let data = null;
      try {
        const res = await servicesAPI.generateAiDetails({
          name: nameToUse,
          category: categoryToUse,
          categoryGroup: groupToUse,
          language: langToUse,
        });
        if (res.data?.success && res.data?.data) {
          data = res.data.data;
        }
      } catch (e) {
        console.log('AI generate error in form, using localized fallback:', e?.message);
      }

      if (!data) {
        if (langToUse === 'si') {
          data = {
            name: nameToUse,
            description: `විශ්වාසනීය සහ උසස් ප්‍රමිතියෙන් යුත් ${nameToUse} සේවාව. පළපුරුදු වෘත්තීය ශිල්පීන්, නවීන උපකරණ සහ ආරක්ෂිත ක්‍රමවේද භාවිතයෙන් කඩිනමින් සිදු කරනු ලැබේ. සාධාරණ මිල ගණන් සහ පාරිභෝගික තෘප්තිය 100% සහතිකයි.`,
            basePrice: form.basePrice ? Number(form.basePrice) : 2500,
            priceUnit: form.priceUnit || 'job',
            tags: ['විශ්වාසනීය සේවාව', 'පළපුරුදු ශිල්පීන්', 'කඩිනම් සේවය', 'සාධාරණ මිල', 'පාරිභෝගික තෘප්තිය', 'ගුණාත්මක නිමාව'],
          };
        } else if (langToUse === 'ta') {
          data = {
            name: nameToUse,
            description: `உயர்தர மற்றும் நம்பகமான ${nameToUse} சேவை. அனுபவம் வாய்ந்த பணியாளர்கள், நவீன உபகரணங்கள் மற்றும் நியாயமான கட்டணத்துடன் உங்கள் திருப்தியை முழுமையாக உறுதி செய்கிறோம். தரமான மற்றும் விரைவான சேவை.`,
            basePrice: form.basePrice ? Number(form.basePrice) : 2500,
            priceUnit: form.priceUnit || 'job',
            tags: ['உயர்தர சேவை', 'அனுபவமிக்க பணியாளர்கள்', 'விரைவான சேவை', 'நியாயமான கட்டணம்', 'நம்பகமானது', 'முழு திருப்தி'],
          };
        } else {
          data = {
            name: nameToUse,
            description: `Comprehensive and professional ${nameToUse} tailored to deliver exceptional quality. We use modern equipment and industry-approved standards to ensure lasting, dependable results. We provide transparent pricing and complete customer satisfaction guarantee.`,
            basePrice: form.basePrice ? Number(form.basePrice) : 2500,
            priceUnit: form.priceUnit || 'job',
            tags: ['Quality Guaranteed', 'Experienced Staff', 'Fast Turnaround', 'Clean & Reliable', 'Satisfaction Guaranteed'],
          };
        }
      }

      setForm((prev) => ({
        ...prev,
        name: prev.name.trim() ? prev.name : data.name,
        description: data.description || prev.description,
        basePrice: prev.basePrice ? prev.basePrice : String(data.basePrice || 2500),
        priceUnit: data.priceUnit || prev.priceUnit,
        tags: Array.from(new Set([...(prev.tags || []), ...(data.tags || [])])),
      }));

      Alert.alert(
        'AI Generated ✨',
        langToUse === 'si'
          ? 'Gemini AI මඟින් සිංහලෙන් සේවා විස්තරය, මිල ගණන් සහ ටැග් සාර්ථකව සම්පාදනය විය!'
          : langToUse === 'ta'
          ? 'Gemini AI மூலம் தமிழில் சேவை விளக்கம், விலை மற்றும் குறிச்சொற்கள் வெற்றிகரமாக நிரப்பப்பட்டன!'
          : 'Service description, suggested pricing, and skills have been populated using Gemini AI!'
      );
    } catch (err) {
      Alert.alert('Error', 'Unable to auto-generate details with AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  const validate = () => {
    if (!form.name.trim()) {
      Alert.alert(t('serviceName', 'Service Name'), 'Service name is required');
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
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        categoryGroup: selectedCategory.group,
        basePrice: form.basePrice ? Number(form.basePrice) : 0,
        priceUnit: form.priceUnit,
        images: (form.images || []).map((img) => {
          if (typeof img === 'string') {
            return {
              url: img,
              isAiAnalyzed: false,
              confidence: 0,
              tags: form.tags || [],
              label: form.name.trim(),
            };
          }
          return {
            url: img.url || img.image_url || img.uri,
            isAiAnalyzed: Boolean(img.isAiAnalyzed ?? img.ai_analyzed),
            confidence: Number(img.confidence) || 0,
            tags: Array.isArray(img.tags) && img.tags.length > 0 ? img.tags : form.tags,
            label: img.label || form.name.trim(),
            specificLabel: img.specificLabel || img.specific_label || '',
            category: img.category || form.category,
            uploadedAt: img.uploadedAt || new Date().toISOString(),
          };
        }),
      };

      const response = isEditMode
        ? await servicesAPI.updateService(rawServiceId, payload)
        : await servicesAPI.createService(payload);
      const data = response.data;

      if (data.error === 'DUPLICATE_SERVICE') {
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
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to save service');
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
        {/* Header Preview Card */}
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
              {form.name.trim() || t('serviceName', 'Service Name')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <Text style={[styles.previewCategory, { color: selectedCategory.color }]}>
                {selectedCategory.label}
              </Text>
              {autoDetectedBadge && (
                <View style={styles.previewAutoBadge}>
                  <Text style={styles.previewAutoBadgeText}>✨ Auto</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── STEP 1: CATEGORY SELECTION (FIRST) ── */}
        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="category" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('category', 'Category')}</Text>
            {autoDetectedBadge && (
              <View style={[styles.autoDetectedBadge, { backgroundColor: isDark ? '#1C3829' : '#DCFCE7' }]}>
                <MaterialIcons name="auto-awesome" size={12} color="#16A34A" />
                <Text style={styles.autoDetectedBadgeText}>
                  {t('autoDetected', 'Auto-detected')}: {autoDetectedBadge}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.fieldHint, { color: C.textSub, marginBottom: 10 }]}>
            Select the category from the dropdown or pick from quick categories below:
          </Text>

          {/* Interactive Category Dropdown Trigger */}
          <TouchableOpacity
            style={[
              styles.categoryDropdownTrigger,
              {
                backgroundColor: C.inputBg,
                borderColor: autoDetectedBadge ? '#16A34A' : C.border,
                borderWidth: autoDetectedBadge ? 1.5 : 1,
              },
            ]}
            onPress={() => setCategoryModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.categoryDropdownLeft}>
              <View style={[styles.categoryDropdownIcon, { backgroundColor: selectedCategory.color + '20' }]}>
                <MaterialIcons name={selectedCategory.icon} size={22} color={selectedCategory.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.categoryDropdownLabel, { color: C.text }]}>
                  {selectedCategory.label}
                </Text>
                <Text style={[styles.categoryDropdownGroup, { color: C.textSub }]}>
                  {selectedCategory.group.toUpperCase()} • Tap to browse all categories
                </Text>
              </View>
            </View>
            <MaterialIcons name="keyboard-arrow-down" size={24} color={C.textSub} />
          </TouchableOpacity>

          {/* Quick Category Selection Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryPillsScroll}
          >
            {CATEGORY_OPTIONS.map((cat) => {
              const isSelected = form.category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: isSelected ? cat.color : (isDark ? '#202A23' : '#F1F5F9'),
                      borderColor: isSelected ? cat.color : C.border,
                    },
                  ]}
                  onPress={() => handleSelectCategory(cat.value)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={cat.icon}
                    size={14}
                    color={isSelected ? '#FFFFFF' : cat.color}
                  />
                  <Text
                    style={[
                      styles.categoryPillText,
                      { color: isSelected ? '#FFFFFF' : C.text, fontWeight: isSelected ? '700' : '600' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── STEP 2: SERVICE NAME & DETAILS ── */}
        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="badge" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>Service Name & Auto-Detection</Text>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRowWithAi}>
              <Text style={[styles.label, { color: C.text }]}>
                {t('serviceName', 'Service Name')} <Text style={{ color: '#DC2626' }}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.autoDetectBtn, { backgroundColor: isDark ? '#1C3829' : '#DCFCE7' }]}
                onPress={handleTriggerAutoDetect}
                activeOpacity={0.8}
              >
                <MaterialIcons name="auto-awesome" size={13} color="#16A34A" />
                <Text style={styles.autoDetectBtnText}>Auto-detect Category</Text>
              </TouchableOpacity>
            </View>

            <PaperInput
              mode="outlined"
              placeholder={t('enterServiceName', 'e.g. Bathroom Plumbing Repair, Garden Lawn Mowing')}
              value={form.name}
              onChangeText={handleNameChange}
              onBlur={handleSuggestProfessionalName}
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
            {nameSuggestionLoading && (
              <View style={styles.nameSuggestionLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={[styles.fieldHint, { color: C.textSub }]}>Finding a professional name and category...</Text>
              </View>
            )}
            {nameSuggestion && !nameSuggestionLoading && (
              <View style={[styles.nameSuggestionCard, { backgroundColor: C.subCard, borderColor: C.border }]}>
                <MaterialIcons name="auto-awesome" size={18} color={Colors.primary} />
                <View style={styles.nameSuggestionContent}>
                  <Text style={[styles.fieldHint, { color: C.textSub }]}>Professional name suggestion</Text>
                  <Text style={[styles.nameSuggestionText, { color: C.text }]}>{nameSuggestion}</Text>
                  <View style={styles.nameSuggestionActions}>
                    <TouchableOpacity onPress={() => useProfessionalName('professional')} style={styles.nameSuggestionButton}>
                      <Text style={styles.nameSuggestionButtonText}>Use Professional</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => useProfessionalName('both')} style={styles.nameSuggestionButton}>
                      <Text style={styles.nameSuggestionButtonText}>Use Both</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setNameSuggestion(null)} style={styles.nameSuggestionReject}>
                      <Text style={styles.nameSuggestionRejectText}>Keep Mine</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
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

            <Text style={[styles.fieldHint, { color: C.textSub, marginTop: 6 }]}>
              💡 Type a descriptive name (e.g., Pipe Repair, Sofa Cleaning, Grass Cutting) and we will automatically detect the category!
            </Text>
          </View>
        </View>

        {/* ── STEP 3: DESCRIPTION WITH MULTI-LANGUAGE AI GENERATOR ── */}
        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="description" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('description', 'Description')}</Text>
          </View>

          {/* AI Language Selection Bar */}
          <View style={[styles.aiLangBar, { backgroundColor: C.subCard, borderColor: C.border }]}>
            <View style={styles.aiLangBarLeft}>
              <MaterialIcons name="translate" size={16} color={selectedCategory.color} />
              <Text style={[styles.aiLangBarLabel, { color: C.text }]}>AI Language:</Text>
            </View>
            <View style={styles.aiLangPills}>
              {[
                { code: 'en', label: 'English', flag: '🇬🇧' },
                { code: 'si', label: 'සිංහල', flag: '🇱🇰' },
                { code: 'ta', label: 'தமிழ்', flag: '🇱🇰' },
              ].map((item) => {
                const active = aiLanguage === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.aiLangPill,
                      {
                        backgroundColor: active ? selectedCategory.color : (isDark ? '#202A23' : '#FFFFFF'),
                        borderColor: active ? selectedCategory.color : C.border,
                      },
                    ]}
                    onPress={() => {
                      setAiLanguage(item.code);
                      handleAutoGenerateAI(item.code);
                    }}
                    activeOpacity={0.8}
                    disabled={aiGenerating}
                  >
                    <Text style={{ fontSize: 11 }}>{item.flag}</Text>
                    <Text
                      style={[
                        styles.aiLangPillText,
                        { color: active ? '#FFFFFF' : C.text, fontWeight: active ? '700' : '600' },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRowWithAi}>
              <Text style={[styles.label, { color: C.text }]}>{t('description', 'Description')}</Text>
              <TouchableOpacity
                style={[styles.aiGenerateBtn, { backgroundColor: isDark ? '#1C3829' : '#DCFCE7' }]}
                onPress={() => handleAutoGenerateAI(aiLanguage)}
                disabled={aiGenerating}
                activeOpacity={0.8}
              >
                {aiGenerating ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={14} color={Colors.primary} />
                    <Text style={[styles.aiGenerateBtnText, { color: Colors.primary }]}>
                      {t('autoGenerateAI', 'Auto-Generate with AI Gemini')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

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

        {/* ── STEP 4: PRICING ── */}
        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="attach-money" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('pricing', 'Pricing')}</Text>
          </View>

          <View style={styles.pricingRow}>
            <View style={[styles.formGroup, styles.priceField]}>
              <Text style={[styles.label, { color: C.text }]}>{t('basePrice', 'Base Price (LKR)')}</Text>
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
              <Text style={[styles.label, { color: C.text }]}>{t('priceUnit', 'Unit')}</Text>
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

        {/* ── STEP 5: TAGS & SKILLS ── */}
        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="label" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('tags', 'Tags & Skills')}</Text>
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

        {/* ── STEP 6: SERVICE PHOTOS / GALLERY ── */}
        <View style={[styles.formSection, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.sectionHeader}>
            <MaterialIcons name="photo-library" size={18} color={Colors.primary} />
            <Text style={[styles.sectionTitle, { color: C.text }]}>{t('servicePhotos', 'Service Photos & Interest Images')}</Text>
            <Text style={[styles.tagCounter, { color: C.textSub }]}>{(form.images || []).length} photos</Text>
          </View>

          <Text style={[styles.fieldHint, { color: C.textSub, marginBottom: 12 }]}>
            Upload visual work photos to showcase in this service and sync with your portfolio.
          </Text>

          {/* AI Mode Selector Banner */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: C.inputBg,
              borderRadius: 14,
              padding: 4,
              borderWidth: 1,
              borderColor: C.border,
              marginBottom: 14,
            }}
          >
            <TouchableOpacity
              onPress={() => setImageAnalysisMode('ml')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: imageAnalysisMode === 'ml' ? '#15803D' : 'transparent',
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="auto-awesome"
                size={16}
                color={imageAnalysisMode === 'ml' ? '#FFFFFF' : '#15803D'}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: imageAnalysisMode === 'ml' ? '#FFFFFF' : C.text,
                }}
              >
                AI Vision Analyzer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setImageAnalysisMode('image')}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 10,
                borderRadius: 10,
                backgroundColor: imageAnalysisMode === 'image' ? (isDark ? '#303C33' : '#3B82F6') : 'transparent',
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="photo-camera"
                size={16}
                color={imageAnalysisMode === 'image' ? '#FFFFFF' : C.textSub}
              />
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '700',
                  color: imageAnalysisMode === 'image' ? '#FFFFFF' : C.textSub,
                }}
              >
                Direct Upload
              </Text>
            </TouchableOpacity>
          </View>

          {portfolioImages.length > 0 && (
            <TouchableOpacity
              onPress={addPortfolioImages}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                marginBottom: 14,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: isDark ? '#1F2922' : '#F0FDF4',
                borderWidth: 1,
                borderColor: isDark ? '#303C33' : '#BBF7D0',
                alignSelf: 'flex-start',
              }}
              activeOpacity={0.8}
            >
              <MaterialIcons name="photo-library" size={16} color="#15803D" />
              <Text style={{ color: '#15803D', fontSize: 12, fontWeight: '700' }}>
                Import from Portfolio ({portfolioImages.length} available)
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.formImagesRow}>
            {(form.images || []).map((imgItem, idx) => {
              const displayUri = typeof imgItem === 'string' ? resolveImageUrl(imgItem) : (imgItem.uri || resolveImageUrl(imgItem.url));
              const isAi = typeof imgItem === 'object' ? Boolean(imgItem.isAiAnalyzed || imgItem.ai_analyzed) : false;
              const conf = typeof imgItem === 'object' ? Math.round(Number(imgItem.confidence) || 0) : 0;

              return (
                <View key={`${displayUri}-${idx}`} style={[styles.formThumbWrap, { borderColor: C.border }]}>
                  <Image source={{ uri: displayUri }} style={styles.formThumb} resizeMode="cover" />

                  {/* AI vs Direct status pill on thumbnail */}
                  <View
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 2,
                      backgroundColor: isAi ? 'rgba(21, 128, 61, 0.92)' : 'rgba(30, 41, 59, 0.88)',
                      paddingHorizontal: 5,
                      paddingVertical: 2,
                      borderRadius: 6,
                    }}
                  >
                    <MaterialIcons
                      name={isAi ? 'auto-awesome' : 'photo-camera'}
                      size={9}
                      color="#FFFFFF"
                    />
                    <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '800' }}>
                      {isAi ? (conf > 0 ? `${conf}%` : 'AI') : 'Direct'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.formRemovePhotoBtn}
                    onPress={() => handleRemoveImage(idx)}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="close" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              );
            })}

            <TouchableOpacity
              style={[
                styles.formAddPhotoBtn,
                {
                  borderColor: imageAnalysisMode === 'ml' ? '#15803D' : C.border,
                  backgroundColor: isDark ? '#161C18' : '#F9FCFA',
                },
              ]}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name={imageAnalysisMode === 'ml' ? 'add-a-photo' : 'camera-alt'}
                size={22}
                color={imageAnalysisMode === 'ml' ? '#15803D' : Colors.primary}
              />
              <Text
                style={[
                  styles.formAddPhotoText,
                  { color: imageAnalysisMode === 'ml' ? '#15803D' : Colors.primary },
                ]}
              >
                {imageAnalysisMode === 'ml' ? '+ AI Photo' : '+ Direct Photo'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      <AIProcessingModal
        visible={aiProcessing}
        progress={aiProgress}
        imageCount={1}
        onCancel={() => setAiProcessing(false)}
      />

      {/* ── BOTTOM ACTION BAR ── */}
      <View style={[styles.bottomBar, { backgroundColor: C.card, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.secondaryBtn, { borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          disabled={submitLoading}
        >
          <Text style={[styles.secondaryBtnText, { color: C.textSub }]}>{t('cancel', 'Cancel')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: Colors.primary }]}
          onPress={handleSubmit}
          disabled={submitLoading}
          activeOpacity={0.85}
        >
          {submitLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name={isEditMode ? 'save' : 'check'} size={20} color="#fff" />
              <Text style={styles.primaryBtnText}>
                {isEditMode ? t('saveChanges', 'Save Changes') : t('createService', 'Create Service')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ── CATEGORY SELECTION MODAL ── */}
      <Modal
        visible={categoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View
            style={[styles.modalSheet, { backgroundColor: C.card, borderColor: C.border }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <MaterialIcons name="category" size={22} color={Colors.primary} />
                <Text style={[styles.modalTitle, { color: C.text }]}>{t('selectCategory', 'Select Category')}</Text>
              </View>
              <TouchableOpacity
                onPress={() => setCategoryModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={C.textSub} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalSubtitle, { color: C.textSub }]}>
              Choose the category that best matches your service. You can also type the service name to auto-detect!
            </Text>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = form.category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.modalCategoryItem,
                      {
                        backgroundColor: isSelected ? cat.color + '14' : C.inputBg,
                        borderColor: isSelected ? cat.color : C.border,
                        borderWidth: isSelected ? 1.5 : 0.5,
                      },
                    ]}
                    onPress={() => handleSelectCategory(cat.value)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.modalCategoryIcon, { backgroundColor: cat.color + '20' }]}>
                      <MaterialIcons name={cat.icon} size={22} color={cat.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalCategoryName, { color: C.text, fontWeight: isSelected ? '700' : '600' }]}>
                        {cat.label}
                      </Text>
                      <Text style={[styles.modalCategoryGroup, { color: C.textSub }]}>
                        {cat.group.toUpperCase()}
                      </Text>
                    </View>
                    {isSelected && (
                      <MaterialIcons name="check-circle" size={22} color={cat.color} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
    width: 60,
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 17,
    fontWeight: '700',
  },
  previewCategory: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewAutoBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  previewAutoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#166534',
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
    marginBottom: 12,
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
  fieldHint: {
    fontSize: 12,
    lineHeight: 18,
  },

  autoDetectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  autoDetectedBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  nameSuggestionLoading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  nameSuggestionCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  nameSuggestionContent: { flex: 1 },
  nameSuggestionText: { fontSize: 14, fontWeight: '700', marginTop: 3 },
  nameSuggestionActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  nameSuggestionButton: { backgroundColor: '#15803D', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  nameSuggestionButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  nameSuggestionReject: { borderColor: '#94A3B8', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  nameSuggestionRejectText: { color: '#64748B', fontSize: 11, fontWeight: '700' },

  categoryDropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  categoryDropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  categoryDropdownIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryDropdownLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  categoryDropdownGroup: {
    fontSize: 11,
    marginTop: 2,
  },

  categoryPillsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  categoryPillText: {
    fontSize: 12,
  },

  formGroup: {
    marginBottom: 10,
  },
  labelRowWithAi: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  autoDetectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  autoDetectBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },

  aiLangBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0.5,
    marginBottom: 12,
    gap: 6,
  },
  aiLangBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiLangBarLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  aiLangPills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  aiLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  aiLangPillText: {
    fontSize: 11,
  },

  aiGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiGenerateBtnText: {
    fontSize: 11,
    fontWeight: '700',
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

  formImagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 4,
  },
  formThumbWrap: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  formThumb: {
    width: '100%',
    height: '100%',
  },
  formRemovePhotoBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formAddPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  formAddPhotoText: {
    fontSize: 10,
    fontWeight: '700',
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

  /* Category Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 12,
  },
  modalSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  modalCategoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCategoryName: {
    fontSize: 14,
  },
  modalCategoryGroup: {
    fontSize: 10,
    marginTop: 2,
  },
});
