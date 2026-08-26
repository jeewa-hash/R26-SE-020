// screens/PostResponsesScreen.js

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { IP_ADDRESS } from '../config';
import { useTheme } from '../hooks/useTheme';

const API_BASE_URL = `http://${IP_ADDRESS}:6000`;

export default function PostResponsesScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const { postId } = route.params; // passed from FeedScreen

  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState(null);

  // Load token from storage
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('userToken');
        setToken(storedToken);
      } catch (error) {
        console.log('Error loading token:', error);
      }
    };
    loadToken();
  }, []);

  // Fetch responses when token and postId are available
  useEffect(() => {
    if (token && postId) {
      fetchResponses();
    }
  }, [token, postId]);

  // =======================================================
  // FETCH RESPONSES
  // =======================================================
  const fetchResponses = async () => {
    if (!token || !postId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/posts/responses/${postId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setResponses(data.responses || []);
      } else {
        Alert.alert('Error', data.error || 'Failed to load responses');
        setResponses([]);
      }
    } catch (error) {
      console.log('Fetch Responses Error:', error);
      Alert.alert('Error', 'Network error while fetching responses');
      setResponses([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // =======================================================
  // REFRESH
  // =======================================================
  const onRefresh = () => {
    setRefreshing(true);
    fetchResponses();
  };

  // =======================================================
  // FORMAT TIME
  // =======================================================
  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    const diff = Math.floor((new Date() - new Date(timestamp)) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // =======================================================
  // RENDER SINGLE RESPONSE
  // =======================================================
  const renderResponse = (item) => {
    const avatar = item.providerAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg';

    return (
      <View
        key={item._id}
        style={[
          styles.responseCard,
          isDarkMode && styles.responseCardDark,
        ]}
      >
        <View style={styles.responseHeader}>
          <Image source={{ uri: avatar }} style={styles.avatar} />
          <View style={styles.responseInfo}>
            <Text style={[styles.providerName, isDarkMode && styles.textDark]}>
              {item.providerName || 'Unknown Provider'}
            </Text>
            <Text style={[styles.responseTime, isDarkMode && styles.textMutedDark]}>
              {formatTimeAgo(item.createdAt)}
            </Text>
          </View>
        </View>

        {item.message && (
          <Text style={[styles.responseMessage, isDarkMode && styles.textMutedDark]}>
            {item.message}
          </Text>
        )}

        {/* You can add more fields like price, status, etc. if needed */}
      </View>
    );
  };

  // =======================================================
  // LOADING
  // =======================================================
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <LinearGradient
          colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Responses</Text>
          <View style={{ width: 24 }} />
        </LinearGradient>
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, isDarkMode && styles.textMutedDark]}>
            Loading responses...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // =======================================================
  // MAIN UI
  // =======================================================
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* HEADER */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Responses</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      {/* RESPONSES LIST */}
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#667eea']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {responses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={60}
              color={isDarkMode ? '#2d3561' : '#D1D5DB'}
            />
            <Text style={[styles.emptyText, isDarkMode && styles.textDark]}>
              No responses yet
            </Text>
            <Text style={[styles.emptySubtext, isDarkMode && styles.textMutedDark]}>
              Providers haven't responded to this post yet.
            </Text>
          </View>
        ) : (
          responses.map(renderResponse)
        )}
        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// =======================================================
// STYLES
// =======================================================
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
  responseCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  responseCardDark: {
    backgroundColor: '#16213e',
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  responseInfo: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  responseTime: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  responseMessage: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
    textAlign: 'center',
    marginTop: 8,
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});