import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Alert, RefreshControl, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { postsAPI, providerRequestsAPI, bookingsAPI } from '../services/api';

export default function PostDetailScreen({ navigation, route }) {
  const { post } = route.params;
  const [providerRequests, setProviderRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchProviderRequests();
  }, []);

  const fetchProviderRequests = async () => {
    try {
      // In a real app, you'd filter requests by postId
      // For now, we'll get all requests and filter client-side
      const response = await providerRequestsAPI.getRequests();
      const requests = response.data.filter(req => req.postId === post.id);
      setProviderRequests(requests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      Alert.alert('Error', 'Failed to load provider requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchProviderRequests();
  };

  const handleAcceptRequest = async (request) => {
    Alert.alert(
      'Accept Request',
      `Accept ${request.providerName}'s request? This will create a booking.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              // Create booking from the request
              await bookingsAPI.createBooking({
                postId: request.postId,
                providerId: request.providerId,
                seekerId: post.seekerId,
                serviceCategory: post.category,
                requestedDate: request.requestedDate,
                requestedStartTime: request.requestedStartTime,
                estimatedDurationHours: request.estimatedDurationHours,
              });

              Alert.alert('Success', 'Booking created successfully!');
              navigation.goBack();
            } catch (error) {
              console.error('Error creating booking:', error);
              Alert.alert('Error', 'Failed to create booking');
            }
          }
        }
      ]
    );
  };

  const handleRejectRequest = async (requestId) => {
    Alert.alert(
      'Reject Request',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await providerRequestsAPI.rejectRequest(requestId);
              setProviderRequests(prev =>
                prev.map(req =>
                  req.id === requestId ? { ...req, status: 'rejected' } : req
                )
              );
              Alert.alert('Success', 'Request rejected');
            } catch (error) {
              console.error('Error rejecting request:', error);
              Alert.alert('Error', 'Failed to reject request');
            }
          }
        }
      ]
    );
  };

  const getRiskStyle = (riskLevel) => {
    switch (riskLevel?.toLowerCase()) {
      case 'high':
        return { bg: '#FEE2E2', color: '#DC2626', text: '🔴 HIGH' };
      case 'medium':
        return { bg: '#FEF3C7', color: '#F59E0B', text: '🟡 MEDIUM' };
      case 'low':
        return { bg: '#D1FAE5', color: '#10B981', text: '🟢 LOW' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: '⚪ UNKNOWN' };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Post Details</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Post Info */}
        <View style={styles.postCard}>
          <Text style={styles.postTitle}>{post.title}</Text>
          <Text style={styles.postDescription}>{post.description}</Text>

          <View style={styles.postMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{post.category}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="alert-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{post.urgency}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={16} color="#6B7280" />
              <Text style={styles.metaText}>{post.location?.address || 'Location not specified'}</Text>
            </View>
          </View>
        </View>

        {/* Provider Requests */}
        <Text style={styles.sectionTitle}>Provider Requests ({providerRequests.length})</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : providerRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
            <Text style={styles.emptyText}>No provider requests yet</Text>
            <Text style={styles.emptySubtext}>Providers will send requests for your post</Text>
          </View>
        ) : (
          providerRequests.map((request) => {
            const riskStyle = getRiskStyle(request.riskLevel);
            return (
              <View key={request.id} style={styles.requestCard}>
                <View style={styles.requestHeader}>
                  <View style={styles.providerInfo}>
                    <Ionicons name="person-circle-outline" size={32} color="#667eea" />
                    <View>
                      <Text style={styles.providerName}>{request.providerName}</Text>
                      <Text style={styles.requestTime}>
                        Requested: {formatDate(request.requestedDate)} at {formatTime(request.requestedStartTime)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.riskBadge, { backgroundColor: riskStyle.bg }]}>
                    <Text style={[styles.riskText, { color: riskStyle.color }]}>
                      {riskStyle.text}
                    </Text>
                  </View>
                </View>

                <View style={styles.requestDetails}>
                  <Text style={styles.detailText}>
                    Duration: {request.estimatedDurationHours} hours
                  </Text>
                  {request.validationMessage && (
                    <Text style={styles.validationText}>
                      {request.validationMessage}
                    </Text>
                  )}
                </View>

                {request.status === 'pending' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.rejectButton]}
                      onPress={() => handleRejectRequest(request.id)}
                    >
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleAcceptRequest(request)}
                    >
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {request.status === 'accepted' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.acceptedText}>✓ Accepted</Text>
                  </View>
                )}

                {request.status === 'rejected' && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.rejectedText}>✗ Rejected</Text>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    padding: 16,
    paddingTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  postCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    marginBottom: 16,
  },
  postMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#6B7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginLeft: 8,
  },
  requestTime: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  requestDetails: {
    marginBottom: 12,
  },
  detailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  validationText: {
    fontSize: 12,
    color: '#F59E0B',
    marginTop: 4,
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButton: {
    backgroundColor: '#FEE2E2',
  },
  rejectButtonText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
  acceptButton: {
    backgroundColor: '#D1FAE5',
  },
  acceptButtonText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  statusBadge: {
    alignItems: 'center',
    padding: 8,
  },
  acceptedText: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  rejectedText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
});