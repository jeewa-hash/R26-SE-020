// screens/ChatListScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  TextInput,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../hooks/useTheme';

const recentChats = [
  {
    id: '1',
    name: "John Miller",
    avatar: "https://randomuser.me/api/portraits/men/1.jpg",
    lastMessage: "I'll be there tomorrow at 2 PM",
    time: "2:30 PM",
    unread: 2,
    role: "Provider",
  },
  {
    id: '2',
    name: "Sarah Johnson",
    avatar: "https://randomuser.me/api/portraits/women/2.jpg",
    lastMessage: "Thank you for your service!",
    time: "Yesterday",
    unread: 0,
    role: "Provider",
  },
  {
    id: '3',
    name: "Mike Wilson",
    avatar: "https://randomuser.me/api/portraits/men/3.jpg",
    lastMessage: "Can you send me the address?",
    time: "Yesterday",
    unread: 1,
    role: "Customer",
  },
  {
    id: '4',
    name: "Emily Brown",
    avatar: "https://randomuser.me/api/portraits/women/4.jpg",
    lastMessage: "The repair is complete, thank you!",
    time: "Dec 15",
    unread: 0,
    role: "Customer",
  },
];

export default function ChatListScreen() {
  const navigation = useNavigation();
  const { isDarkMode } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'unread', label: 'Unread' },
  ];

  const filteredChats = recentChats.filter(chat => {
    const matchesSearch = chat.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (selectedFilter === 'unread') {
      return matchesSearch && chat.unread > 0;
    }
    return matchesSearch;
  });

  const getTimeAgo = (time) => {
    if (time === 'Yesterday') return 'Yesterday';
    if (time.includes(':')) return time;
    return time;
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.chatItem, isDarkMode && styles.chatItemDark]}
      onPress={() => navigation.navigate('ChatScreen', {
        userId: item.id,
        userName: item.name,
        userAvatar: item.avatar,
        userRole: item.role,
        providerId: item.id,
      })}
      activeOpacity={0.7}
    >
      <Image source={{ uri: item.avatar }} style={styles.avatar} />
      
      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <View style={styles.nameContainer}>
            <Text style={[styles.userName, isDarkMode && styles.textDark]}>{item.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: item.role === 'Provider' ? '#667eea15' : '#10B98115' }]}>
              <Text style={[styles.roleText, { color: item.role === 'Provider' ? '#667eea' : '#10B981' }]}>
                {item.role}
              </Text>
            </View>
          </View>
          <Text style={[styles.timeText, isDarkMode && styles.textMutedDark]}>{getTimeAgo(item.time)}</Text>
        </View>
        
        <View style={styles.messageRow}>
          <Text style={[styles.lastMessage, isDarkMode && styles.textMutedDark]} numberOfLines={1}>
            {item.lastMessage}
          </Text>
          {item.unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#fff"} 
      />
      
      {/* Header with Gradient */}
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

      {/* Search Bar */}
      <View style={[styles.searchContainer, isDarkMode && styles.searchContainerDark]}>
        <Ionicons name="search-outline" size={20} color={isDarkMode ? "#9CA3AF" : "#9CA3AF"} />
        <TextInput
          style={[styles.searchInput, isDarkMode && styles.textDark]}
          placeholder="Search messages..."
          placeholderTextColor={isDarkMode ? "#6B7280" : "#9CA3AF"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Chips */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
              isDarkMode && selectedFilter !== filter.id && styles.filterChipDark
            ]}
            onPress={() => setSelectedFilter(filter.id)}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter.id && styles.filterTextActive,
              isDarkMode && selectedFilter !== filter.id && styles.filterTextDark
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Chat List */}
      <FlatList
        data={filteredChats}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, isDarkMode && styles.emptyIconDark]}>
              <Ionicons name="chatbubbles-outline" size={60} color={isDarkMode ? "#2d3561" : "#D1D5DB"} />
            </View>
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>No messages yet</Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              {searchQuery ? "No results found" : "Start a conversation with a provider"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#1a1a2e',
  },
  headerGradient: {
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  newChatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  searchContainerDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
  },
  filtersContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipDark: {
    backgroundColor: '#16213e',
    borderColor: '#2d3561',
  },
  filterChipActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterTextDark: {
    color: '#9CA3AF',
  },
  filterTextActive: {
    color: '#fff',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 80,
  },
  chatItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chatItemDark: {
    backgroundColor: '#16213e',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    marginRight: 14,
  },
  chatInfo: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastMessage: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    marginRight: 8,
  },
  unreadBadge: {
    backgroundColor: '#667eea',
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIconDark: {
    backgroundColor: '#16213e',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});