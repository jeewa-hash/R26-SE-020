import React, { useState, useRef, useContext, useEffect } from 'react';
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
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '../context/LanguageContext';

const { width } = Dimensions.get('window');

const API_BASE_URL = Platform.OS === 'android' 
  ? 'http://10.0.2.2:6000'
  : 'http://localhost:6000';

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { t } = useTranslation();
  const { language } = useContext(LanguageContext);
  
  // Check if we're in edit mode
  const isEditMode = route.params?.editMode || false;
  const editPostData = route.params?.postData || null;
  
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [originalImagePath, setOriginalImagePath] = useState(null);
  const [activeField, setActiveField] = useState(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const titleScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  // Auto-fill form when in edit mode
  useEffect(() => {
    if (isEditMode && editPostData) {
      setTitle(editPostData.title || '');
      setDescription(editPostData.description || '');
      if (editPostData.image) {
        setSelectedImage(editPostData.image);
        setOriginalImagePath(editPostData.image);
      }
    }
  }, [isEditMode, editPostData]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common_error'), t('home_permission_gallery'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setOriginalImagePath(null);
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      Alert.alert(t('common_error'), t('create_post_title_required'));
      return;
    }
    if (!description.trim()) {
      Alert.alert(t('common_error'), t('create_post_desc_required'));
      return;
    }
    if (!selectedImage && !isEditMode) {
      Alert.alert(t('common_error'), t('create_post_image_required'));
      return;
    }
    
    setLoading(true);
    
    try {
      // If it's a new image (not from edit mode), upload it
      if (selectedImage && selectedImage !== originalImagePath && !selectedImage.startsWith('http')) {
        const formData = new FormData();
        formData.append('image', {
          uri: selectedImage,
          type: 'image/jpeg',
          name: 'post_image.jpg',
        });
        formData.append('title', title.trim());
        formData.append('description', description.trim());

        const response = await fetch(`${API_BASE_URL}/create`, {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const data = await response.json();
        
        if (response.ok) {
          Alert.alert(
            t('common_success'), 
            t('create_post_success'),
            [{ text: t('common_ok'), onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(t('common_error'), data.error || t('create_post_failed'));
        }
      } 
      // If in edit mode, update the existing post
      else if (isEditMode && editPostData) {
        const formData = new FormData();
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        
        // If image changed, upload new one
        if (selectedImage !== originalImagePath && selectedImage && !selectedImage.startsWith('http')) {
          formData.append('image', {
            uri: selectedImage,
            type: 'image/jpeg',
            name: 'post_image.jpg',
          });
        }
        
        const response = await fetch(`${API_BASE_URL}/update/${editPostData.id}`, {
          method: 'PUT',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        
        const data = await response.json();
        
        if (response.ok) {
          Alert.alert(
            t('common_success'), 
            t('create_post_update_success'),
            [{ text: t('common_ok'), onPress: () => navigation.goBack() }]
          );
        } else {
          Alert.alert(t('common_error'), data.error || t('create_post_update_failed'));
        }
      }
      
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert(t('common_error'), `${t('create_post_network_error')}: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <Animated.ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <LinearGradient
          colors={['#667eea', '#764ba2', '#f093fb']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroSection}
        >
          <Animated.View style={[styles.heroContent, { transform: [{ scale: titleScale }] }]}>
            <View style={styles.heroIconContainer}>
              <LinearGradient
                colors={['#ffffff', '#ffffffcc']}
                style={styles.heroIconBg}
              >
                <Ionicons name={isEditMode ? "create-outline" : "add-circle-outline"} size={32} color="#667eea" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>{isEditMode ? t('create_post_edit_title') : t('create_post_title')}</Text>
            <Text style={styles.heroSubtitle}>
              {isEditMode ? t('create_post_edit_subtitle') : t('create_post_subtitle')}
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Title Field */}
          <View style={[styles.inputContainer, activeField === 'title' && styles.inputContainerActive]}>
            <Text style={styles.inputLabel}>{t('create_post_what_need')} ✨</Text>
            <TextInput
              style={styles.titleInput}
              placeholder={t('create_post_title_placeholder')}
              placeholderTextColor="#9CA3AF"
              value={title}
              onChangeText={setTitle}
              onFocus={() => setActiveField('title')}
              onBlur={() => setActiveField(null)}
            />
            <View style={styles.inputChar}>
              <Text style={styles.charText}>{title.length}/100</Text>
            </View>
          </View>

          {/* Description Field */}
          <View style={[styles.inputContainer, activeField === 'desc' && styles.inputContainerActive]}>
            <Text style={styles.inputLabel}>{t('create_post_describe')} 📝</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder={t('create_post_desc_placeholder')}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={5}
              value={description}
              onChangeText={setDescription}
              onFocus={() => setActiveField('desc')}
              onBlur={() => setActiveField(null)}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Image Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>📸 {t('create_post_add_photo')}</Text>
            <Text style={styles.sectionSubtitle}>
              {isEditMode ? t('create_post_update_image_optional') : t('create_post_show_what_need')}
            </Text>
            
            {selectedImage ? (
              <View style={styles.imagePreviewWrapper}>
                <Image 
                  source={{ uri: selectedImage.startsWith('http') ? selectedImage : selectedImage }} 
                  style={styles.previewImage} 
                />
                <TouchableOpacity style={styles.removeImageBtn} onPress={removeImage}>
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.removeGradient}
                  >
                    <Ionicons name="close" size={20} color="#fff" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.uploadGradient}
                >
                  <Ionicons name="camera-outline" size={40} color="#667eea" />
                  <Text style={styles.uploadText}>{t('create_post_tap_to_upload')}</Text>
                  <Text style={styles.uploadSubtext}>JPG, PNG {t('create_post_up_to_5mb')}</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating Submit Button */}
      <TouchableOpacity 
        style={styles.floatingButton}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.floatingGradient}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name={isEditMode ? "save" : "send"} size={20} color="#fff" />
              <Text style={styles.floatingButtonText}>
                {isEditMode ? t('create_post_update') : t('create_post_submit')}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  heroContent: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  heroIconContainer: {
    marginBottom: 16,
  },
  heroIconBg: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#ffffffcc',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 100,
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  inputContainerActive: {
    borderColor: '#667eea',
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  titleInput: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    padding: 0,
  },
  inputChar: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  charText: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  descriptionInput: {
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 8,
    textAlign: 'right',
  },
  uploadSection: {
    marginTop: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  uploadButton: {
    overflow: 'hidden',
    borderRadius: 20,
  },
  uploadGradient: {
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 20,
  },
  uploadText: {
    fontSize: 14,
    color: '#667eea',
    marginTop: 12,
    fontWeight: '500',
  },
  uploadSubtext: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  imagePreviewWrapper: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    overflow: 'hidden',
    borderRadius: 20,
  },
  removeGradient: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  floatingButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});