import React, { useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Text, Searchbar, Avatar } from 'react-native-paper';

const MOCK_CHATS = [
  { id: '1', name: 'Saman Gunawardena', lastMsg: 'Can you start on Tuesday?', time: '10:30 AM', unread: 2, online: true },
  { id: '2', name: 'Nimal Perera', lastMsg: 'The quote looks good, thanks!', time: 'Yesterday', unread: 0, online: false },
  { id: '3', name: 'Tech Solutions Ltd', lastMsg: 'Sent you the site location.', time: '2 days ago', unread: 0, online: true },
];

export default function InboxScreen({ navigation }) {
  const [search, setSearch] = useState('');

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatCard}
      onPress={() => navigation.navigate('ChatScreen', { customer: item.name })}
    >
      <View style={styles.avatarContainer}>
        {/* Safe check: if item.name is missing, it won't crash */}
        <Avatar.Text size={56} label={item.name ? item.name.charAt(0) : 'U'} style={styles.avatar} />
        {item.online && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.chatInfo}>
        <View style={styles.chatHeader}>
          <Text style={styles.userName}>{item.name || 'Unknown User'}</Text>
          <Text style={styles.timeText}>{item.time}</Text>
        </View>
        <View style={styles.msgRow}>
          <Text style={[styles.lastMsg, item.unread > 0 && styles.unreadMsg]} numberOfLines={1}>
            {item.lastMsg}
          </Text>
          {item.unread > 0 && (
            <View style={styles.msgBadge}><Text style={styles.msgBadgeText}>{item.unread}</Text></View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <Searchbar placeholder="Search..." onChangeText={setSearch} value={search} style={styles.searchBar} />
      </View>
      <FlatList
        data={MOCK_CHATS}
        keyExtractor={(item) => item.id}
        renderItem={renderChatItem}
        contentContainerStyle={{ paddingHorizontal: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 15 },
  title: { fontSize: 28, fontWeight: '800', marginBottom: 15, color: '#1F2937' },
  searchBar: { elevation: 0, backgroundColor: '#F3F4F6', borderRadius: 12 },
  chatCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  avatarContainer: { position: 'relative' },
  avatar: { backgroundColor: '#7C3AED' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  userName: { fontSize: 16, fontWeight: '700' },
  timeText: { fontSize: 12, color: '#9CA3AF' },
  msgRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  lastMsg: { fontSize: 14, color: '#6B7280', flex: 1 },
  unreadMsg: { color: '#111827', fontWeight: '600' },
  msgBadge: { backgroundColor: '#7C3AED', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  msgBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
});