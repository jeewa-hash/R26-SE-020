import React, { useState, useCallback } from 'react';
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  RefreshControl 
} from 'react-native';
import { Text, Searchbar, Avatar, useTheme } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONFIG } from '../config';

export default function InboxScreen({ navigation, route }) {
  const theme = useTheme();
  const isDark = theme.dark;

  const [currentUserId, setCurrentUserId] = useState(route?.params?.currentUserId || null);
  const [chats, setChats] = useState([]);
  const [filteredChats, setFilteredChats] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch raw chats and resolve receiver profile details
  const fetchUserChatsWithDetails = async (userId) => {
    const targetUserId = userId || currentUserId;
    if (!targetUserId) return;

    try {
      // 1. Fetch chat threads for current user
      const chatRes = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/chat/${targetUserId}`);
      if (!chatRes.ok) {
        throw new Error(`Server returned status ${chatRes.status}`);
      }
      const chatsData = await chatRes.json();

      if (!Array.isArray(chatsData) || chatsData.length === 0) {
        setChats([]);
        setFilteredChats([]);
        return;
      }

      // 2. Concurrently fetch profile details for each opposing member
      const enrichedChats = await Promise.all(
        chatsData.map(async (chat) => {
          const receiverId = chat.members?.find((id) => id !== targetUserId) || null;

          let profileName = 'Customer';
          let avatarUrl = null;

          if (receiverId) {
            try {
              const userRes = await fetch(`${CONFIG.AUTH_SERVICE_URL}/seeker/user/${receiverId}`);
              if (userRes.ok) {
                const userData = await userRes.json();
                profileName = userData.name || userData.fullName || `User ${receiverId.substring(0, 6)}`;
                avatarUrl = userData.avatar || userData.profilePic || null;
              } else {
                profileName = `User ${receiverId.substring(0, 6)}`;
              }
            } catch (e) {
              profileName = `User ${receiverId.substring(0, 6)}`;
            }
          }

          return {
            id: chat._id,
            receiverId: receiverId || 'Seeker',
            name: profileName,
            avatarUrl,
            lastMsg: chat.lastMessage?.text || 'No messages yet',
            time: chat.updatedAt
              ? new Date(chat.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '',
            unread: 0,
            online: true,
          };
        })
      );

      setChats(enrichedChats);
      setFilteredChats(enrichedChats);
    } catch (error) {
      console.error('Error fetching enriched chats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load user credentials and refresh screen on focus
  useFocusEffect(
    useCallback(() => {
      const initInbox = async () => {
        setLoading(true);
        let activeId = currentUserId;

        if (!activeId) {
          activeId = await AsyncStorage.getItem('userId');
          if (activeId) {
            setCurrentUserId(activeId);
          }
        }

        if (activeId) {
          await fetchUserChatsWithDetails(activeId);
        } else {
          setLoading(false);
        }
      };

      initInbox();
    }, [currentUserId])
  );

  const handleSearch = (query) => {
    setSearch(query);
    if (!query.trim()) {
      setFilteredChats(chats);
    } else {
      const filtered = chats.filter(
        (c) =>
          c.name.toLowerCase().includes(query.toLowerCase()) ||
          c.lastMsg.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredChats(filtered);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserChatsWithDetails(currentUserId);
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.chatCard, 
        { borderBottomColor: isDark ? '#374151' : '#F3F4F6' }
      ]}
      onPress={() => 
        navigation.navigate('ChatScreen', { 
          chatId: item.id,
          receiverId: item.receiverId,
          customer: item.name 
        })
      }
    >
      <View style={styles.avatarContainer}>
        {item.avatarUrl ? (
          <Avatar.Image size={56} source={{ uri: item.avatarUrl }} />
        ) : (
          <Avatar.Text 
            size={56} 
            label={item.name ? item.name.charAt(0).toUpperCase() : 'U'} 
            style={{ backgroundColor: theme.colors.primary }} 
          />
        )}
        {item.online && (
          <View 
            style={[
              styles.onlineDot, 
              { borderColor: isDark ? '#1F2937' : '#FFFFFF' }
            ]} 
          />
        )}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={[styles.userName, { color: isDark ? '#F9FAFB' : '#111827' }]}>
            {item.name}
          </Text>
          <Text style={[styles.timeText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {item.time}
          </Text>
        </View>
        <View style={styles.msgRow}>
          <Text 
            style={[
              styles.lastMsg, 
              { color: isDark ? '#9CA3AF' : '#6B7280' },
              item.unread > 0 && { color: isDark ? '#F9FAFB' : '#111827', fontWeight: '700' }
            ]} 
            numberOfLines={1}
          >
            {item.lastMsg}
          </Text>
          {item.unread > 0 && (
            <View style={[styles.msgBadge, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.msgBadgeText}>{item.unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#111827' : '#FFFFFF' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#F9FAFB' : '#1F2937' }]}>
          Messages
        </Text>
        <Searchbar 
          placeholder="Search..." 
          onChangeText={handleSearch} 
          value={search} 
          style={[
            styles.searchBar, 
            { backgroundColor: isDark ? '#1F2937' : '#F3F4F6' }
          ]}
          inputStyle={{ color: isDark ? '#F9FAFB' : '#111827' }}
          placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
          iconColor={isDark ? '#9CA3AF' : '#6B7280'}
        />
      </View>

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          renderItem={renderChatItem}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[theme.colors.primary]} 
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                No conversations found
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 15 },
  searchBar: { elevation: 0, borderRadius: 12 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16 },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  avatarContainer: { position: 'relative' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2 },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  userName: { fontSize: 16, fontWeight: '700' },
  timeText: { fontSize: 12 },
  msgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  lastMsg: { fontSize: 14, flex: 1 },
  msgBadge: { borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  msgBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});