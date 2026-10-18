import PageHeader from '../components/PageHeader';
// screens/CreatePostScreen.js

import React, {
  useState,
  useRef,
  useContext,
  useEffect,
} from 'react';
import axios from 'axios';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  Animated,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapView, { Marker } from '../components/SafeMapView';
import { LanguageContext } from '../context/LanguageContext';
import { useTheme } from '../hooks/useTheme';
import { API_BASE_URL } from '../config';

const SRI_LANKA_DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
  'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
  'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
  'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
  'Moneragala', 'Ratnapura', 'Kegalle',
];

// =======================================================
// VALIDATE MONGODB OBJECT ID
// =======================================================
const isValidObjectId = (value) => {
  if (!value) return false;
  return /^[0-9a-fA-F]{24}$/.test(String(value));
};

// =======================================================
// GET LOGGED USER
// =======================================================
const getLoggedUser = async () => {
  try {
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) return null;

    let user;
    try {
      user = JSON.parse(storedUser);
    } catch {
      return null;
    }

    const userId = user?.id || user?._id || user?.userId || user?.seekerId;
    if (!userId || !isValidObjectId(userId)) return null;

    const userName = user?.name || user?.fullName || user?.username || 'Customer';
    const profileImage = user?.profileImage || user?.avatar || null;

    return {
      userId: String(userId),
      userName,
      profileImage,
      rawUser: user,
    };
  } catch (error) {
    console.error('GET LOGGED USER ERROR:', error);
    return null;
  }
};

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { language } = useContext(LanguageContext) || { language: 'en' };
  const isSi = language === 'si';
  const { isDarkMode } = useTheme();

  // Mode states
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [originalImagePath, setOriginalImagePath] = useState(null);

  // Form states
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [postLanguage, setPostLanguage] = useState(language || 'en');
  const [serviceLocation, setServiceLocation] = useState('');
  const [urgency, setUrgency] = useState('');
  const [requiredDate, setRequiredDate] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [showRequiredDatePicker, setShowRequiredDatePicker] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Location Picker Modal states
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [locatingGPS, setLocatingGPS] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [mapMarker, setMapMarker] = useState({
    latitude: 6.9271,
    longitude: 79.8612,
  });
  const [tempLocationAddress, setTempLocationAddress] = useState('');
  const mapRef = useRef(null);

  // AI Preview
  const [previewData, setPreviewData] = useState(null);
  const [previewVersions, setPreviewVersions] = useState({});
  const [translationTarget, setTranslationTarget] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);

  // Image URL helper
  const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    const image = String(imagePath);
    if (image.startsWith('http://') || image.startsWith('https://')) return image;
    return `${API_BASE_URL}/${image.replace(/\\/g, '/')}`;
  };

  const extractDetailsFromInput = (value) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    const dateMatch = text.match(
      /\b(\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|today|tomorrow|next\s+(?:week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday)|this\s+(?:weekend|week))\b/i
    );
    const locationMatch = text.match(
      /\b(?:in|at|near|around)\s+([A-Z][\w'-]*(?:\s+[A-Z][\w'-]*){0,3})(?=\s*(?:,|\.|;|$|\b(?:today|tomorrow|next|this|urgent|urgently|asap|please|for|to|because|with)\b))/i
    );
    const lowerText = text.toLowerCase();
    const detectedUrgency = /\b(emergency|urgently?|asap|immediately|right away)\b/.test(lowerText)
      ? 'high'
      : /\b(not urgent|whenever|flexible|no rush)\b/.test(lowerText)
      ? 'low'
      : '';

    return {
      date: dateMatch?.[1] || '',
      location: locationMatch?.[1]?.trim() || '',
      urgency: detectedUrgency,
    };
  };

  const getPickerDate = (value) => {
    if (!value) return new Date();
    const normalized = String(value).trim().toLowerCase();
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
    if (normalized === 'today') return new Date();
    if (normalized === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow;
    }
    return new Date();
  };

  const formatDateForPost = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Edit Mode Initialization
  useEffect(() => {
    const { editMode, postData } = route.params || {};
    if (editMode && postData) {
      setIsEditMode(true);
      setEditPostId(postData._id || postData.id);
      setTitle(postData.title || '');
      setDescription(postData.description || '');
      setPostLanguage(postData.language || language || 'en');
      setServiceLocation(postData.location?.address || '');
      setUrgency(postData.urgency || 'medium');
      setRequiredDate(postData.preferredSchedule?.date || '');

      if (postData.image) {
        const imageUrl = getImageUrl(postData.image);
        setSelectedImage(imageUrl);
        setOriginalImagePath(postData.image);
      }

      const savedPreview = {
        image: postData.image || null,
        title: postData.title || '',
        description: postData.description || '',
        category: postData.category || 'General',
        urgency: postData.urgency || 'medium',
        tags: Array.isArray(postData.tags) ? postData.tags : [],
        location: postData.location?.address || '',
        requiredDate: postData.preferredSchedule?.date || '',
      };
      setPreviewData(savedPreview);
      setPreviewVersions({ [postData.language || language || 'en']: savedPreview });
    }
  }, [route.params, language]);

  // Pick Image
  const pickImage = async () => {
    try {
      if (Platform.OS !== 'android') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            isSi ? 'අවසර අවශ්‍යයි' : 'Permission Required',
            isSi ? 'ඡායාරූප තේරීමට ගැලරිය වෙත අවසර ලබා දෙන්න.' : 'Gallery access is required.'
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        setSelectedImage(result.assets[0].uri);
        setPreviewData(null);
      }
    } catch (error) {
      console.error('IMAGE PICKER ERROR:', error);
      Alert.alert(isSi ? 'දෝෂයකි' : 'Error', isSi ? 'ඡායාරූපය තෝරා ගැනීමට නොහැකි විය.' : 'Could not select image.');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setOriginalImagePath(null);
    setPreviewData(null);
  };

  // Location Picker Handlers
  const handleUseCurrentLocation = async (updateDirectly = true) => {
    try {
      setLocatingGPS(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          isSi ? 'අවසර අවශ්‍යයි' : 'Permission Required',
          isSi
            ? 'වත්මන් ස්ථානය ලබා ගැනීමට Location අවසරය ලබා දෙන්න.'
            : 'Please grant location permission to detect your current position.'
        );
        return;
      }

      let servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled && Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
          servicesEnabled = await Location.hasServicesEnabledAsync();
        } catch {
          servicesEnabled = false;
        }
      }
      if (!servicesEnabled) {
        Alert.alert(
          isSi ? 'ස්ථාන සේවා අක්‍රියයි' : 'Location Services Off',
          isSi
            ? 'ඔබගේ උපාංගයේ Location සේවා සක්‍රිය කරන්න, නැතහොත් සිතියමෙන් ස්ථානයක් තෝරන්න.'
            : 'Turn on Location Services in your device settings, or choose a location on the map.'
        );
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      const newRegion = {
        ...coords,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      };

      setMapRegion(newRegion);
      setMapMarker(coords);
      if (mapRef.current?.animateToRegion) {
        mapRef.current.animateToRegion(newRegion, 800);
      }

      const [address] = await Location.reverseGeocodeAsync(coords);
      let formattedAddress = '';
      if (address) {
        const parts = [
          address.name || address.street,
          address.city || address.subregion,
          address.region || address.district,
        ].filter(Boolean);
        formattedAddress = parts.join(', ');
      }
      if (!formattedAddress) {
        formattedAddress = `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`;
      }

      setTempLocationAddress(formattedAddress);
      if (updateDirectly) {
        setServiceLocation(formattedAddress);
        if (formErrors.location) {
          setFormErrors((prev) => ({ ...prev, location: null }));
        }
      }
    } catch (error) {
      console.error('LOCATION ERROR:', error);
      Alert.alert(
        isSi ? 'දෝෂයකි' : 'Error',
        isSi
          ? 'වත්මන් ස්ථානය ලබා ගැනීමට නොහැකි විය. Location සේවා සක්‍රිය කරන්න, නැතහොත් සිතියමෙන් ස්ථානයක් තෝරන්න.'
          : 'Could not detect your current location. Check that Location Services are on, or choose a location on the map.'
      );
    } finally {
      setLocatingGPS(false);
    }
  };

  const handleMapPress = async (event) => {
    const { coordinate } = event.nativeEvent;
    if (!coordinate) return;
    setMapMarker(coordinate);
    const coordinateFallback = `${coordinate.latitude.toFixed(4)}, ${coordinate.longitude.toFixed(4)}`;

    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        setTempLocationAddress(coordinateFallback);
        return;
      }

      const [address] = await Location.reverseGeocodeAsync({
        latitude: coordinate.latitude,
        longitude: coordinate.longitude,
      });
      if (address) {
        const parts = [
          address.name || address.street,
          address.city || address.subregion,
          address.region || address.district,
        ].filter(Boolean);
        const formatted = parts.join(', ') || coordinateFallback;
        setTempLocationAddress(formatted);
      } else {
        setTempLocationAddress(coordinateFallback);
      }
    } catch (err) {
      setTempLocationAddress(coordinateFallback);
    }
  };

  const handleSelectDistrict = (dist) => {
    setServiceLocation(dist);
    setTempLocationAddress(dist);
    if (formErrors.location) {
      setFormErrors((prev) => ({ ...prev, location: null }));
    }
    setShowLocationModal(false);
  };

  const handleConfirmLocation = () => {
    if (tempLocationAddress.trim()) {
      setServiceLocation(tempLocationAddress.trim());
      if (formErrors.location) {
        setFormErrors((prev) => ({ ...prev, location: null }));
      }
    }
    setShowLocationModal(false);
  };

  // Auto detect fields when description changes
  const handleDescriptionBlur = () => {
    setActiveField(null);
    if (!description.trim()) return;
    const extracted = extractDetailsFromInput(`${title} ${description}`);
    if (!serviceLocation.trim() && extracted.location) setServiceLocation(extracted.location);
    if (!requiredDate.trim() && extracted.date) setRequiredDate(extracted.date);
    if ((!urgency || urgency === 'medium') && extracted.urgency) setUrgency(extracted.urgency);
  };

  // Generate AI Preview
  const generatePreview = async (targetLanguage = postLanguage, includeImage = true) => {
    if (!title.trim() && !description.trim() && !selectedImage) {
      Alert.alert(
        isSi ? 'විස්තර ඇතුළත් කරන්න' : 'Add Details',
        isSi ? 'ඉදිරියට යාමට මාතෘකාවක්, විස්තරයක් හෝ ඡායාරූපයක් එක් කරන්න.' : 'Enter a title, description or upload an image to continue.'
      );
      return;
    }

    const extracted = extractDetailsFromInput(`${title} ${description}`);
    const resolvedLocation = serviceLocation.trim() || extracted.location || '';
    const resolvedDate = requiredDate.trim() || extracted.date || '';
    const resolvedUrgency = urgency || extracted.urgency || '';

    if (!serviceLocation.trim() && resolvedLocation) setServiceLocation(resolvedLocation);
    if (!requiredDate.trim() && resolvedDate) setRequiredDate(resolvedDate);
    if (!urgency && resolvedUrgency) setUrgency(resolvedUrgency);

    const errors = {};
    if (!resolvedLocation.trim()) {
      errors.location = isSi ? 'සේවා ස්ථානය ඇතුළත් කිරීම අනිවාර්යයි.' : 'Please enter a service location.';
    }
    if (!resolvedDate.trim()) {
      errors.date = isSi ? 'අවශ්‍ය දිනය තෝරා ගැනීම අනිවාර්යයි.' : 'Please select a preferred date.';
    }
    if (!resolvedUrgency) {
      errors.urgency = isSi ? 'හදිසිභාවය තෝරා ගැනීම අනිවාර්යයි.' : 'Please choose an urgency level.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      Alert.alert(
        isSi ? 'අනිවාර්ය තොරතුරු අවශ්‍යයි' : 'Missing Information',
        isSi
          ? 'AI මඟින් සටහන සකස් කිරීමට ස්ථානය (Location), දිනය (Date) සහ හදිසිභාවය (Urgency) ඇතුළත් කිරීම අනිවාර්ය වේ.'
          : 'Add a service location, preferred date, and urgency level to continue.'
      );
      return;
    }

    setFormErrors({});
    setPreviewLoading(true);

    try {
      const formData = new FormData();
      if (
        selectedImage &&
        includeImage &&
        !/^https?:\/\//i.test(selectedImage)
      ) {
        formData.append('image', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'post.jpg',
        });
      }

      formData.append('title', title || '');
      formData.append('description', description || '');
      formData.append('language', targetLanguage);
      formData.append('location', resolvedLocation);
      formData.append('urgency', resolvedUrgency);
      formData.append('requiredDate', resolvedDate);

      const loggedUser = await getLoggedUser();
      if (loggedUser && loggedUser.userId) {
        formData.append('userId', loggedUser.userId);
      }

      const response = await axios.post(`${API_BASE_URL}/posts/preview`, formData, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'multipart/form-data',
        },
        validateStatus: () => true,
      });

      let data;
      try {
        data = typeof response.data === 'string'
          ? JSON.parse(response.data)
          : response.data || {};
      } catch {
        Alert.alert(isSi ? 'දෝෂයකි' : 'Server Error', 'Backend returned invalid JSON.');
        return;
      }

      if (response.status >= 200 && response.status < 300 && data.success && data.preview) {
        const enhancedPreview = {
          ...data.preview,
          image: data.preview.image || previewData?.image || null,
          location: resolvedLocation,
          urgency: resolvedUrgency,
          requiredDate: resolvedDate,
        };
        setPreviewData(enhancedPreview);
        setPreviewVersions((previous) => ({ ...previous, [targetLanguage]: enhancedPreview }));
        setPostLanguage(targetLanguage);
        if (data.preview.title) setTitle(data.preview.title);
        if (data.preview.description) setDescription(data.preview.description);
        setPreviewVisible(true);
      } else {
        Alert.alert(
          isSi ? 'අසාර්ථකයි' : 'Preview Failed',
          data.error || data.message || (isSi ? 'පෙරදසුනක් සකස් කළ නොහැකි විය.' : 'Could not generate preview.')
        );
      }
    } catch (error) {
      console.error('PREVIEW ERROR:', error);
      Alert.alert(isSi ? 'සම්බන්ධතා දෝෂයකි' : 'Network Error', error.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const selectPreviewLanguage = async (targetLanguage) => {
    const existingPreview = previewVersions[targetLanguage];
    if (existingPreview) {
      setPostLanguage(targetLanguage);
      setPreviewData(existingPreview);
      setTitle(existingPreview.title || '');
      setDescription(existingPreview.description || '');
      return;
    }

    setTranslationTarget(targetLanguage);
    try {
      await generatePreview(targetLanguage, false);
    } finally {
      setTranslationTarget(null);
    }
  };

  // Save / Publish Post
  const savePost = async () => {
    if (!title.trim() && !description.trim()) {
      Alert.alert(
        isSi ? 'විස්තර ඇතුළත් කරන්න' : 'Missing Details',
        isSi ? 'පළ කිරීමට පෙර මාතෘකාවක් හෝ විස්තරයක් එක් කරන්න.' : 'Add a title or description before publishing.'
      );
      return;
    }

    if (!serviceLocation.trim() || !requiredDate.trim() || !urgency) {
      const errors = {};
      if (!serviceLocation.trim()) errors.location = isSi ? 'සේවා ස්ථානය අනිවාර්යයි.' : 'Please enter a service location.';
      if (!requiredDate.trim()) errors.date = isSi ? 'අවශ්‍ය දිනය අනිවාර්යයි.' : 'Please select a preferred date.';
      if (!urgency) errors.urgency = isSi ? 'හදිසිභාවය අනිවාර්යයි.' : 'Please choose an urgency level.';
      setFormErrors(errors);
      Alert.alert(
        isSi ? 'අනිවාර්ය තොරතුරු සම්පූර්ණ කරන්න' : 'Missing Information',
        isSi
          ? 'පළ කිරීමට පෙර කරුණාකර ස්ථානය, දිනය සහ හදිසිභාවය ඇතුළත් කරන්න.'
          : 'Please provide Location, Date, and Urgency before publishing.'
      );
      return;
    }

    const loggedUser = await getLoggedUser();
    if (!loggedUser || !loggedUser.userId) {
      Alert.alert(
        isSi ? 'ලොග් වීම අවශ්‍යයි' : 'Login Required',
        isSi ? 'කරුණාකර නැවත ලොග් වන්න.' : 'Could not find your user ID. Please logout and login again.'
      );
      return;
    }

    const token = await AsyncStorage.getItem('userToken');
    if (!token) {
      Alert.alert(
        isSi ? 'ලොග් වීම අවශ්‍යයි' : 'Login Required',
        isSi ? 'කරුණාකර නැවත ලොග් වන්න.' : 'Your login session expired. Please log in again.'
      );
      return;
    }

    const seekerId = loggedUser.userId;
    let finalImagePath = null;

    if (isEditMode) {
      if (previewData?.image && selectedImage !== getImageUrl(originalImagePath)) {
        finalImagePath = previewData.image;
      } else if (originalImagePath) {
        finalImagePath = originalImagePath;
      }
    } else {
      finalImagePath = previewData?.image || null;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      language: postLanguage,
      image: finalImagePath,
      category: previewData?.category || 'General',
      tags: Array.isArray(previewData?.tags) ? previewData.tags : [],
      urgency: previewData?.urgency || urgency || 'medium',
      location: { address: previewData?.location || serviceLocation.trim() },
      preferredSchedule: {
        date: previewData?.requiredDate || requiredDate.trim(),
        flexible: true,
      },
      seekerId,
      userId: seekerId,
    };

    let url = `${API_BASE_URL}/posts/publish`;
    let method = 'POST';

    if (isEditMode) {
      if (!editPostId) {
        Alert.alert(isSi ? 'දෝෂයකි' : 'Error', 'Post ID is missing.');
        return;
      }
      url = `${API_BASE_URL}/posts/update/${editPostId}`;
      method = 'PUT';
    }

    setLoading(true);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch {
        Alert.alert(isSi ? 'දෝෂයකි' : 'Server Error', 'Backend did not return valid JSON.');
        return;
      }

      if (response.ok && data.success) {
        Alert.alert(
          isSi ? 'සාර්ථකයි!' : 'Success',
          isEditMode
            ? (isSi ? 'පළකිරීම සාර්ථකව යාවත්කාලීන විය!' : 'Post updated successfully!')
            : (isSi ? 'ඔබගේ ඉල්ලීම සාර්ථකව පළ කරන ලදී!' : 'Post published successfully!'),
          [
            {
              text: isSi ? 'හරි' : 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert(
          isSi ? 'අසාර්ථකයි' : 'Save Failed',
          data.error || data.message || 'Something went wrong.'
        );
      }
    } catch (error) {
      console.error('SAVE ERROR:', error);
      Alert.alert(isSi ? 'සම්බන්ධතා දෝෂයකි' : 'Network Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const urgencyOptions = [
    { key: 'low', label: isSi ? 'නම්‍යශීලී' : 'Flexible', icon: 'leaf-outline', color: '#10B981' },
    { key: 'medium', label: isSi ? 'සාමාන්‍ය' : 'Standard', icon: 'time-outline', color: '#6366F1' },
    { key: 'high', label: isSi ? 'හදිසි' : 'Urgent', icon: 'flash-outline', color: '#F59E0B' },
    { key: 'emergency', label: isSi ? 'ඉතා හදිසි' : 'Emergency', icon: 'flame-outline', color: '#EF4444' },
  ];

  const postLanguageOptions = [
    { key: 'en', label: 'English' },
    { key: 'si', label: 'සිංහල' },
  ];

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? '#0F172A' : '#4338CA'}
      />

      {/* Modern App Bar */}
      <PageHeader title={<>{isEditMode
              ? (isSi ? 'පළකිරීම සංස්කරණය' : 'Edit Service Request')
              : (isSi ? 'නව සේවා ඉල්ලුම' : 'Create Service Request')}</>} subtitle={<>{isSi ? 'AI තාක්ෂණයෙන් පහසුවෙන් පළ කරන්න' : 'Powered by Smart AI Assistant'}</>} onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Service Information */}
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBubble, { backgroundColor: isDarkMode ? '#1E1B4B' : '#EEF2FF' }]}>
                <Ionicons name="create-outline" size={18} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, isDarkMode && styles.textDark]}>
                  {isSi ? 'සේවාවේ විස්තර' : 'Job Information'}
                </Text>
                <Text style={[styles.cardSubtitle, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'ඔබට අවශ්‍ය දේ කෙටියෙන් සඳහන් කරන්න' : 'What do you need help with?'}
                </Text>
              </View>
            </View>

            {/* Title Input */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>
                {isSi ? 'මාතෘකාව' : 'Post Title'} <Text style={styles.requiredAsterisk}>*</Text>
              </Text>
              <View
                style={[
                  styles.textInputBox,
                  isDarkMode && styles.textInputBoxDark,
                  activeField === 'title' && (isDarkMode ? styles.textInputBoxActiveDark : styles.textInputBoxActive),
                ]}
              >
                <TextInput
                  style={[
                    styles.inputControl,
                    { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                  ]}
                  placeholder={isSi ? 'උදා: කාන්දුවන නළයක් අලුත්වැඩියාව…' : 'e.g., Fix leaking pipe under sink…'}
                  placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                  value={title}
                  onChangeText={setTitle}
                  onFocus={() => setActiveField('title')}
                  onBlur={() => setActiveField(null)}
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>
                  {isSi ? 'සවිස්තරාත්මක විස්තරය' : 'Detailed Description'}
                </Text>
                <Text style={[styles.charHint, isDarkMode && styles.textMutedDark]}>
                  {description.length} {isSi ? 'අකුරු' : 'chars'}
                </Text>
              </View>

              <View
                style={[
                  styles.textAreaBox,
                  isDarkMode && styles.textInputBoxDark,
                  activeField === 'desc' && (isDarkMode ? styles.textInputBoxActiveDark : styles.textInputBoxActive),
                ]}
              >
                <TextInput
                  style={[
                    styles.textAreaControl,
                    { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                  ]}
                  multiline
                  numberOfLines={4}
                  placeholder={
                    isSi
                      ? 'ගැටලුව පිළිබඳ විස්තරයක්, ස්ථානය සහ දිනය සඳහන් කරන්න. අපගේ AI මඟින් අවශ්‍ය තොරතුරු ස්වයංක්‍රීයව හඳුනාගනී…'
                      : 'Describe the issue or service needed. Mention location and urgency; our AI will extract them automatically…'
                  }
                  placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                  value={description}
                  onChangeText={setDescription}
                  onFocus={() => setActiveField('desc')}
                  onBlur={handleDescriptionBlur}
                />
              </View>
            </View>

          </View>

          {/* Card 2: Requirements (Location, Date & Urgency) */}
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBubble, { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5' }]}>
                <Ionicons name="options-outline" size={18} color="#10B981" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, isDarkMode && styles.textDark]}>
                  {isSi ? 'අවශ්‍යතා සහ මනාපයන්' : 'Requirements & Schedule'}
                </Text>
                <Text style={[styles.cardSubtitle, { color: '#EF4444', fontWeight: '700' }]}>
                  {isSi ? 'ස්ථානය, දිනය සහ හදිසිභාවය අනිවාර්ය වේ' : 'Location, Date, and Urgency are mandatory'}
                </Text>
              </View>
            </View>

            {/* Location Input with Location Picker Actions */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>
                  {isSi ? 'සේවාව අවශ්‍ය ස්ථානය' : 'Service Location'} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
              </View>

              <View
                style={[
                  styles.textInputBox,
                  styles.locationInputBox,
                  isDarkMode && styles.textInputBoxDark,
                  formErrors.location && styles.inputBoxError,
                  activeField === 'loc' && (isDarkMode ? styles.textInputBoxActiveDark : styles.textInputBoxActive),
                ]}
              >
                <Ionicons name="location-outline" size={18} color="#4F46E5" style={{ marginRight: 6 }} />
                <TextInput
                  style={[
                    styles.inputControl,
                    { color: isDarkMode ? '#F8FAFC' : '#0F172A' },
                  ]}
                  placeholder={isSi ? 'උදා: කොළඹ 03, නාවල, මහනුවර…' : 'e.g., Colombo 03, Kandy, Rajagiriya…'}
                  placeholderTextColor={isDarkMode ? '#64748B' : '#94A3B8'}
                  value={serviceLocation}
                  onChangeText={(text) => {
                    setServiceLocation(text);
                    if (formErrors.location) setFormErrors((prev) => ({ ...prev, location: null }));
                  }}
                  onFocus={() => setActiveField('loc')}
                  onBlur={() => setActiveField(null)}
                />

                {/* Quick GPS Auto-detect Button */}
                <TouchableOpacity
                  style={[styles.quickGpsBtn, isDarkMode && styles.quickGpsBtnDark]}
                  onPress={() => handleUseCurrentLocation(true)}
                  disabled={locatingGPS}
                  activeOpacity={0.75}
                  accessibilityLabel="Auto-detect current location"
                >
                  {locatingGPS ? (
                    <ActivityIndicator size="small" color="#4F46E5" />
                  ) : (
                    <Ionicons name="locate" size={17} color="#4F46E5" />
                  )}
                </TouchableOpacity>

                {/* Open Location Picker Modal Button */}
                <TouchableOpacity
                  style={styles.openPickerBtn}
                  onPress={() => {
                    setTempLocationAddress(serviceLocation || '');
                    setShowLocationModal(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <Text style={styles.openPickerBtnText}>
                    {isSi ? 'සිතියම' : 'Map'}
                  </Text>
                </TouchableOpacity>
              </View>
              {formErrors.location && (
                <Text style={styles.fieldErrorText}>{formErrors.location}</Text>
              )}
            </View>

            {/* Date Picker Button */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>
                  {isSi ? 'අවශ්‍ය දිනය' : 'Preferred Date'} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.dateButton,
                  isDarkMode && styles.textInputBoxDark,
                  formErrors.date && styles.inputBoxError,
                ]}
                onPress={() => setShowRequiredDatePicker((visible) => !visible)}
                activeOpacity={0.75}
              >
                <View style={styles.dateBtnLeft}>
                  <Ionicons name="calendar-outline" size={18} color="#4F46E5" />
                  <Text style={[styles.dateButtonText, !requiredDate && styles.placeholderText, isDarkMode && requiredDate && styles.textDark]}>
                    {requiredDate || (isSi ? 'දිනයක් තෝරන්න' : 'Select a date')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={isDarkMode ? '#94A3B8' : '#94A3AF'} />
              </TouchableOpacity>
              {formErrors.date && (
                <Text style={styles.fieldErrorText}>{formErrors.date}</Text>
              )}

              {showRequiredDatePicker && (
                <DateTimePicker
                  value={getPickerDate(requiredDate)}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    if (Platform.OS !== 'ios' || event.type === 'dismissed') {
                      setShowRequiredDatePicker(false);
                    }
                    if (event.type === 'set' && selectedDate) {
                      setRequiredDate(formatDateForPost(selectedDate));
                      if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: null }));
                    }
                  }}
                />
              )}
            </View>

            {/* Urgency Selector */}
            <View style={styles.fieldGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.fieldLabel, isDarkMode && styles.textDark]}>
                  {isSi ? 'හදිසිභාවය' : 'Urgency Level'} <Text style={styles.requiredAsterisk}>*</Text>
                </Text>
              </View>

              <View style={styles.urgencyGrid}>
                {urgencyOptions.map((opt) => {
                  const isSelected = (urgency || '').toLowerCase() === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => {
                        setUrgency(opt.key);
                        if (formErrors.urgency) setFormErrors((prev) => ({ ...prev, urgency: null }));
                      }}
                      style={[
                        styles.urgencyPill,
                        isDarkMode && styles.urgencyPillDark,
                        formErrors.urgency && styles.inputBoxError,
                        isSelected && {
                          backgroundColor: isDarkMode ? 'rgba(99, 102, 241, 0.18)' : '#EEF2FF',
                          borderColor: opt.color,
                          borderWidth: 1.5,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={opt.icon}
                        size={15}
                        color={isSelected ? opt.color : isDarkMode ? '#94A3B8' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.urgencyPillText,
                          isDarkMode && styles.textDark,
                          isSelected && { color: opt.color, fontWeight: '700' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {formErrors.urgency && (
                <Text style={styles.fieldErrorText}>{formErrors.urgency}</Text>
              )}
            </View>
          </View>

          {/* Card 3: Photo Attachment */}
          <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
            <View style={styles.cardHeaderRow}>
              <View style={[styles.cardIconBubble, { backgroundColor: isDarkMode ? '#451A03' : '#FFFBEB' }]}>
                <Ionicons name="camera-outline" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, isDarkMode && styles.textDark]}>
                  {isSi ? 'ඡායාරූපය (වෛකල්පික)' : 'Photo Attachment'}
                </Text>
                <Text style={[styles.cardSubtitle, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'ගැටලුව පැහැදිලි කිරීමට පින්තූරයක් එක් කරන්න' : 'Help providers understand the job with a picture'}
                </Text>
              </View>
            </View>

            {selectedImage ? (
              <View style={styles.imageCard}>
                <Image source={{ uri: selectedImage }} style={styles.attachedImage} />
                <View style={styles.imageOverlayControls}>
                  <TouchableOpacity
                    style={styles.imageOverlayBtn}
                    onPress={pickImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="refresh" size={16} color="#FFFFFF" />
                    <Text style={styles.imageOverlayBtnText}>{isSi ? 'වෙනස් කරන්න' : 'Change'}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imageOverlayBtn, styles.imageDeleteBtn]}
                    onPress={removeImage}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.imageOverlayBtnText}>{isSi ? 'ඉවත් කරන්න' : 'Remove'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadBox, isDarkMode && styles.uploadBoxDark]}
                onPress={pickImage}
                activeOpacity={0.7}
              >
                <View style={styles.uploadIconCircle}>
                  <Ionicons name="cloud-upload-outline" size={24} color="#4F46E5" />
                </View>
                <Text style={[styles.uploadPrimaryText, isDarkMode && styles.textDark]}>
                  {isSi ? 'ඡායාරූපයක් එක් කරන්න' : 'Upload or Take a Photo'}
                </Text>
                <Text style={[styles.uploadSecondaryText, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'JPG, PNG ගොනු සහාය දක්වයි' : 'Supports JPG, PNG up to 5MB'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Card 4: AI Smart Assist Summary (If Generated) */}
          {previewData && (
            <View style={[styles.previewReadyCard, isDarkMode && styles.previewReadyCardDark]}>
              <View style={styles.previewReadyHeader}>
                <View style={styles.previewSparkleWrap}>
                  <Ionicons name="sparkles" size={16} color="#4F46E5" />
                </View>
                <Text style={[styles.previewReadyTitle, isDarkMode && styles.textDark]}>
                  {isSi ? 'AI මඟින් හඳුනාගත් තොරතුරු' : 'AI Generated Enhancements'}
                </Text>
                <TouchableOpacity onPress={() => setPreviewVisible(true)}>
                  <Text style={styles.previewViewLink}>{isSi ? 'සම්පූර්ණ පෙරදසුන' : 'View Full'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.previewQuickChips}>
                {previewData.category && (
                  <View style={styles.quickChip}>
                    <Ionicons name="construct-outline" size={12} color="#4F46E5" />
                    <Text style={styles.quickChipText}>{previewData.category}</Text>
                  </View>
                )}
                {previewData.urgency && (
                  <View style={styles.quickChip}>
                    <Ionicons name="flash-outline" size={12} color="#D97706" />
                    <Text style={styles.quickChipText}>{previewData.urgency}</Text>
                  </View>
                )}
              </View>

              {previewData.tags && previewData.tags.length > 0 && (
                <View style={styles.tagsRow}>
                  {previewData.tags.slice(0, 4).map((tag, i) => (
                    <Text key={i} style={[styles.tagPill, isDarkMode && styles.tagPillDark]}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Action Buttons Section */}
          <View style={styles.actionButtonsSection}>
            {/* 1. Generate AI Preview Button */}
            <TouchableOpacity
              style={styles.previewActionBtn}
              onPress={() => generatePreview()}
              disabled={previewLoading || loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#8B5CF6', '#6366F1']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                {previewLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={20} color="#FFFFFF" />
                    <Text style={styles.actionBtnText}>
                      {isSi ? 'AI පෙරදසුන සකසන්න' : 'Generate AI Preview'}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* 2. Publish / Update Post Button */}
            <TouchableOpacity
              style={styles.publishActionBtn}
              onPress={savePost}
              disabled={loading || previewLoading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#4338CA', '#4F46E5']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={isEditMode ? 'checkmark-circle-outline' : 'paper-plane-outline'}
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.actionBtnText}>
                      {isEditMode
                        ? (isSi ? 'පළකිරීම යාවත්කාලීන කරන්න' : 'Update Post')
                        : (isSi ? 'පළකිරීම ප්‍රසිද්ධ කරන්න' : 'Publish Post')}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bottom spacing so content easily scrolls above BottomNav */}
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* AI Preview Bottom Sheet / Modal */}
      <Modal
        visible={previewVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]}>
            {/* Modal Drag Bar */}
            <View style={styles.modalDragHandle} />

            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="sparkles" size={18} color="#4F46E5" />
                <Text style={[styles.modalHeading, isDarkMode && styles.textDark]}>
                  {isSi ? 'AI පෙරදසුන' : 'AI Generated Post Review'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPreviewVisible(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={isDarkMode ? '#94A3B8' : '#94A3AF'} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.languagePreviewHint, isDarkMode && styles.textMutedDark]}>
              {isSi
                ? 'භාෂාවක් තෝරන්න. තවම සකස් කර නැති භාෂාව තෝරාගත් විට පරිවර්තනය වේ.'
                : 'Choose a language. The other version will be translated when selected.'}
            </Text>
            <View style={styles.languageOptions}>
              {postLanguageOptions.map((option) => {
                const isSelected = postLanguage === option.key;
                const hasPreview = Boolean(previewVersions[option.key]);
                const buttonLabel = hasPreview
                  ? option.label
                  : option.key === 'si'
                  ? (isSi ? 'සිංහලට පරිවර්තනය' : 'Translate to Sinhala')
                  : (isSi ? 'ඉංග්‍රීසියට පරිවර්තනය' : 'Translate to English');
                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => selectPreviewLanguage(option.key)}
                    disabled={previewLoading}
                    style={[
                      styles.languageOption,
                      isDarkMode && styles.urgencyPillDark,
                      isSelected && (isDarkMode ? styles.languageOptionSelectedDark : styles.languageOptionSelected),
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected, disabled: previewLoading }}
                    activeOpacity={0.75}
                  >
                    {previewLoading && translationTarget === option.key ? (
                      <ActivityIndicator size="small" color={isDarkMode ? '#A5B4FC' : '#4338CA'} />
                    ) : (
                      <Text
                        style={[
                          styles.urgencyPillText,
                          isDarkMode && styles.textDark,
                          isSelected && (isDarkMode ? styles.languageOptionTextSelectedDark : styles.languageOptionTextSelected),
                        ]}
                      >
                        {buttonLabel}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {previewData?.image && (
                <Image
                  source={{ uri: getImageUrl(previewData.image) }}
                  style={styles.modalPreviewImage}
                />
              )}

              <View style={styles.modalDetailBlock}>
                <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'මාතෘකාව' : 'Title'}
                </Text>
                <Text style={[styles.modalValueTitle, isDarkMode && styles.textDark]}>
                  {previewData?.title || title}
                </Text>
              </View>

              <View style={styles.modalDetailBlock}>
                <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'විස්තරය' : 'Description'}
                </Text>
                <Text style={[styles.modalValueDesc, isDarkMode && styles.textDark]}>
                  {previewData?.description || description}
                </Text>
              </View>

              <View style={styles.modalGridRow}>
                <View style={styles.modalGridCol}>
                  <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                    {isSi ? 'කාණ්ඩය' : 'Category'}
                  </Text>
                  <Text style={[styles.modalBadgeText, { color: '#4F46E5' }]}>
                    {previewData?.category || 'General'}
                  </Text>
                </View>

                <View style={styles.modalGridCol}>
                  <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                    {isSi ? 'හදිසිභාවය' : 'Urgency'}
                  </Text>
                  <Text style={[styles.modalBadgeText, { color: '#D97706' }]}>
                    {previewData?.urgency || urgency}
                  </Text>
                </View>
              </View>

              {(previewData?.location || serviceLocation) ? (
                <View style={styles.modalDetailBlock}>
                  <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                    {isSi ? 'ස්ථානය' : 'Location'}
                  </Text>
                  <Text style={[styles.modalValueDesc, isDarkMode && styles.textDark]}>
                    {previewData?.location || serviceLocation}
                  </Text>
                </View>
              ) : null}

              {(previewData?.requiredDate || requiredDate) ? (
                <View style={styles.modalDetailBlock}>
                  <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                    {isSi ? 'අවශ්‍ය දිනය' : 'Preferred Date'}
                  </Text>
                  <Text style={[styles.modalValueDesc, isDarkMode && styles.textDark]}>
                    {previewData?.requiredDate || requiredDate}
                  </Text>
                </View>
              ) : null}

              {previewData?.tags && previewData.tags.length > 0 && (
                <View style={styles.modalDetailBlock}>
                  <Text style={[styles.modalLabel, isDarkMode && styles.textMutedDark]}>
                    {isSi ? 'ටැග් (Tags)' : 'Generated Tags'}
                  </Text>
                  <View style={styles.modalTagsWrap}>
                    {previewData.tags.map((tag, idx) => (
                      <View key={idx} style={[styles.tagBadge, isDarkMode && styles.tagBadgeDark]}>
                        <Text style={styles.tagBadgeText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Modal Buttons */}
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.modalEditBtn, isDarkMode && styles.modalEditBtnDark]}
                onPress={() => setPreviewVisible(false)}
              >
                <Text style={[styles.modalEditBtnText, isDarkMode && styles.textDark]}>
                  {isSi ? 'සංස්කරණය' : 'Edit Details'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPublishBtn}
                onPress={() => {
                  setPreviewVisible(false);
                  savePost();
                }}
              >
                <LinearGradient
                  colors={['#4338CA', '#4F46E5']}
                  style={styles.modalPublishGradient}
                >
                  <Text style={styles.modalPublishText}>
                    {isSi ? 'තහවුරු කර පළ කරන්න' : 'Confirm & Publish'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.locationModalContent, isDarkMode && styles.modalContentDark]}>
            <View style={styles.modalDragHandle} />

            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="map" size={18} color="#4F46E5" />
                <Text style={[styles.modalHeading, isDarkMode && styles.textDark]}>
                  {isSi ? 'සේවා ස්ථානය තෝරන්න' : 'Choose Service Location'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowLocationModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={24} color={isDarkMode ? '#94A3B8' : '#94A3AF'} />
              </TouchableOpacity>
            </View>

            {/* GPS Detect Banner */}
            <TouchableOpacity
              style={[styles.detectGpsBanner, isDarkMode && styles.detectGpsBannerDark]}
              onPress={() => handleUseCurrentLocation(false)}
              disabled={locatingGPS}
              activeOpacity={0.8}
            >
              <View style={styles.detectGpsIcon}>
                {locatingGPS ? (
                  <ActivityIndicator size="small" color="#4F46E5" />
                ) : (
                  <Ionicons name="navigate" size={18} color="#4F46E5" />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detectGpsTitle, isDarkMode && styles.textDark]}>
                  {isSi ? 'වත්මන් GPS ස්ථානය ලබා ගන්න' : 'Use Current GPS Location'}
                </Text>
                <Text style={[styles.detectGpsSubtitle, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'ඔබ සිටින තැන ස්වයංක්‍රීයව සලකුණු කරයි' : 'Tap to automatically pin where you are'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Interactive Map */}
            <View style={styles.mapContainer}>
              <MapView
                ref={mapRef}
                style={styles.mapView}
                region={mapRegion}
                onPress={handleMapPress}
              >
                {mapMarker && (
                  <Marker
                    coordinate={mapMarker}
                    title={isSi ? 'තෝරාගත් ස්ථානය' : 'Selected Location'}
                    description={tempLocationAddress}
                  />
                )}
              </MapView>
              <View style={styles.mapHintBadge}>
                <Text style={styles.mapHintText}>
                  {isSi ? 'සිතියම මත අවශ්‍ය තැන tap කරන්න' : 'Tap anywhere on map to move pin'}
                </Text>
              </View>
            </View>

            {/* Selected Address Card */}
            <View style={[styles.selectedAddressCard, isDarkMode && styles.selectedAddressCardDark]}>
              <Ionicons name="location" size={18} color="#4F46E5" style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.selectedAddressLabel, isDarkMode && styles.textMutedDark]}>
                  {isSi ? 'තෝරාගත් ස්ථානය:' : 'Selected Address:'}
                </Text>
                <Text style={[styles.selectedAddressText, isDarkMode && styles.textDark]} numberOfLines={2}>
                  {tempLocationAddress || (isSi ? 'ස්ථානයක් තෝරා නැත (සිතියම tap කරන්න)' : 'Tap map or use GPS above')}
                </Text>
              </View>
            </View>

            {/* Quick District Selector */}
            <Text style={[styles.quickDistrictsHeader, isDarkMode && styles.textMutedDark]}>
              {isSi ? 'දිස්ත්‍රික්කයෙන් ඉක්මනින් තෝරන්න:' : 'Or Quick Select District:'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.districtChipsScroll}>
              {SRI_LANKA_DISTRICTS.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.districtChip,
                    isDarkMode && styles.districtChipDark,
                    tempLocationAddress.toLowerCase().includes(dist.toLowerCase()) && styles.districtChipActive,
                  ]}
                  onPress={() => handleSelectDistrict(dist)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.districtChipText,
                      isDarkMode && styles.textDark,
                      tempLocationAddress.toLowerCase().includes(dist.toLowerCase()) && styles.districtChipTextActive,
                    ]}
                  >
                    {dist}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Confirm Button */}
            <TouchableOpacity
              style={styles.confirmLocationBtn}
              onPress={handleConfirmLocation}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#4338CA', '#4F46E5']}
                style={styles.confirmLocationGradient}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmLocationText}>
                  {isSi ? 'මෙම ස්ථානය තහවුරු කරන්න' : 'Confirm Location'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =======================================================
// PROFESSIONAL DESIGN STYLES
// =======================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  containerDark: {
    backgroundColor: '#090D16',
  },

  // App Bar
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 10 : 12,
  },
  headerBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 10.5,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 2,
  },
  headerRightBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 3,
  },
  aiBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Scroll Content
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },

  // Section Cards
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#4338CA',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
      },
      android: {
        elevation: 1.5,
      },
    }),
  },
  sectionCardDark: {
    backgroundColor: '#111827',
    borderColor: '#1F2937',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  cardIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },

  // Field Groups & Inputs
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  requiredAsterisk: {
    color: '#EF4444',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  charHint: {
    fontSize: 11,
    color: '#94A3B8',
  },
  textInputBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    minHeight: 46,
    justifyContent: 'center',
  },
  textInputBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  textInputBoxActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#FFFFFF',
  },
  textInputBoxActiveDark: {
    borderColor: '#818CF8',
    backgroundColor: '#1E293B',
  },
  inputBoxError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  fieldErrorText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputControl: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingVertical: 8,
  },
  textAreaBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 96,
  },
  textAreaControl: {
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
  },

  // Date Button
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  dateBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateButtonText: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '500',
  },
  placeholderText: {
    color: '#94A3B8',
    fontWeight: '400',
  },

  languageOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  languageOption: {
    flex: 1,
    minHeight: 42,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
  },
  languageOptionSelected: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
    borderWidth: 1.5,
  },
  languageOptionSelectedDark: {
    backgroundColor: 'rgba(99, 102, 241, 0.18)',
    borderColor: '#818CF8',
    borderWidth: 1.5,
  },
  languageOptionTextSelected: {
    color: '#4338CA',
    fontWeight: '700',
  },
  languageOptionTextSelectedDark: {
    color: '#A5B4FC',
  },

  // Urgency Pills Grid
  urgencyGrid: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  urgencyPill: {
    flex: 1,
    minWidth: '46%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 9,
    paddingHorizontal: 8,
    gap: 6,
  },
  urgencyPillDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  urgencyPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },

  // Image Upload Box
  uploadBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    paddingVertical: 24,
    alignItems: 'center',
  },
  uploadBoxDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4F46E5',
    marginBottom: 2,
  },
  uploadSecondaryText: {
    fontSize: 11,
    color: '#94A3B8',
  },

  // Image Preview
  imageCard: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  attachedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
  },
  imageOverlayControls: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  imageOverlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  imageDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
  },
  imageOverlayBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },

  // AI Ready Card
  previewReadyCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginBottom: 14,
  },
  previewReadyCardDark: {
    backgroundColor: '#1E1B4B',
    borderColor: '#3730A3',
  },
  previewReadyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  previewSparkleWrap: {
    marginRight: 6,
  },
  previewReadyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
    flex: 1,
  },
  previewViewLink: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4F46E5',
    textDecorationLine: 'underline',
  },
  previewQuickChips: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#334155',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagPill: {
    fontSize: 11,
    color: '#6366F1',
    fontWeight: '600',
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagPillDark: {
    color: '#A5B4FC',
  },

  // Action Buttons Section
  actionButtonsSection: {
    marginTop: 10,
    gap: 12,
  },
  previewActionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#8B5CF6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  publishActionBtn: {
    borderRadius: 14,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
    gap: 8,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Modal Sheet Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalContentDark: {
    backgroundColor: '#111827',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalPreviewImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 14,
  },
  modalDetailBlock: {
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalValueTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalValueDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  modalGridRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 16,
  },
  modalGridCol: {
    flex: 1,
  },
  modalBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  modalTagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeDark: {
    backgroundColor: '#1E1B4B',
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4F46E5',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalEditBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalEditBtnDark: {
    backgroundColor: '#1F2937',
    borderColor: '#374151',
  },
  modalEditBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  modalPublishBtn: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalPublishGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPublishText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Location Input Box with Actions
  locationInputBox: {
    paddingRight: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickGpsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  quickGpsBtnDark: {
    backgroundColor: '#1E1B4B',
  },
  openPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openPickerBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Location Modal Styles
  locationModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '90%',
  },
  detectGpsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
    gap: 10,
  },
  detectGpsBannerDark: {
    backgroundColor: '#1E1B4B',
  },
  detectGpsIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detectGpsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  detectGpsSubtitle: {
    fontSize: 10.5,
    color: '#64748B',
    marginTop: 1,
  },
  mapContainer: {
    height: 180,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  mapView: {
    width: '100%',
    height: '100%',
  },
  mapHintBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapHintText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '600',
  },
  selectedAddressCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  selectedAddressCardDark: {
    backgroundColor: '#0F172A',
    borderColor: '#1E293B',
  },
  selectedAddressLabel: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#64748B',
  },
  selectedAddressText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 1,
  },
  quickDistrictsHeader: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  districtChipsScroll: {
    gap: 6,
    paddingBottom: 10,
  },
  districtChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  districtChipDark: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  districtChipActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#4F46E5',
  },
  districtChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  districtChipTextActive: {
    color: '#4F46E5',
    fontWeight: '700',
  },
  confirmLocationBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 6,
  },
  confirmLocationGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  confirmLocationText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },

  // Generic Dark Mode Helpers
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});
