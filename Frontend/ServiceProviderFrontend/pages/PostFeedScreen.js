import React, { useContext } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Text, Card, Avatar } from 'react-native-paper';
import { ThemeContext } from '../context/ThemeContext';

const MOCK_POSTS = [
  { id: '1', title: 'Emergency Pipe Repair 🚨', date: 'Yesterday', excerpt: 'Quick response to a burst pipe in Borella...' },
  { id: '2', title: 'New Installation', date: '2 days ago', excerpt: 'Full bathroom fitting completed for a new home.' },
];

export default function PostFeedScreen() {
  const { isDark } = useContext(ThemeContext);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? '#0f0f0f' : '#F8FAFC', padding: 10 }}>
      <FlatList
        data={MOCK_POSTS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <Card style={[styles.card, { backgroundColor: isDark ? '#1c1c1e' : '#fff' }]}>
            <Card.Title
              title={item.title}
              subtitle={item.date}
              left={(props) => <Avatar.Icon {...props} icon="pencil" backgroundColor="#7C3AED" />}
            />
            <Card.Content>
              <Text style={{ color: isDark ? '#8E8E93' : '#6B7280' }}>{item.excerpt}</Text>
            </Card.Content>
          </Card>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, borderRadius: 12, elevation: 2 }
});