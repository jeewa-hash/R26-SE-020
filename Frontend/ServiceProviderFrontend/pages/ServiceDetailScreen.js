import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  Dimensions,
  Modal,
  StatusBar,
  Share,
} from 'react-native';
import { Text, Switch, Divider } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeContext } from '../context/ThemeContext';
import { usePortfolio } from '../context/PortfolioContext';
import { CONFIG } from '../config';
import { Colors } from '../theme';
import { servicesAPI } from '../services/api';
import AIProcessingModal from '../components/portfolio/AIProcessingModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_META = {
  plumbing:   { icon: 'plumbing',            color: '#15803D', label: 'Plumbing' },
  electrical: { icon: 'electrical-services', color: '#F59E0B', label: 'Electrical' },
  carpentry:  { icon: 'handyman',            color: '#166534', label: 'Carpentry' },
  cleaning:   { icon: 'cleaning-services',   color: '#059669', label: 'Cleaning' },
  painting:   { icon: 'format-paint',        color: '#DC2626', label: 'Painting' },
  roofing:    { icon: 'home-repair-service', color: '#0284C7', label: 'Roofing' },
  planting:   { icon: 'local-florist',       color: '#15803D', label: 'Gardening / Planting' },
  gardening:  { icon: 'yard',                color: '#16A34A', label: 'Gardening' },
  repairing:  { icon: 'build',               color: '#D97706', label: 'Repairing' },
  other:      { icon: 'build',               color: '#6B7280', label: 'General Service' },
};

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

const getCategoryMeta = (cat, group) => {
  const key = (group || cat || '').toLowerCase();
  for (const k of Object.keys(CATEGORY_META)) {
    if (key.includes(k)) return CATEGORY_META[k];
  }
  return CATEGORY_META.other;
};

const getDefaultCover = (key) => {
  const k = (key || '').toLowerCase();
  for (const cat of Object.keys(CATEGORY_DEFAULT_COVERS)) {
    if (k.includes(cat)) return CATEGORY_DEFAULT_COVERS[cat];
  }
  return CATEGORY_DEFAULT_COVERS.other;
};

const PRICE_UNIT_LABEL = {
  hour: 'per hour',
  day: 'per day',
  job: 'per job',
  sqft: 'per sq ft',
  item: 'per item',
};

const isMongoObjectId = (value) => /^[0-9a-fA-F]{24}$/.test(String(value || ''));

const resolveUrl = (raw) => {
  if (!raw) return null;
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('file://') || raw.startsWith('data:')) {
    return raw;
  }
  if (raw.startsWith('/uploads/')) return `${CONFIG.ML_SERVICE_URL}${raw}`;
  return raw;
};

export default function ServiceDetailScreen({ navigation, route }) {
  const { isDark } = useContext(ThemeContext) || {};
  const { portfolioImages, loadPortfolio } = usePortfolio() || { portfolioImages: [] };

  const rawService = route.params?.service || null;
  const initialName = rawService?.name || rawService?.title || route.params?.serviceName || 'Home Service';
  const initialCategory = rawService?.category || route.params?.category || 'home service';
  const serviceId = rawService?._id || route.params?.serviceId || null;

  // Initialize service state with default fallback data so the page always renders rich details
  const [service, setService] = useState({
    _id: serviceId,
    name: initialName,
    category: initialCategory,
    categoryGroup: rawService?.categoryGroup || 'other',
    description: rawService?.description || '',
    basePrice: rawService?.basePrice || 0,
    priceUnit: rawService?.priceUnit || 'job',
    tags: rawService?.tags || [],
    images: rawService?.images || [],
    isActive: rawService?.isActive !== undefined ? rawService.isActive : true,
    coverImage: rawService?.coverImage || getDefaultCover(initialCategory),
  });

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageAnalysisMode, setImageAnalysisMode] = useState('ml');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const { t, i18n } = useTranslation();
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiLang, setAiLang] = useState(i18n.language || 'en');

  // Gallery viewer state
  const [viewerVisible, setViewerVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const C = isDark
    ? {
        bg: '#0C0F0D',
        card: '#161C18',
        cardAlt: '#1B241F',
        text: '#F2F2F7',
        textSub: '#8E8E93',
        border: '#303C33',
        accent: '#86C99A',
        chipBg: '#202A23',
      }
    : {
        bg: '#F5FAF6',
        card: '#FFFFFF',
        cardAlt: '#F9FCFA',
        text: '#111111',
        textSub: '#6B7280',
        border: '#D8E8DC',
        accent: '#15803D',
        chipBg: '#EAF7EE',
      };

  // Fetch full details from database if serviceId exists
  const fetchServiceDetails = useCallback(async () => {
    if (!isMongoObjectId(serviceId)) return;
    try {
      const res = await servicesAPI.getServiceById(serviceId);
      if (res.data?.success && res.data?.data) {
        const fetched = res.data.data;
        setService((prev) => ({
          ...prev,
          ...fetched,
          coverImage: (fetched.images && fetched.images.length > 0)
            ? resolveUrl(fetched.images[0])
            : (prev.coverImage || getDefaultCover(fetched.category || fetched.name)),
        }));
      }
    } catch (err) {
      console.log('Error fetching service details from DB:', err?.message);
    } finally {
      setRefreshing(false);
    }
  }, [serviceId]);

  useEffect(() => {
    fetchServiceDetails();
  }, [fetchServiceDetails]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchServiceDetails();
  };

  // AI Gemini Auto-Generation Feature with Multi-Language Support
  const handleAutoGenerateAI = async (overrideLang) => {
    const langToUse = overrideLang || aiLang || i18n.language || 'en';
    try {
      setAiGenerating(true);
      const nameToUse = service.name || initialName;
      const categoryToUse = service.category || initialCategory;
      const groupToUse = service.categoryGroup || 'other';

      let aiResult = null;
      try {
        const res = await servicesAPI.generateAiDetails({
          name: nameToUse,
          category: categoryToUse,
          categoryGroup: groupToUse,
          language: langToUse,
        });
        if (res.data?.success && res.data?.data) {
          aiResult = res.data.data;
        }
      } catch (err) {
        console.log('Backend AI generate error, using fallback generator:', err?.message);
      }

      if (!aiResult) {
        if (langToUse === 'si') {
          aiResult = {
            name: nameToUse,
            description: `විශ්වාසනීය සහ උසස් ප්‍රමිතියෙන් යුත් ${nameToUse} සේවාව. පළපුරුදු වෘත්තීය ශිල්පීන්, නවීන උපකරණ සහ ආරක්ෂිත ක්‍රමවේද භාවිතයෙන් කඩිනමින් සිදු කරනු ලැබේ. සාධාරණ මිල ගණන් සහ පාරිභෝගික තෘප්තිය 100% සහතිකයි.`,
            category: categoryToUse,
            categoryGroup: groupToUse,
            basePrice: service.basePrice > 0 ? service.basePrice : 2500,
            priceUnit: service.priceUnit || 'job',
            tags: ['විශ්වාසනීය සේවාව', 'පළපුරුදු ශිල්පීන්', 'කඩිනම් සේවය', 'සාධාරණ මිල', 'පාරිභෝගික තෘප්තිය', 'ගුණාත්මක නිමාව'],
          };
        } else if (langToUse === 'ta') {
          aiResult = {
            name: nameToUse,
            description: `உயர்தர மற்றும் நம்பகமான ${nameToUse} சேவை. அனுபவம் வாய்ந்த பணியாளர்கள், நவீன உபகரணங்கள் மற்றும் நியாயமான கட்டணத்துடன் உங்கள் திருப்தியை முழுமையாக உறுதி செய்கிறோம். தரமான மற்றும் விரைவான சேவை.`,
            category: categoryToUse,
            categoryGroup: groupToUse,
            basePrice: service.basePrice > 0 ? service.basePrice : 2500,
            priceUnit: service.priceUnit || 'job',
            tags: ['உயர்தர சேவை', 'அனுபவமிக்க பணியாளர்கள்', 'விரைவான சேவை', 'நியாயமான கட்டணம்', 'நம்பகமானது', 'முழு திருப்தி'],
          };
        } else {
          aiResult = {
            name: nameToUse,
            description: `Comprehensive and reliable ${nameToUse} tailored to deliver exceptional quality and peace of mind. Our experienced team uses modern equipment and industry-approved standards to ensure lasting, dependable results. We provide thorough inspection, transparent pricing, and 100% customer satisfaction guarantee.`,
            category: categoryToUse,
            categoryGroup: groupToUse,
            basePrice: service.basePrice > 0 ? service.basePrice : 2500,
            priceUnit: service.priceUnit || 'job',
            tags: ['Quality Guaranteed', 'Experienced Staff', 'Fast Turnaround', 'Clean & Reliable', 'Satisfaction Guaranteed'],
          };
        }
      }

      const updated = {
        ...service,
        name: aiResult.name || service.name,
        description: aiResult.description || service.description,
        category: aiResult.category || service.category,
        categoryGroup: aiResult.categoryGroup || service.categoryGroup,
        basePrice: aiResult.basePrice || service.basePrice || 2500,
        priceUnit: aiResult.priceUnit || service.priceUnit || 'job',
        tags: aiResult.tags && aiResult.tags.length > 0 ? aiResult.tags : service.tags,
      };

      setService(updated);

      // If already saved in database, update it; otherwise create the service document in MongoDB
      if (isMongoObjectId(service._id)) {
        try {
          await servicesAPI.updateService(service._id, {
            name: updated.name,
            description: updated.description,
            category: updated.category,
            categoryGroup: updated.categoryGroup,
            basePrice: updated.basePrice,
            priceUnit: updated.priceUnit,
            tags: updated.tags,
            images: updated.images || [],
          });
        } catch (dbErr) {
          console.log('Error saving AI updates to DB:', dbErr.response?.data || dbErr.message);
        }
      } else {
        // Non-persisted portfolio/category entry: save as new service document in DB
        try {
          const createRes = await servicesAPI.createService({
            name: updated.name,
            description: updated.description,
            category: updated.category,
            categoryGroup: updated.categoryGroup,
            basePrice: updated.basePrice,
            priceUnit: updated.priceUnit,
            tags: updated.tags,
            images: updated.images || [],
          });
          if (createRes.data?.success && createRes.data?.data?._id) {
            setService((prev) => ({ ...prev, _id: createRes.data.data._id }));
          }
        } catch (createErr) {
          console.log('Error creating service document for portfolio entry:', createErr.response?.data || createErr.message);
        }
      }

      Alert.alert(
        'AI Generated ✨',
        langToUse === 'si'
          ? 'Gemini AI මඟින් සිංහලෙන් සේවා විස්තරය, මිල ගණන් සහ ටැග් සාර්ථකව සාදන ලදී!'
          : langToUse === 'ta'
          ? 'Gemini AI மூலம் தமிழில் சேவை விளக்கம், விலை மற்றும் குறிச்சொற்கள் வெற்றிகரமாக உருவாக்கப்பட்டன!'
          : 'Professional description, pricing, and tags have been automatically generated with AI Gemini!'
      );
    } catch (e) {
      Alert.alert('Error', 'Unable to auto-generate details with AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleToggleActive = async () => {
    if (!service) return;
    try {
      setTogglingActive(true);
      if (isMongoObjectId(service._id)) {
        await servicesAPI.toggleActive(service._id);
      }
      setService((prev) => ({ ...prev, isActive: !prev.isActive }));
    } catch (err) {
      Alert.alert('Error', 'Unable to toggle service status.');
    } finally {
      setTogglingActive(false);
    }
  };

  const handleEdit = () => {
    navigation.navigate('ServiceForm', {
      serviceId: isMongoObjectId(service._id) ? service._id : null,
      category: service.category,
      serviceName: service.name,
      service,
      autoGenerate: !service.description?.trim(),
    });
  };

  const handleDelete = () => {
    if (!isMongoObjectId(service._id)) {
      navigation.goBack();
      return;
    }
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
              await servicesAPI.deleteService(service._id);
              Alert.alert('Deleted', 'Service removed successfully.');
              navigation.goBack();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete service.');
            }
          },
        },
      ]
    );
  };

  const handlePickImage = () => {
    Alert.alert('Add Service Photo', 'How would you like to process this photo?', [
      {
        text: '✨ Analyze with AI Vision',
        onPress: () => promptMediaSource(true),
      },
      {
        text: '📷 Direct Upload (No AI)',
        onPress: () => promptMediaSource(false),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
              saveNewImage(result.assets[0], analyzeWithMl);
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
              saveNewImage(result.assets[0], analyzeWithMl);
            }
          },
        },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const saveNewImage = async (asset, analyzeWithMl = false) => {
    try {
      setUploadingImage(true);
      const localUri = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;

      if (analyzeWithMl) {
        setAiProcessing(true);
        setAiProgress(20);
      }

      const formData = new FormData();
      formData.append('images', {
        uri: asset.uri,
        name: asset.fileName || 'service_photo.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
      formData.append('analyze', analyzeWithMl ? 'true' : 'false');
      formData.append('service_id', service._id ? String(service._id) : '');
      formData.append('service_name', service.name || '');
      formData.append('category', service.category || '');
      formData.append('category_group', service.categoryGroup || '');
      formData.append('tags', JSON.stringify(service.tags || []));

      let savedData = null;
      try {
        const uploadRes = await servicesAPI.uploadServiceImage(formData);
        if (uploadRes?.images && uploadRes.images.length > 0) {
          savedData = uploadRes.images[0];
        }
      } catch (uploadErr) {
        console.log('Upload image API error in detail screen:', uploadErr.message);
      }

      const isAi = Boolean(analyzeWithMl && (savedData?.isAiAnalyzed || savedData?.confidence > 0));
      const newImgItem = {
        id: savedData?.id || `direct_${Date.now()}_${Math.random()}`,
        url: savedData?.url || savedData?.image_url || localUri,
        uri: resolveUrl(savedData?.url || savedData?.image_url || localUri),
        isAiAnalyzed: isAi,
        confidence: savedData?.confidence || 0,
        tags: savedData?.tags || service.tags || [],
        label: savedData?.label || service.name || 'Service Work',
        specificLabel: savedData?.specific_label || '',
        uploadedAt: new Date().toISOString(),
      };

      const currentImages = Array.isArray(service?.images) ? [...service.images] : [];
      const updatedImages = [newImgItem, ...currentImages];

      let updatedTags = service.tags || [];
      let updatedName = service.name;
      if (isAi && savedData) {
        if (Array.isArray(savedData.tags) && savedData.tags.length > 0) {
          updatedTags = Array.from(new Set([...(service.tags || []), ...savedData.tags]));
        }
        if (savedData.specific_label && !service.name.trim()) {
          updatedName = savedData.specific_label;
        }
      }

      setService((prev) => ({
        ...prev,
        name: updatedName,
        tags: updatedTags,
        images: updatedImages,
        coverImage: newImgItem.uri,
      }));

      if (isMongoObjectId(service._id)) {
        await servicesAPI.updateService(service._id, {
          images: updatedImages,
          tags: updatedTags,
          name: updatedName,
        });
      }

      // Also reload portfolio so it immediately displays this newly saved photo
      if (typeof loadPortfolio === 'function') {
        loadPortfolio();
      }

      Alert.alert(
        isAi ? 'AI Analyzed & Saved ✨' : 'Photo Attached 📷',
        isAi
          ? `Work classified as "${savedData?.specific_label || savedData?.label || 'Service'}" (${Math.round(savedData?.confidence || 90)}% confidence). Added to service & portfolio!`
          : 'Service showcase photo added and saved to your portfolio.'
      );
    } catch (err) {
      console.log('Save image error:', err.response?.data || err.message);
      Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to attach image to service.');
    } finally {
      setAiProcessing(false);
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = (indexToRemove) => {
    Alert.alert('Remove Image', 'Remove this image from your service gallery?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedImages = (service.images || []).filter((_, idx) => idx !== indexToRemove);
            setService((prev) => ({
              ...prev,
              images: updatedImages,
              coverImage: updatedImages[0] || getDefaultCover(service.category),
            }));
            if (isMongoObjectId(service._id)) {
              await servicesAPI.updateService(service._id, { images: updatedImages });
            }
          } catch (err) {
            Alert.alert('Error', 'Failed to remove image.');
          }
        },
      },
    ]);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${service.name} - ${service.description || 'Professional service'}\nStarting rate: Rs. ${service.basePrice?.toLocaleString()} ${PRICE_UNIT_LABEL[service.priceUnit] || ''}`,
      });
    } catch (e) {
      console.log('Share error:', e);
    }
  };

  // Compile full gallery: Direct images + matching portfolio photos
  const serviceImages = (service?.images || []).map((item, idx) => {
    const rawUrl = typeof item === 'string' ? item : (item.url || item.image_url || item.uri);
    const isAi = typeof item === 'object' ? Boolean(item.isAiAnalyzed || item.ai_analyzed || item.confidence > 0) : false;
    const conf = typeof item === 'object' ? (Number(item.confidence) || 0) : 0;
    return {
      id: (typeof item === 'object' && item.id) ? item.id : `direct-${idx}`,
      uri: resolveUrl(rawUrl),
      url: rawUrl,
      isDirect: true,
      directIndex: idx,
      isAiAnalyzed: isAi,
      confidence: conf,
      label: (typeof item === 'object' && item.label) || service.name,
      specific_label: (typeof item === 'object' && (item.specificLabel || item.specific_label)) || service.name,
      caption: isAi ? `✨ AI Verified (${Math.round(conf)}%)` : '📷 Direct Upload',
      tags: (typeof item === 'object' && item.tags) || service.tags || [],
    };
  });

  const matchingPortfolioImages = (portfolioImages || [])
    .filter((img) => {
      const rawUrl = img.image_url || img.uri;
      if (serviceImages.some((s) => s.url === rawUrl || s.uri === img.uri || s.id === img.id)) return false;
      const sName = (service?.name || '').toLowerCase();
      const sCat = (service?.category || '').toLowerCase();
      const imgLabel = (img.label || '').toLowerCase();
      const imgCat = (img.category || '').toLowerCase();
      const imgSpec = (img.specific_label || '').toLowerCase();
      return (
        imgLabel.includes(sCat) ||
        sCat.includes(imgLabel) ||
        imgCat.includes(sCat) ||
        sName.includes(imgLabel) ||
        (imgSpec && sName.includes(imgSpec))
      );
    })
    .map((img) => {
      const isAi = Boolean(img.ai_analyzed || img.isAiAnalyzed || img.confidence > 0);
      return {
        id: img.id,
        uri: resolveUrl(img.uri),
        url: img.image_url || img.uri,
        isDirect: false,
        isAiAnalyzed: isAi,
        confidence: img.confidence || 0,
        label: img.specific_label || img.label || 'Portfolio Showcase',
        caption: isAi ? `✨ AI Portfolio (${Math.round(img.confidence || 0)}%)` : '📷 Portfolio Upload',
        tags: img.tags || [],
      };
    });

  const allGalleryImages = [...serviceImages, ...matchingPortfolioImages];
  const meta = service.meta || getCategoryMeta(service.category, service.categoryGroup);
  const activeCover = service.coverImage || (service.images && service.images[0]) || getDefaultCover(service.category);
  const hasDesc = !!service.description?.trim();

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Header Bar */}
      <View style={[styles.navBar, { backgroundColor: C.card, borderBottomColor: C.border }]}>
        <TouchableOpacity style={styles.navIconBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: C.text }]} numberOfLines={1}>
          {service.name || 'Service Details'}
        </Text>

        <View style={styles.navActions}>
          <TouchableOpacity style={styles.navIconBtn} onPress={handleShare}>
            <MaterialIcons name="share" size={22} color={C.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.navIconBtn} onPress={handleEdit}>
            <MaterialIcons name="edit" size={22} color={C.accent} />
          </TouchableOpacity>
          {service._id ? (
            <TouchableOpacity style={styles.navIconBtn} onPress={handleDelete}>
              <MaterialIcons name="delete-outline" size={22} color="#DC2626" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} />}
      >
        {/* Cover Image Banner */}
        <View style={[styles.coverContainer, { borderColor: C.border }]}>
          <Image source={{ uri: activeCover }} style={styles.coverImageHero} resizeMode="cover" />

          {/* Overlay gradient badge */}
          <View style={styles.coverOverlay}>
            <View style={[styles.categoryBadgeOnCover, { backgroundColor: meta.color + 'E6' }]}>
              <MaterialIcons name={meta.icon} size={16} color="#FFFFFF" />
              <Text style={styles.categoryBadgeTextOnCover}>{service.category}</Text>
            </View>

            <TouchableOpacity
              style={styles.changeCoverBtn}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
              <Text style={styles.changeCoverBtnText}>Add Photo</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hero Card: Service Title & Active Status */}
        <View style={[styles.heroCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.heroTopRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={[styles.serviceTitle, { color: C.text }]}>{service.name}</Text>
              <Text style={[styles.serviceSubtitle, { color: C.textSub }]}>
                {meta.label || service.category}
              </Text>
            </View>

            <View style={styles.heroStatusWrap}>
              <View
                style={[
                  styles.statusBadge,
                  {
                    backgroundColor: service.isActive ? '#15803D1A' : '#DC26261A',
                    borderColor: service.isActive ? '#15803D40' : '#DC262640',
                  },
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: service.isActive ? '#15803D' : '#DC2626' },
                  ]}
                />
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: service.isActive ? '#15803D' : '#DC2626' },
                  ]}
                >
                  {service.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>

              <Switch
                value={service.isActive}
                onValueChange={handleToggleActive}
                disabled={togglingActive}
                color={C.accent}
              />
            </View>
          </View>

          {/* Price Strip */}
          <View style={[styles.priceStrip, { backgroundColor: C.chipBg, borderColor: C.border }]}>
            <View>
              <Text style={[styles.priceStripLabel, { color: C.textSub }]}>Starting Rate</Text>
              <Text style={[styles.priceStripVal, { color: meta.color }]}>
                {service.basePrice > 0 ? `Rs. ${service.basePrice.toLocaleString()}` : 'Negotiable'}
              </Text>
            </View>
            <View style={[styles.unitChip, { backgroundColor: meta.color + '1A', borderColor: meta.color + '40' }]}>
              <Text style={[styles.unitChipText, { color: meta.color }]}>
                {PRICE_UNIT_LABEL[service.priceUnit] || `/ ${service.priceUnit || 'job'}`}
              </Text>
            </View>
          </View>
        </View>

        {/* Description Section with AI Generation Banner */}
        <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <MaterialIcons name="description" size={20} color={meta.color} />
              <Text style={[styles.cardSectionTitle, { color: C.text }]}>Service Description</Text>
            </View>

            {/* AI Auto-generate button */}
            <TouchableOpacity
              style={[styles.aiGenSmallBtn, { backgroundColor: isDark ? '#1C3829' : '#DCFCE7', borderColor: C.accent }]}
              onPress={() => handleAutoGenerateAI(aiLang)}
              disabled={aiGenerating}
              activeOpacity={0.8}
            >
              {aiGenerating ? (
                <ActivityIndicator size="small" color={C.accent} />
              ) : (
                <>
                  <MaterialIcons name="auto-awesome" size={14} color={C.accent} />
                  <Text style={[styles.aiGenSmallText, { color: C.accent }]}>
                    {hasDesc ? 'Regenerate AI' : 'Generate with AI'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* AI Language Selection Bar */}
          <View style={[styles.aiLangPillsRow, { backgroundColor: isDark ? '#131B15' : '#F4F9F5', borderColor: C.border }]}>
            <View style={styles.aiLangPromptWrap}>
              <MaterialIcons name="translate" size={14} color={meta.color} />
              <Text style={[styles.aiLangPrompt, { color: C.textSub }]}>AI Language:</Text>
            </View>
            <View style={styles.aiLangPills}>
              {[
                { code: 'en', label: 'English', flag: '🇬🇧' },
                { code: 'si', label: 'සිංහල', flag: '🇱🇰' },
                { code: 'ta', label: 'தமிழ்', flag: '🇱🇰' },
              ].map((item) => {
                const active = aiLang === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[
                      styles.aiLangPill,
                      {
                        backgroundColor: active ? meta.color : (isDark ? '#202A23' : '#FFFFFF'),
                        borderColor: active ? meta.color : C.border,
                      },
                    ]}
                    onPress={() => {
                      setAiLang(item.code);
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

          {hasDesc ? (
            <Text style={[styles.descriptionBody, { color: C.text }]}>
              {service.description}
            </Text>
          ) : (
            <View style={[styles.noDescBox, { backgroundColor: C.cardAlt, borderColor: C.border }]}>
              <MaterialIcons name="auto-awesome" size={28} color={meta.color} />
              <Text style={[styles.noDescTitle, { color: C.text }]}>No Description Added Yet</Text>
              <Text style={[styles.noDescSub, { color: C.textSub }]}>
                Generate a rich, professional description and pricing suggestions automatically using AI Gemini in English, Sinhala, or Tamil.
              </Text>
              <TouchableOpacity
                style={[styles.aiGenBannerBtn, { backgroundColor: C.accent }]}
                onPress={() => handleAutoGenerateAI(aiLang)}
                disabled={aiGenerating}
                activeOpacity={0.85}
              >
                {aiGenerating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={18} color="#FFFFFF" />
                    <Text style={styles.aiGenBannerBtnText}>Auto-Generate with Gemini AI</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tags / Skills Section */}
        {(service.tags || []).length > 0 && (
          <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.cardHeaderRow}>
              <View style={styles.cardHeaderLeft}>
                <MaterialIcons name="local-offer" size={20} color={meta.color} />
                <Text style={[styles.cardSectionTitle, { color: C.text }]}>Specialized Skills & Tags</Text>
              </View>
            </View>

            <View style={styles.tagsContainer}>
              {service.tags.map((tag, idx) => (
                <View key={idx} style={[styles.tagBadge, { backgroundColor: C.chipBg, borderColor: C.border }]}>
                  <MaterialIcons name="check" size={13} color={C.accent} />
                  <Text style={[styles.tagBadgeText, { color: C.text }]}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Interest Images & Work Gallery Facility */}
        <View style={[styles.infoCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.galleryHeaderRow}>
            <View style={styles.galleryHeaderLeft}>
              <MaterialIcons name="photo-library" size={22} color={meta.color} />
              <View>
                <Text style={[styles.cardSectionTitle, { color: C.text }]}>
                  Work Gallery & Interest Images
                </Text>
                <Text style={[styles.gallerySubCount, { color: C.textSub }]}>
                  {allGalleryImages.length} visual showcase image{allGalleryImages.length === 1 ? '' : 's'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  {[
                    ['image', 'Image only'],
                    ['ml', 'Analyze with ML'],
                  ].map(([value, label]) => (
                    <TouchableOpacity
                      key={value}
                      onPress={() => setImageAnalysisMode(value)}
                      style={{ paddingHorizontal: 8, paddingVertical: 6, borderRadius: 7, borderWidth: 1, borderColor: imageAnalysisMode === value ? Colors.primary : C.border, backgroundColor: imageAnalysisMode === value ? '#EAF7EE' : C.card }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: imageAnalysisMode === value ? Colors.primary : C.textSub }}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.addPhotoBtn, { backgroundColor: C.accent }]}
              onPress={handlePickImage}
              disabled={uploadingImage}
              activeOpacity={0.8}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialIcons name="add-a-photo" size={15} color="#FFFFFF" />
                  <Text style={styles.addPhotoBtnText}>Add Photo</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <Divider style={[styles.divider, { backgroundColor: C.border }]} />

          {allGalleryImages.length === 0 ? (
            <View style={[styles.emptyGalleryBox, { borderColor: C.border }]}>
              <MaterialIcons name="image" size={40} color={C.textSub} />
              <Text style={[styles.emptyGalleryTitle, { color: C.text }]}>No Images Attached Yet</Text>
              <Text style={[styles.emptyGallerySub, { color: C.textSub }]}>
                Add photos of previous work, completed projects, or tools to attract clients.
              </Text>
              <TouchableOpacity
                style={[styles.emptyGalleryBtn, { backgroundColor: C.accent }]}
                onPress={handlePickImage}
              >
                <MaterialIcons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.emptyGalleryBtnText}>Upload Service Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.galleryGrid}>
              {allGalleryImages.map((img, idx) => (
                <View key={img.id || idx} style={[styles.galleryItemWrap, { borderColor: C.border }]}>
                  <TouchableOpacity
                    style={styles.galleryThumbTouchable}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSelectedImageIndex(idx);
                      setViewerVisible(true);
                    }}
                  >
                    <Image source={{ uri: img.uri }} style={styles.galleryThumb} resizeMode="cover" />

                    {/* Status Pill: AI Verified vs Direct Upload */}
                    <View
                      style={{
                        position: 'absolute',
                        top: 6,
                        left: 6,
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                        backgroundColor: img.isAiAnalyzed
                          ? 'rgba(21, 128, 61, 0.92)'
                          : 'rgba(30, 41, 59, 0.88)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <MaterialIcons
                        name={img.isAiAnalyzed ? 'auto-awesome' : 'photo-camera'}
                        size={10}
                        color="#FFFFFF"
                      />
                      <Text style={{ fontSize: 9, color: '#FFFFFF', fontWeight: '800' }}>
                        {img.isAiAnalyzed
                          ? img.confidence > 0
                            ? `${Math.round(img.confidence)}%`
                            : 'AI'
                          : 'Direct'}
                      </Text>
                    </View>

                    <View style={styles.zoomPill}>
                      <MaterialIcons name="zoom-in" size={16} color="#FFFFFF" />
                    </View>

                    {img.isDirect ? (
                      <TouchableOpacity
                        style={styles.deletePhotoPill}
                        onPress={() => handleRemoveImage(img.directIndex)}
                      >
                        <MaterialIcons name="close" size={13} color="#FFFFFF" />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.portfolioTagPill}>
                        <MaterialIcons name="verified" size={11} color="#FFFFFF" />
                        <Text style={styles.portfolioTagText}>Portfolio</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={[styles.galleryItemFooter, { backgroundColor: C.cardAlt }]}>
                    <Text style={[styles.galleryItemLabel, { color: C.text }]} numberOfLines={1}>
                      {img.label}
                    </Text>
                    <Text style={[styles.galleryItemSub, { color: C.textSub }]} numberOfLines={1}>
                      {img.caption}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Quick Action Footer */}
        <View style={styles.footerActions}>
          <TouchableOpacity
            style={[styles.actionPrimaryBtn, { backgroundColor: C.accent }]}
            onPress={handleEdit}
            activeOpacity={0.85}
          >
            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.actionPrimaryBtnText}>Edit Service Details</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Fullscreen Interactive Lightbox / Gallery Viewer */}
      {viewerVisible && allGalleryImages[selectedImageIndex] && (
        <Modal visible={viewerVisible} transparent animationType="fade">
          <View style={styles.lightboxOverlay}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />

            {/* Top Lightbox Bar */}
            <View style={styles.lightboxTopBar}>
              <TouchableOpacity
                style={styles.lightboxCloseBtn}
                onPress={() => setViewerVisible(false)}
              >
                <MaterialIcons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <Text style={styles.lightboxCounter}>
                {selectedImageIndex + 1} of {allGalleryImages.length}
              </Text>

              <View style={{ width: 40 }} />
            </View>

            {/* Main Lightbox Image View */}
            <View style={styles.lightboxImageContainer}>
              <Image
                source={{ uri: allGalleryImages[selectedImageIndex].uri }}
                style={styles.lightboxMainImage}
                resizeMode="contain"
              />
            </View>

            {/* Navigation Arrows */}
            {selectedImageIndex > 0 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={() => setSelectedImageIndex((prev) => Math.max(0, prev - 1))}
              >
                <MaterialIcons name="chevron-left" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {selectedImageIndex < allGalleryImages.length - 1 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={() => setSelectedImageIndex((prev) => Math.min(allGalleryImages.length - 1, prev + 1))}
              >
                <MaterialIcons name="chevron-right" size={32} color="#FFFFFF" />
              </TouchableOpacity>
            )}

            {/* Bottom Caption Bar */}
            <View style={styles.lightboxBottomBar}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  alignSelf: 'flex-start',
                  backgroundColor: allGalleryImages[selectedImageIndex].isAiAnalyzed
                    ? 'rgba(21, 128, 61, 0.25)'
                    : 'rgba(59, 130, 246, 0.25)',
                  borderColor: allGalleryImages[selectedImageIndex].isAiAnalyzed ? '#15803D' : '#3B82F6',
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 12,
                  marginBottom: 6,
                }}
              >
                <MaterialIcons
                  name={allGalleryImages[selectedImageIndex].isAiAnalyzed ? 'auto-awesome' : 'photo-camera'}
                  size={12}
                  color={allGalleryImages[selectedImageIndex].isAiAnalyzed ? '#86EFAC' : '#93C5FD'}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: allGalleryImages[selectedImageIndex].isAiAnalyzed ? '#86EFAC' : '#93C5FD',
                  }}
                >
                  {allGalleryImages[selectedImageIndex].isAiAnalyzed
                    ? `AI Verified Analysis (${Math.round(allGalleryImages[selectedImageIndex].confidence || 90)}% Confidence)`
                    : 'Direct Upload (Not AI Analyzed)'}
                </Text>
              </View>

              <Text style={styles.lightboxTitle}>
                {allGalleryImages[selectedImageIndex].label}
              </Text>
              <Text style={styles.lightboxCaption}>
                {allGalleryImages[selectedImageIndex].caption}
              </Text>
            </View>
          </View>
        </Modal>
      )}
      <AIProcessingModal
        visible={aiProcessing}
        progress={aiProgress}
        imageCount={1}
        onCancel={() => setAiProcessing(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  navIconBtn: { padding: 8, borderRadius: 8 },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  scrollContent: { padding: 16, gap: 14 },

  // Cover Image
  coverContainer: {
    height: 200,
    borderRadius: 18,
    borderWidth: 0.5,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImageHero: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.25)',
    justifyContent: 'space-between',
    padding: 12,
  },
  categoryBadgeOnCover: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  categoryBadgeTextOnCover: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  changeCoverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeCoverBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  heroCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 0.5,
    gap: 12,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  serviceTitle: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  serviceSubtitle: {
    fontSize: 13,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  heroStatusWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  priceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 0.5,
  },
  priceStripLabel: { fontSize: 11 },
  priceStripVal: { fontSize: 22, fontWeight: '800', marginTop: 2 },
  unitChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 0.5 },
  unitChipText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },

  infoCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 0.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardSectionTitle: { fontSize: 15, fontWeight: '700' },

  aiGenSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiGenSmallText: { fontSize: 11, fontWeight: '700' },

  aiLangPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 0.5,
    marginBottom: 10,
    gap: 6,
  },
  aiLangPromptWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiLangPrompt: {
    fontSize: 11,
    fontWeight: '600',
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
  },
  aiLangPillText: {
    fontSize: 11,
  },

  descriptionBody: {
    fontSize: 14,
    lineHeight: 22,
  },

  noDescBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    borderRadius: 14,
    borderWidth: 0.5,
    gap: 8,
  },
  noDescTitle: { fontSize: 15, fontWeight: '700' },
  noDescSub: { fontSize: 12, textAlign: 'center', lineHeight: 18, maxWidth: 300 },
  aiGenBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  aiGenBannerBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 0.5,
  },
  tagBadgeText: { fontSize: 12, fontWeight: '600' },

  galleryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  gallerySubCount: { fontSize: 11, marginTop: 2 },
  addPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  addPhotoBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  divider: { marginVertical: 14 },

  emptyGalleryBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 6,
  },
  emptyGalleryTitle: { fontSize: 14, fontWeight: '700' },
  emptyGallerySub: { fontSize: 11, textAlign: 'center', lineHeight: 16, maxWidth: 280 },
  emptyGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  emptyGalleryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },

  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  galleryItemWrap: {
    width: (SCREEN_WIDTH - 64 - 12) / 2,
    borderRadius: 14,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  galleryThumbTouchable: { width: '100%', height: 120, position: 'relative' },
  galleryThumb: { width: '100%', height: '100%' },
  zoomPill: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotoPill: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(220, 38, 38, 0.85)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioTagPill: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(21, 128, 61, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  portfolioTagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
  galleryItemFooter: { padding: 8 },
  galleryItemLabel: { fontSize: 12, fontWeight: '700' },
  galleryItemSub: { fontSize: 10, marginTop: 2 },

  footerActions: { marginTop: 8 },
  actionPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionPrimaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  lightboxOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  lightboxTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
  },
  lightboxCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxCounter: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  lightboxImageContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  lightboxMainImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.65 },
  navArrow: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrowLeft: { left: 16 },
  navArrowRight: { right: 16 },
  lightboxBottomBar: {
    backgroundColor: 'rgba(20,20,20,0.85)',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  lightboxTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  lightboxCaption: { color: '#9CA3AF', fontSize: 13 },
});
