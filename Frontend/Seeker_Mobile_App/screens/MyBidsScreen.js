import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';

export default function MyBidsScreen({ navigation }) {
  const [userBids, setUserBids] = useState([
    { id: 1, category: "Repairing Services", service: "Plumbing", title: "Need plumber for bathroom leak", description: "Urgent pipe leak in kitchen sink. Need experienced plumber.", budget: "$100 - $200", location: "Colombo", status: "active", responses: 3, createdAt: "2024-05-01" },
    { id: 2, category: "Cleaning Services", service: "House Cleaning", title: "Deep cleaning for 3BHK apartment", description: "Need thorough cleaning including kitchen and bathrooms.", budget: "$80 - $120", location: "Kandy", status: "active", responses: 5, createdAt: "2024-05-03" },
    { id: 3, category: "Gardening Services", service: "Maintenance", title: "Weekly garden maintenance", description: "Need regular garden trimming and watering.", budget: "$50 - $80", location: "Colombo", status: "closed", responses: 2, createdAt: "2024-04-28" },
  ]);

  const getStatusStyle = (status) => {
    switch(status) {
      case 'active':
        return { bg: '#D1FAE5', color: '#10B981', text: 'Active', icon: 'checkmark-circle' };
      case 'closed':
        return { bg: '#FEF3C7', color: '#F59E0B', text: 'Closed', icon: 'time' };
      default:
        return { bg: '#F3F4F6', color: '#6B7280', text: status, icon: 'help' };
    }
  };

  const handleViewResponses = (bid) => {
    navigation.navigate('BidResponsesScreen', { bid });
  };

  const handleEditBid = (bid) => {
    navigation.navigate('BiddingScreen', { editMode: true, bidData: bid });
  };

  const handleDeleteBid = (bid) => {
    Alert.alert(
      "Delete Bid",
      `Are you sure you want to delete "${bid.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", onPress: () => {
          setUserBids(userBids.filter(b => b.id !== bid.id));
          Alert.alert("Success", "Bid deleted successfully");
        }, style: "destructive" }
      ]
    );
  };

  // Calculate stats
  const activeBids = userBids.filter(bid => bid.status === 'active').length;
  const totalResponses = userBids.reduce((sum, bid) => sum + bid.responses, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bids</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('BiddingScreen')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Stats Cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#667eea15' }]}>
            <Ionicons name="gavel" size={20} color="#667eea" />
          </View>
          <Text style={styles.statNumber}>{userBids.length}</Text>
          <Text style={styles.statLabel}>Total Bids</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          </View>
          <Text style={styles.statNumber}>{activeBids}</Text>
          <Text style={styles.statLabel}>Active Bids</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#F59E0B15' }]}>
            <Ionicons name="chatbubbles" size={20} color="#F59E0B" />
          </View>
          <Text style={styles.statNumber}>{totalResponses}</Text>
          <Text style={styles.statLabel}>Responses</Text>
        </View>
      </View>

      {/* Section Title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Bid History</Text>
        <TouchableOpacity>
          <Text style={styles.seeAllText}>See All</Text>
        </TouchableOpacity>
      </View>

      {/* Bids List */}
      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {userBids.map((bid) => {
          const status = getStatusStyle(bid.status);
          return (
            <View key={bid.id} style={styles.bidCard}>
              <LinearGradient
                colors={['#ffffff', '#f8f9fa']}
                style={styles.cardGradient}
              >
                {/* Header */}
                <View style={styles.cardHeader}>
                  <View style={styles.categoryContainer}>
                    <View style={[styles.categoryIcon, { backgroundColor: '#667eea15' }]}>
                      <Ionicons name="briefcase" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.bidCategory}>{bid.category}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                    <Ionicons name={status.icon} size={12} color={status.color} />
                    <Text style={[styles.statusText, { color: status.color }]}>{status.text}</Text>
                  </View>
                </View>

                {/* Title & Service */}
                <Text style={styles.bidTitle}>{bid.title}</Text>
                <Text style={styles.bidService}>{bid.service}</Text>
                
                {/* Description */}
                <Text style={styles.bidDescription} numberOfLines={2}>
                  {bid.description}
                </Text>

                {/* Details */}
                <View style={styles.detailsRow}>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="cash-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.detailText}>{bid.budget}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="location-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.detailText}>{bid.location}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <View style={styles.detailIcon}>
                      <Ionicons name="calendar-outline" size={14} color="#667eea" />
                    </View>
                    <Text style={styles.detailText}>{bid.createdAt}</Text>
                  </View>
                </View>

                {/* Responses */}
                <TouchableOpacity onPress={() => handleViewResponses(bid)}>
                  <View style={styles.responsesContainer}>
                    <Ionicons name="people-outline" size={16} color="#667eea" />
                    <Text style={styles.bidResponses}>{bid.responses} professionals responded</Text>
                    <Ionicons name="chevron-forward" size={16} color="#667eea" />
                  </View>
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.editButton}
                    onPress={() => handleEditBid(bid)}
                  >
                    <Ionicons name="create-outline" size={18} color="#667eea" />
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBid(bid)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          );
        })}

        {/* Empty State */}
        {userBids.length === 0 && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="gavel-outline" size={50} color="#D1D5DB" />
            </View>
            <Text style={styles.emptyText}>No Bids Yet</Text>
            <Text style={styles.emptySubtext}>Create your first bid to get quotes from professionals</Text>
            <TouchableOpacity 
              style={styles.createBidButton}
              onPress={() => navigation.navigate('BiddingScreen')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.createBidGradient}
              >
                <Ionicons name="add" size={20} color="#fff" />
                <Text style={styles.createBidText}>Create New Bid</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  seeAllText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  bidCard: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  cardGradient: {
    padding: 16,
    borderRadius: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bidCategory: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  bidTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  bidService: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  bidDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#667eea15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#6B7280',
  },
  responsesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#667eea10',
    borderRadius: 12,
    marginBottom: 12,
  },
  bidResponses: {
    flex: 1,
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#667eea',
    backgroundColor: '#fff',
  },
  editButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#667eea',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    backgroundColor: '#fff',
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#EF4444',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 40,
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
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  createBidButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  createBidGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 8,
  },
  createBidText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});