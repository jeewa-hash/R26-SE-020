// screens/EditProfileScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { IP_ADDRESS } from '../config';

const AUTH_SERVICE_URL = `http://${IP_ADDRESS}:4003/seeker`;
const BASE_AUTH_URL = `http://${IP_ADDRESS}:4003`;

// ─── Helper: build full image URL ──────────────────────────
const getFullImageUrl = (imagePath) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  return `${BASE_AUTH_URL}/${imagePath.replace(/^\/+/, '')}`;
};

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { user, saveUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.telephone || user?.phone || '');
  const [location, setLocation] = useState(user?.district || user?.location || '');
  const [avatar, setAvatar] = useState(
    getFullImageUrl(user?.profilePicture || user?.avatar) ||
    'https://i.pravatar.cc/150?img=7'
  );

  // ─── Update avatar when user changes ──────────────────────
  useEffect(() => {
    setAvatar(
      getFullImageUrl(user?.profilePicture || user?.avatar) ||
      'https://i.pravatar.cc/150?img=7'
    );
  }, [user]);

  // ─── Pick image from gallery ──────────────────────────────
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow gallery access to change your photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const imageUri = result.assets[0].uri;
        await uploadProfilePicture(imageUri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Could not pick image.');
    }
  };

  // ─── Upload profile picture ────────────────────────────────
  const uploadProfilePicture = async (imageUri) => {
    setUploadingAvatar(true);
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Error', 'You are not logged in.');
        setUploadingAvatar(false);
        return;
      }

      const formData = new FormData();
      formData.append('profilePicture', {
        uri: imageUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });

      const response = await fetch(`${AUTH_SERVICE_URL}/profile-picture`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update AsyncStorage and AuthContext
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          const updatedUser = {
            ...currentUser,
            profilePicture: data.user.profilePicture,
          };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          await saveUser(updatedUser);
          setAvatar(getFullImageUrl(data.user.profilePicture) || 'https://i.pravatar.cc/150?img=7');
        }
        Alert.alert('Success', 'Profile picture updated!');
      } else {
        Alert.alert('Error', data.message || 'Failed to upload image.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ─── Save other profile fields ─────────────────────────────
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    setLoading(true);
    try {
      const userId = await AsyncStorage.getItem('userId');
      const token = await AsyncStorage.getItem('userToken');

      const payload = {
        name: name.trim(),
        telephone: phone.trim(),
        district: location.trim(),
      };

      const response = await fetch(`${AUTH_SERVICE_URL}/user/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        // Update AsyncStorage
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const currentUser = JSON.parse(storedUser);
          const updatedUser = {
            ...currentUser,
            name: name.trim(),
            telephone: phone.trim(),
            district: location.trim(),
          };
          await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
          await saveUser(updatedUser);
        }
        Alert.alert('Success', 'Profile updated successfully!');
        navigation.goBack();
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? '#1a1a2e' : '#667eea'} />

      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ─── Avatar Section ────────────────────────────────── */}
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={pickImage}
          disabled={uploadingAvatar}
          activeOpacity={0.8}
        >
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View style={styles.cameraOverlay}>
            {uploadingAvatar ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="camera" size={22} color="#fff" />
            )}
          </View>
          <Text style={[styles.changePhotoText, isDarkMode && styles.textMutedDark]}>
            Tap to change photo
          </Text>
        </TouchableOpacity>

        {/* ─── Form Fields ────────────────────────────────────── */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Full Name</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            value={name}
            onChangeText={setName}
            placeholder="Enter your full name"
            placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Email</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark, styles.disabledInput]}
            value={user?.email || ''}
            editable={false}
            placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>Phone</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            value={phone}
            onChangeText={setPhone}
            placeholder="Enter phone number"
            keyboardType="phone-pad"
            placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={[styles.label, isDarkMode && styles.textDark]}>District / Location</Text>
          <TextInput
            style={[styles.input, isDarkMode && styles.inputDark]}
            value={location}
            onChangeText={setLocation}
            placeholder="Enter district (e.g., Colombo)"
            placeholderTextColor={isDarkMode ? '#6B7280' : '#9CA3AF'}
          />
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={loading}>
          <LinearGradient
            colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#667eea',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#667eea',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  changePhotoText: {
    fontSize: 13,
    color: '#667eea',
    marginTop: 8,
    fontWeight: '500',
  },
  formGroup: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1F2937',
  },
  inputDark: {
    backgroundColor: '#1a1a2e',
    borderColor: '#2d3561',
    color: '#F8FAFC',
  },
  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },
  saveButton: {
    width: '100%',
    marginTop: 10,
    borderRadius: 12,
    overflow: 'hidden',
  },
  saveGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  textDark: {
    color: '#F8FAFC',
  },
  textMutedDark: {
    color: '#94A3B8',
  },
});