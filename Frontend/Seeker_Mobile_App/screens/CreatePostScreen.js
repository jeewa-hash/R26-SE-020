import React, { useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedImages, setSelectedImages] = useState([]);
  const [activeField, setActiveField] = useState(null);
  
  const scrollY = useRef(new Animated.Value(0)).current;
  const titleScale = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0.95],
    extrapolate: 'clamp',
  });

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Needed', 'Please allow access to your gallery');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
    if (!result.canceled) {
      setSelectedImages([...selectedImages, result.assets[0].uri]);
    }
  };

  const removeImage = (index) => {
    const newImages = [...selectedImages];
    newImages.splice(index, 1);
    setSelectedImages(newImages);
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a title');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe your requirements');
      return;
    }
    
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Your service request has been posted!');
      navigation.goBack();
    }, 1000);
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
                <Ionicons name="create-outline" size={32} color="#667eea" />
              </LinearGradient>
            </View>
            <Text style={styles.heroTitle}>Share Your Request</Text>
            <Text style={styles.heroSubtitle}>Get matched with top-rated professionals</Text>
          </Animated.View>
        </LinearGradient>

        {/* Form Container */}
        <View style={styles.formContainer}>
          {/* Title Field */}
          <View style={[styles.inputContainer, activeField === 'title' && styles.inputContainerActive]}>
            <Text style={styles.inputLabel}>What do you need? ✨</Text>
            <TextInput
              style={styles.titleInput}
              placeholder="e.g., Professional plumber for bathroom renovation"
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
            <Text style={styles.inputLabel}>Tell us more 📝</Text>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Describe your requirements in detail..."
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

          {/* Quick Info Grid */}
          <View style={styles.infoGrid}>
            {/* Location Card */}
            <TouchableOpacity 
              style={styles.infoCard} 
              onPress={() => {
                Alert.prompt('📍 Location', 'Enter your address or area', [
                  { text: 'Cancel' },
                  { text: 'OK', onPress: (text) => setLocation(text) }
                ]);
              }}
            >
              <LinearGradient
                colors={['#667eea20', '#764ba220']}
                style={styles.infoCardGradient}
              >
                <View style={[styles.infoIcon, styles.locationIconBg]}>
                  <Ionicons name="location" size={24} color="#667eea" />
                </View>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue} numberOfLines={1}>
                  {location || 'Add location'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Budget Card */}
            <TouchableOpacity 
              style={styles.infoCard} 
              onPress={() => {
                Alert.prompt('💰 Budget', 'Enter your estimated budget', [
                  { text: 'Cancel' },
                  { text: 'OK', onPress: (text) => setBudget(text) }
                ]);
              }}
            >
              <LinearGradient
                colors={['#10B98120', '#05966920']}
                style={styles.infoCardGradient}
              >
                <View style={[styles.infoIcon, styles.budgetIconBg]}>
                  <Ionicons name="cash" size={24} color="#10B981" />
                </View>
                <Text style={styles.infoLabel}>Budget</Text>
                <Text style={styles.infoValue}>{budget ? `$${budget}` : 'Set budget'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Date Card */}
            <TouchableOpacity 
              style={styles.infoCard} 
              onPress={() => setShowDatePicker(true)}
            >
              <LinearGradient
                colors={['#F59E0B20', '#D9770620']}
                style={styles.infoCardGradient}
              >
                <View style={[styles.infoIcon, styles.dateIconBg]}>
                  <Ionicons name="calendar" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(selectedDate).split(',')[0]}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDatePicker(false);
                if (date) setSelectedDate(date);
              }}
              minimumDate={new Date()}
            />
          )}

          {/* Image Upload Section */}
          <View style={styles.uploadSection}>
            <Text style={styles.sectionTitle}>📸 Add Photos</Text>
            <Text style={styles.sectionSubtitle}>Show providers what you need</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {selectedImages.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri }} style={styles.uploadedImage} />
                  <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                    <LinearGradient
                      colors={['#EF4444', '#DC2626']}
                      style={styles.removeGradient}
                    >
                      <Ionicons name="close" size={16} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                <LinearGradient
                  colors={['#F3F4F6', '#E5E7EB']}
                  style={styles.addImageGradient}
                >
                  <Ionicons name="camera-outline" size={32} color="#667eea" />
                  <Text style={styles.addImageText}>Upload</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Animated.ScrollView>

      {/* Floating Post Button */}
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
              <Ionicons name="send" size={20} color="#fff" />
              <Text style={styles.floatingButtonText}>Post Request</Text>
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
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  infoCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  infoCardGradient: {
    padding: 12,
    alignItems: 'center',
  },
  infoIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIconBg: {
    backgroundColor: '#667eea20',
  },
  budgetIconBg: {
    backgroundColor: '#10B98120',
  },
  dateIconBg: {
    backgroundColor: '#F59E0B20',
  },
  infoLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
  },
  uploadSection: {
    marginTop: 8,
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
  imageScroll: {
    flexDirection: 'row',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 12,
  },
  uploadedImage: {
    width: 100,
    height: 100,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    overflow: 'hidden',
    borderRadius: 12,
  },
  removeGradient: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addImageBtn: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  addImageGradient: {
    width: 100,
    height: 100,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 12,
    color: '#667eea',
    marginTop: 8,
    fontWeight: '500',
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