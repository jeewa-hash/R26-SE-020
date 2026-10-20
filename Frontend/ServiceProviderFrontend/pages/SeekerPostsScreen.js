import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { CONFIG } from '../config';

export default function SeekerPostsScreen({ route }) {
  const { seekerId, seekerName = 'Seeker' } = route.params || {};
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    if (!seekerId) return;
    setLoading(true);
    try {
      const response = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/posts/user/${encodeURIComponent(seekerId)}`);
      const data = await response.json();
      setPosts(data?.posts || []);
    } catch (error) {
      console.warn('Could not load seeker posts:', error.message);
    } finally {
      setLoading(false);
    }
  }, [seekerId]);

  useFocusEffect(useCallback(() => { loadPosts(); }, [loadPosts]));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{seekerName}'s service requests</Text>
      {loading ? <ActivityIndicator size="large" color="#15803D" /> : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item._id || item.id)}
          ListEmptyComponent={<Text style={styles.empty}>This seeker has not published any service requests.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.image ? <Image source={{ uri: item.image }} style={styles.image} /> : null}
              <Text style={styles.postTitle}>{item.title || 'Service request'}</Text>
              <Text style={styles.description}>{item.description || 'No description provided.'}</Text>
              {item.location ? <Text style={styles.meta}>📍 {typeof item.location === 'string' ? item.location : item.location.city || item.location.address || ''}</Text> : null}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5FAF6', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', color: '#166534', marginBottom: 16 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#D8E8DC' },
  image: { width: '100%', height: 150, borderRadius: 10, marginBottom: 10 },
  postTitle: { fontSize: 16, fontWeight: '700', color: '#162C49', marginBottom: 6 },
  description: { color: '#4B5563', lineHeight: 20 },
  meta: { color: '#6B7280', marginTop: 8, fontSize: 12 },
  empty: { color: '#6B7280', textAlign: 'center', marginTop: 40 },
});
