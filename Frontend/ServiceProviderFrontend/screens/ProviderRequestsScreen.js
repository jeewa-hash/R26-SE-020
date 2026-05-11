import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { providerRequestsAPI, bookingsAPI } from '../services/api';
import { getStoredUserId } from '../utils/jwtHelpers';

export default function ProviderRequestsScreen({ navigation }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [providerId, setProviderId] = useState(null);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const id = await getStoredUserId();
      if (!id) {
        Alert.alert('Error', 'Provider ID not found. Please login again.');
        navigation.navigate('Login');
        return;
      }
      setProviderId(id);
      await fetchRequests(id);
    } catch (error) {
      console.error('Error initializing requests screen:', error);
      Alert.alert('Error', 'Failed to load requests');
    }
  };

  const fetchRequests = async (id) => {
    try {
      const response = await providerRequestsAPI.getRequests();
      const myRequests = response.data.filter(req => req.providerId === id);
      setRequests(myRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (providerId) {
      fetchRequests(providerId);
    }
  };

  const handleAcceptRequest = async (request) => {
    Alert.alert(
      'Accept Request',
      `Accept this service request? This will create a booking.`,
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
                seekerId: request.seekerId,
                serviceCategory: request.serviceCategory,
                requestedDate: request.requestedDate,
                requestedStartTime: request.requestedStartTime,
                estimatedDurationHours: request.estimatedDurationHours,
              });

              // Update request status
              await providerRequestsAPI.updateRequestStatus(request.id, 'accepted');

              setRequests(prev =>
                prev.map(req =>
                  req.id === request.id ? { ...req, status: 'accepted' } : req
                )
              );

              Alert.alert('Success', 'Request accepted and booking created!');
            } catch (error) {
              console.error('Error accepting request:', error);
              Alert.alert('Error', 'Failed to accept request');
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
              await providerRequestsAPI.updateRequestStatus(requestId, 'rejected');
              setRequests(prev =>
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

  const pendingRequests = requests.filter(req => req.status === 'pending');
  const acceptedRequests = requests.filter(req => req.status === 'accepted');
  const rejectedRequests = requests.filter(req => req.status === 'rejected');

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
        <Text style={styles.headerTitle}>My Requests</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#667eea" />
            <Text style={styles.loadingText}>Loading requests...</Text>
          </View>
        ) : (
          <>
            {/* Stats */}
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{pendingRequests.length}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{acceptedRequests.length}</Text>
                <Text style={styles.statLabel}>Accepted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{rejectedRequests.length}</Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </View>
            </View>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {pendingRequests.map((request) => {
                  const riskStyle = getRiskStyle(request.riskLevel);
                  return (
                    <View key={request.id} style={styles.requestCard}>
                      <View style={styles.requestHeader}>
                        <View style={styles.requestInfo}>
                          <Text style={styles.serviceTitle}>{request.serviceCategory}</Text>
                          <Text style={styles.requestTime}>
                            Requested: {formatDate(request.requestedDate)} at {formatTime(request.requestedStartTime)}
                          </Text>
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
                    </View>
                  );
                })}
              </View>
            )}

            {/* Accepted Requests */}
            {acceptedRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Accepted Requests</Text>
                {acceptedRequests.map((request) => (
                  <View key={request.id} style={[styles.requestCard, styles.acceptedCard]}>
                    <View style={styles.requestHeader}>
                      <View style={styles.requestInfo}>
                        <Text style={styles.serviceTitle}>{request.serviceCategory}</Text>
                        <Text style={styles.requestTime}>
                          {formatDate(request.requestedDate)} at {formatTime(request.requestedStartTime)}
                        </Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.acceptedText}>✓ Accepted</Text>
                      </View>
                    </View>
                    <Text style={styles.detailText}>
                      Duration: {request.estimatedDurationHours} hours
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Rejected Requests */}
            {rejectedRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Rejected Requests</Text>
                {rejectedRequests.map((request) => (
                  <View key={request.id} style={[styles.requestCard, styles.rejectedCard]}>
                    <View style={styles.requestHeader}>
                      <View style={styles.requestInfo}>
                        <Text style={styles.serviceTitle}>{request.serviceCategory}</Text>
                        <Text style={styles.requestTime}>
                          {formatDate(request.requestedDate)} at {formatTime(request.requestedStartTime)}
                        </Text>
                      </View>
                      <View style={styles.statusBadge}>
                        <Text style={styles.rejectedText}>✗ Rejected</Text>
                      </View>
                    </View>
                    <Text style={styles.detailText}>
                      Duration: {request.estimatedDurationHours} hours
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Empty State */}
            {requests.length === 0 && (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyText}>No requests yet</Text>
                <Text style={styles.emptySubtext}>Your service requests will appear here</Text>
              </View>
            )}
          </>
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
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  statsContainer: {
    flexDirection: 'row',
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
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
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
  acceptedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10B981',
  },
  rejectedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#DC2626',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  requestInfo: {
    flex: 1,
  },
  serviceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  requestTime: {
    fontSize: 12,
    color: '#6B7280',
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
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  acceptedText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 12,
  },
  rejectedText: {
    color: '#DC2626',
    fontWeight: 'bold',
    fontSize: 12,
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
});