// screens/ChatListScreen.js
import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, FlatList,
  TouchableOpacity, Image, StatusBar, TextInput, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';
import { useChat } from '../context/ChatContext';
import axios from 'axios';
import { PROVIDER_API_BASE, AUTH_SERVICE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const { chats, currentUserId, fetchChats } = useChat();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [providerMap, setProviderMap] = useState({});

  // Helper to build full image URL
  const buildImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    // If relative, prepend auth service base (where images are stored)
    return `${AUTH_SERVICE_URL}/${imagePath.replace(/^\/+/, '')}`;
  };

  // Load all providers
  useEffect(() => {
    const loadProviders = async () => {
      try {
        // Check cache
        const cached = await AsyncStorage.getItem('all_providers');
        if (cached) {
          const data = JSON.parse(cached);
          if (Date.now() - data.timestamp < 3600000) {
            const map = {};
            data.providers.forEach(item => {
              const p = item.provider;
              if (p && p.id) {
                map[p.id] = {
                  name: p.name || `Provider ${p.id.slice(-4)}`,
                  avatar: buildImageUrl(p.profileImage) || `https://i.pravatar.cc/150?u=${p.id}`,
                  role: 'ServiceProvider',
                };
              }
            });
            setProviderMap(map);
            console.log(`📦 Loaded ${data.providers.length} providers from cache`);
            return;
          }
        }

        // Fetch from portfolio endpoint
        const url = `${PROVIDER_API_BASE}/portfolio/all-providers`;
        console.log(`📡 Fetching ${url}`);
        const res = await axios.get(url);

        if (res.data.success) {
          const providerItems = res.data.providers || [];
          const map = {};
          providerItems.forEach(item => {
            const p = item.provider;
            if (p && p.id) {
              map[p.id] = {
                name: p.name || `Provider ${p.id.slice(-4)}`,
                avatar: buildImageUrl(p.profileImage) || `https://i.pravatar.cc/150?u=${p.id}`,
                role: 'ServiceProvider',
              };
            }
          });
          setProviderMap(map);
          await AsyncStorage.setItem('all_providers', JSON.stringify({ 
            providers: providerItems, 
            timestamp: Date.now() 
          }));
          console.log(`✅ Loaded ${providerItems.length} providers from API`);
        } else {
          console.warn('API returned success: false');
        }
      } catch (error) {
        console.error('Failed to load providers:', error.message);
        // Fallback: generate from chats
        const fallbackMap = {};
        chats.forEach(chat => {
          const otherId = chat.members.find(id => id !== currentUserId);
          if (otherId && !fallbackMap[otherId]) {
            fallbackMap[otherId] = {
              name: `Provider ${otherId.slice(-4)}`,
              avatar: `https://i.pravatar.cc/150?u=${otherId}`,
              role: 'ServiceProvider',
            };
          }
        });
        setProviderMap(fallbackMap);
      }
    };

    loadProviders();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchChats(currentUserId);
    }
  }, [currentUserId]);

  // ─── Helpers ──────────────────────────────────────────────
  const getOtherUser = (members) => {
    return members.find(id => id !== currentUserId) || members[0];
  };

  const getProviderInfo = (providerId) => {
    if (providerMap[providerId]) {
      return providerMap[providerId];
    }
    return {
      name: `Provider ${providerId.slice(-4)}`,
      avatar: `https://i.pravatar.cc/150?u=${providerId}`,
      role: 'ServiceProvider',
    };
  };

  const filteredChats = chats.filter(chat => {
    const otherId = getOtherUser(chat.members);
    const info = getProviderInfo(otherId);
    const matchesSearch = info.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === 'unread') {
      return matchesSearch && (chat.unreadCount || 0) > 0;
    }
    return matchesSearch;
  });

  const renderChatItem = ({ item }) => {
    const otherId = getOtherUser(item.members);
    const info = getProviderInfo(otherId);
    const lastMsg = item.lastMessage?.text || 'No messages yet';
    const time = item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString() : '';

    return (
      <TouchableOpacity
        style={[styles.chatItem, isDarkMode && styles.chatItemDark]}
        onPress={() => navigation.navigate('ChatScreen', {
          chatId: item._id,
          userId: otherId,
          userName: info.name,
          userAvatar: info.avatar,
          userRole: info.role,
        })}
        activeOpacity={0.7}
      >
        <Image source={{ uri: info.avatar }} style={styles.avatar} />
        <View style={styles.chatInfo}>
          <View style={styles.chatHeader}>
            <Text style={[styles.userName, isDarkMode && styles.textDark]}>{info.name}</Text>
            <Text style={[styles.timeText, isDarkMode && styles.textMutedDark]}>{time}</Text>
          </View>
          <View style={styles.messageRow}>
            <Text style={[styles.lastMessage, isDarkMode && styles.textMutedDark]} numberOfLines={1}>
              {lastMsg}
            </Text>
            {(item.unreadCount || 0) > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Messages</Text>
          <TouchableOpacity style={styles.newChatButton}>
            <Ionicons name="create-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
        <Ionicons name="search-outline" size={20} color={isDarkMode ? "#9CA3AF" : "#9CA3AF"} />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.textDark]}
          placeholder="Search messages..."
          placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={60} color={isDarkMode ? "#2d3561" : "#D1D5DB"} />
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              Start a conversation with a provider
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles (unchanged) ──────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  containerDark: { backgroundColor: '#1a1a2e' },
  headerGradient: { borderBottomLeftRadius: 25, borderBottomRightRadius: 25, paddingTop: Platform.OS === 'ios' ? 12 : 16, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff20', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  newChatButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff20', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, borderColor: '#E5E7EB', gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  searchContainerDark: { backgroundColor: '#16213e', borderColor: '#2d3561' },
  searchInput: { flex: 1, fontSize: 15, color: '#1F2937' },
  listContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 80 },
  chatItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  chatItemDark: { backgroundColor: '#16213e' },
  avatar: { width: 55, height: 55, borderRadius: 27.5, marginRight: 14 },
  chatInfo: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  userName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  timeText: { fontSize: 11, color: '#9CA3AF' },
  messageRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { flex: 1, fontSize: 13, color: '#6B7280', marginRight: 8 },
  unreadBadge: { backgroundColor: '#667eea', minWidth: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#1F2937', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#6B7280', marginTop: 8, textAlign: 'center' },
  textDark: { color: '#fff' },
  textMutedDark: { color: '#9CA3AF' },
});