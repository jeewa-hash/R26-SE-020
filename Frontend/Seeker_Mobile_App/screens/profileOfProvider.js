// screens/profileOfProvider.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_SERVICE_URL, CONFIG, IP_ADDRESS } from '../config';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';

const { width } = Dimensions.get('window');

const AVATAR_GRADIENTS = [
  ['#4f46e5', '#7c3aed'], // Indigo
  ['#059669', '#10b981'], // Emerald
  ['#d97706', '#f59e0b'], // Amber
  ['#e11d48', '#fb7185'], // Rose
  ['#0284c7', '#38bdf8'], // Sky
  ['#7c3aed', '#c084fc'], // Purple
  ['#ea580c', '#fb923c'], // Orange
];

const getAvatarGradient = (char) => {
  const code = (char || 'P').charCodeAt(0);
  return AVATAR_GRADIENTS[code % AVATAR_GRADIENTS.length];
};

export default function ProfileOfProvider({ route, navigation }) {
  const { providerItem } = route.params || {};
  const { user } = useAuth();
  const { createOrGetChat } = useChat();

  const provider = providerItem?.provider || providerItem || {};
  const providerId = provider.id || provider._id;
  const portfolio = providerItem?.portfolio || {};
  const match = providerItem?.match || {};

  const [isStartingChat, setIsStartingChat] = useState(false);
  const [imageError, setImageError] = useState(false);

  const getProfileImage = (profileImage) => {
    if (!profileImage) return null;
    const normalized = profileImage.replace(/\\/g, '/');
    if (normalized.startsWith('http')) return normalized;
    return `${AUTH_SERVICE_URL}/${normalized}`;
  };

  const imageUrl = getProfileImage(provider.profileImage);
  const providerName = provider.name || provider.fullName || 'Service Provider';
  const category = provider.category || 'General Service';
  const district = provider.district || 'Available Island-wide';
  const email = provider.email || 'Not available';
  const telephone = provider.telephone || '';
  const bio = provider.bio || '';
  const isVerified = provider.isVerified || false;
  const rating = provider.rating || 4.9;
  const reviewsCount = provider.reviewCount || 15;

  const categories = portfolio.categories || [category];
  const specificLabels = portfolio.specific_labels || [category];
  const portfolioImages = portfolio.images || [];

  const initial = providerName.trim().length > 0 ? providerName.trim().charAt(0).toUpperCase() : 'P';
  const avatarGradientColors = getAvatarGradient(initial);

  // ─────────────────────────────────────────────────────────────
  //  START CHAT WITH PROVIDER
  // ─────────────────────────────────────────────────────────────
  const handleChatWithProvider = async () => {
    try {
      setIsStartingChat(true);
      let currentUserId = user?.id;
      if (!currentUserId) {
        currentUserId = await AsyncStorage.getItem('userId');
      }

      if (!currentUserId) {
        setIsStartingChat(false);
        Alert.alert('Login Required', 'Please log in to start a chat with this service provider.');
        return;
      }

      const receiverId = providerId || provider._id || provider.id;
      if (!receiverId) {
        setIsStartingChat(false);
        Alert.alert('Error', 'Provider ID could not be identified.');
        return;
      }

      const chatId = await createOrGetChat(currentUserId, receiverId);
      setIsStartingChat(false);

      if (!chatId) {
        Alert.alert('Error', 'Could not initiate chat session. Please try again.');
        return;
      }

      const initialMessage = `Hi ${providerName}! I found your profile on WorkWave and would like to ask about your ${category} services.`;

      navigation.navigate('ChatScreen', {
        chatId,
        userId: receiverId,
        userName: providerName,
        userAvatar: imageUrl || '',
        userRole: 'ServiceProvider',
        initialMessage: initialMessage,
        source: 'provider_profile',
      });
    } catch (error) {
      console.error('Chat navigation error in profileOfProvider:', error);
      setIsStartingChat(false);
      Alert.alert('Error', 'An error occurred while opening the chat.');
    }
  };

  const handleCallProvider = () => {
    if (!telephone) {
      Alert.alert('Contact', 'Phone number is not available for this provider.');
      return;
    }
    Linking.openURL(`tel:${telephone}`).catch(() => {
      Alert.alert('Error', 'Could not open dialer.');
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <Text style={styles.topHeaderTitle}>Provider Profile</Text>

        <TouchableOpacity
          style={styles.headerActionBtn}
          onPress={handleCallProvider}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={22} color="#4F46E5" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            {imageUrl && !imageError ? (
              <Image
                source={{ uri: imageUrl }}
                style={styles.avatar}
                onError={() => setImageError(true)}
              />
            ) : (
              <LinearGradient
                colors={avatarGradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.defaultAvatarGradient}
              >
                <Text style={styles.defaultAvatarInitial}>{initial}</Text>
              </LinearGradient>
            )}

            <View style={styles.verificationBadge}>
              <Ionicons
                name={isVerified ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={isVerified ? '#10B981' : '#F59E0B'}
              />
              <Text
                style={[
                  styles.verificationText,
                  { color: isVerified ? '#065F46' : '#B45309' },
                ]}
              >
                {isVerified ? 'Verified Pro' : 'Registered'}
              </Text>
            </View>
          </View>

          <Text style={styles.providerName}>{providerName}</Text>

          <View style={styles.categoryRow}>
            <Ionicons name="construct" size={16} color="#6366F1" />
            <Text style={styles.categoryText}>{category}</Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color="#EF4444" />
            <Text style={styles.locationText}>{district}</Text>
          </View>

          <View style={styles.ratingPillContainer}>
            <View style={styles.ratingBadge}>
              <Ionicons name="star" size={16} color="#FBBF24" />
              <Text style={styles.ratingScore}>{Number(rating).toFixed(1)}</Text>
              <Text style={styles.reviewsCount}>({reviewsCount} reviews)</Text>
            </View>
          </View>
        </View>

        {/* Bio / Description */}
        {bio.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="information-circle-outline" size={20} color="#4F46E5" />
              <Text style={styles.sectionTitle}>About Provider</Text>
            </View>
            <Text style={styles.bioText}>{bio}</Text>
          </View>
        )}

        {/* Contact Information */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="call-outline" size={20} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Contact Details</Text>
          </View>

          {telephone ? (
            <TouchableOpacity style={styles.contactRow} onPress={handleCallProvider}>
              <View style={styles.contactIconBox}>
                <Ionicons name="call" size={18} color="#4F46E5" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>Phone Number</Text>
                <Text style={styles.contactValue}>{telephone}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}

          <View style={styles.contactRow}>
            <View style={styles.contactIconBox}>
              <Ionicons name="mail" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Email Address</Text>
              <Text style={styles.contactValue}>{email}</Text>
            </View>
          </View>

          <View style={styles.contactRow}>
            <View style={styles.contactIconBox}>
              <Ionicons name="map" size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Service District</Text>
              <Text style={styles.contactValue}>{district}</Text>
            </View>
          </View>
        </View>

        {/* Specializations / Categories */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="ribbon-outline" size={20} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Services & Specializations</Text>
          </View>

          <View style={styles.chipsContainer}>
            {categories.map((cat, idx) => (
              <View key={`cat-${idx}`} style={styles.specChip}>
                <Ionicons name="checkmark-done" size={14} color="#4F46E5" />
                <Text style={styles.specChipText}>{cat}</Text>
              </View>
            ))}

            {specificLabels
              .filter((lbl) => !categories.includes(lbl))
              .map((lbl, idx) => (
                <View key={`lbl-${idx}`} style={styles.specChip}>
                  <Ionicons name="checkmark-done" size={14} color="#4F46E5" />
                  <Text style={styles.specChipText}>{lbl}</Text>
                </View>
              ))}
          </View>
        </View>

        {/* Portfolio Gallery */}
        {portfolioImages.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Ionicons name="images-outline" size={20} color="#4F46E5" />
              <Text style={styles.sectionTitle}>Work Portfolio</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portfolioScroll}>
              {portfolioImages.map((img, index) => {
                const pImgUrl = img.startsWith('http') ? img : `${AUTH_SERVICE_URL}/${img.replace(/\\/g, '/')}`;
                return (
                  <Image key={index} source={{ uri: pImgUrl }} style={styles.portfolioThumb} resizeMode="cover" />
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Chat with Provider Action Button at the bottom of the page content */}
        <View style={styles.chatActionWrapper}>
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChatWithProvider}
            disabled={isStartingChat}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={['#4f46e5', '#6366f1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.chatButtonGradient}
            >
              {isStartingChat ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="chatbubbles" size={22} color="#fff" />
                  <Text style={styles.chatButtonText}>Chat with Provider</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Space at the bottom so page content scrolls completely above BottomNav */}
        <View style={{ height: 110 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
  },
  topHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EEF2FF',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  scrollContent: {
    paddingBottom: 130,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  avatarSection: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: '#4F46E5',
  },
  defaultAvatarGradient: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  defaultAvatarInitial: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
  },
  verificationBadge: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  verificationText: {
    fontSize: 12,
    fontWeight: '700',
  },
  providerName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 6,
    textAlign: 'center',
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4F46E5',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingPillContainer: {
    marginTop: 12,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ratingScore: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
  },
  reviewsCount: {
    fontSize: 12,
    color: '#B45309',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#475569',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  contactIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 1,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  specChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  portfolioScroll: {
    marginTop: 4,
  },
  portfolioThumb: {
    width: 120,
    height: 90,
    borderRadius: 12,
    marginRight: 10,
    backgroundColor: '#E2E8F0',
  },
  chatActionWrapper: {
    marginTop: 8,
    marginBottom: 10,
  },
  chatButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  chatButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 15,
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
