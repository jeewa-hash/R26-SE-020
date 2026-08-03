import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';

export default function StarPointsScreen({ navigation }) {
  const { isDarkMode } = useTheme();

  const transactions = [
    { id: 1, title: "Completed Service - Plumbing", points: 50, date: "May 15, 2024", time: "2:30 PM", type: "credit", description: "Service completed successfully" },
    { id: 2, title: "Posted a New Bid", points: 10, date: "May 12, 2024", time: "10:15 AM", type: "credit", description: "Bid posted for bathroom repair" },
    { id: 3, title: "Referral Bonus", points: 100, date: "May 10, 2024", time: "9:00 AM", type: "credit", description: "Referred a friend to ServiceHub" },
    { id: 4, title: "Service Booking", points: -25, date: "May 8, 2024", time: "3:45 PM", type: "debit", description: "Used points for booking discount" },
    { id: 5, title: "Completed Service - Cleaning", points: 45, date: "May 5, 2024", time: "11:00 AM", type: "credit", description: "House cleaning service completed" },
    { id: 6, title: "Monthly Bonus", points: 30, date: "May 1, 2024", time: "12:00 AM", type: "credit", description: "Active user monthly bonus" },
  ];

  const totalPoints = 1250;
  const monthlyEarned = transactions.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.points, 0);
  const monthlyRedeemed = Math.abs(transactions.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.points, 0));

  const getPointsToNextReward = () => {
    const nextReward = 1500;
    return nextReward - totalPoints;
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? "#1a1a2e" : "#667eea"} 
      />
      
      {/* Header */}
      <LinearGradient
        colors={isDarkMode ? ['#1a1a2e', '#16213e'] : ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Star Points</Text>
        <TouchableOpacity style={styles.helpButton}>
          <Ionicons name="help-circle-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Points Card */}
      <LinearGradient
        colors={['#FBBF24', '#F59E0B']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.pointsCard}
      >
        <View style={styles.pointsHeader}>
          <View style={styles.pointsIconContainer}>
            <Ionicons name="star" size={32} color="#fff" />
          </View>
          <View style={styles.pointsLevel}>
            <Text style={styles.pointsLevelText}>Gold Member</Text>
          </View>
        </View>
        <Text style={styles.pointsAmount}>{totalPoints}</Text>
        <Text style={styles.pointsLabel}>Total Star Points</Text>
        <View style={styles.nextRewardContainer}>
          <Text style={styles.nextRewardText}>
            {getPointsToNextReward()} points to next reward
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(totalPoints / 1500) * 100}%` }]} />
          </View>
        </View>
      </LinearGradient>

      {/* Stats Row */}
      <View style={[styles.statsContainer, isDarkMode && styles.statsContainerDark]}>
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#10B98115' }]}>
            <Ionicons name="arrow-up" size={20} color="#10B981" />
          </View>
          <Text style={[styles.statValue, isDarkMode && styles.textDark]}>+{monthlyEarned}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Earned This Month</Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#EF444415' }]}>
            <Ionicons name="arrow-down" size={20} color="#EF4444" />
          </View>
          <Text style={[styles.statValue, isDarkMode && styles.textDark]}>-{monthlyRedeemed}</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Redeemed This Month</Text>
        </View>
        <View style={[styles.statDivider, isDarkMode && styles.statDividerDark]} />
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#667eea15' }]}>
            <Ionicons name="gift" size={20} color="#667eea" />
          </View>
          <Text style={[styles.statValue, isDarkMode && styles.textDark]}>15</Text>
          <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Rewards Available</Text>
        </View>
      </View>

      {/* Reward Tiers */}
      <View style={styles.tiersContainer}>
        <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Reward Tiers</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiersScroll}>
          <View style={[styles.tierCard, totalPoints >= 500 && styles.tierCardActive, isDarkMode && styles.tierCardDark]}>
            <Ionicons name="star" size={24} color={totalPoints >= 500 ? "#FBBF24" : (isDarkMode ? "#4B5563" : "#D1D5DB")} />
            <Text style={[styles.tierPoints, isDarkMode && styles.textDark]}>500 pts</Text>
            <Text style={[styles.tierName, isDarkMode && styles.textMutedDark]}>Silver</Text>
          </View>
          <View style={[styles.tierCard, totalPoints >= 1000 && styles.tierCardActive, isDarkMode && styles.tierCardDark]}>
            <Ionicons name="star" size={24} color={totalPoints >= 1000 ? "#FBBF24" : (isDarkMode ? "#4B5563" : "#D1D5DB")} />
            <Text style={[styles.tierPoints, isDarkMode && styles.textDark]}>1000 pts</Text>
            <Text style={[styles.tierName, isDarkMode && styles.textMutedDark]}>Gold</Text>
          </View>
          <View style={[styles.tierCard, totalPoints >= 2000 && styles.tierCardActive, isDarkMode && styles.tierCardDark]}>
            <Ionicons name="star" size={24} color={totalPoints >= 2000 ? "#FBBF24" : (isDarkMode ? "#4B5563" : "#D1D5DB")} />
            <Text style={[styles.tierPoints, isDarkMode && styles.textDark]}>2000 pts</Text>
            <Text style={[styles.tierName, isDarkMode && styles.textMutedDark]}>Platinum</Text>
          </View>
          <View style={[styles.tierCard, totalPoints >= 5000 && styles.tierCardActive, isDarkMode && styles.tierCardDark]}>
            <Ionicons name="star" size={24} color={totalPoints >= 5000 ? "#FBBF24" : (isDarkMode ? "#4B5563" : "#D1D5DB")} />
            <Text style={[styles.tierPoints, isDarkMode && styles.textDark]}>5000 pts</Text>
            <Text style={[styles.tierName, isDarkMode && styles.textMutedDark]}>Diamond</Text>
          </View>
        </ScrollView>
      </View>

      {/* Transaction History */}
      <View style={styles.transactionsContainer}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Transaction History</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {transactions.map((transaction) => (
          <View key={transaction.id} style={[styles.transactionCard, isDarkMode && styles.transactionCardDark]}>
            <View style={styles.transactionIcon}>
              <Ionicons 
                name={transaction.type === 'credit' ? "add-circle" : "remove-circle"} 
                size={32} 
                color={transaction.type === 'credit' ? "#10B981" : "#EF4444"} 
              />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={[styles.transactionTitle, isDarkMode && styles.textDark]}>{transaction.title}</Text>
              <Text style={[styles.transactionDescription, isDarkMode && styles.textMutedDark]}>{transaction.description}</Text>
              <View style={styles.transactionMeta}>
                <Ionicons name="calendar-outline" size={12} color="#9CA3AF" />
                <Text style={[styles.transactionDate, isDarkMode && styles.textMutedDark]}>{transaction.date}</Text>
                <Ionicons name="time-outline" size={12} color="#9CA3AF" />
                <Text style={[styles.transactionTime, isDarkMode && styles.textMutedDark]}>{transaction.time}</Text>
              </View>
            </View>
            <Text style={[
              styles.transactionPoints,
              transaction.type === 'credit' ? styles.creditText : styles.debitText
            ]}>
              {transaction.type === 'credit' ? '+' : ''}{transaction.points}
            </Text>
          </View>
        ))}
      </View>

      {/* Redeem Button */}
      <TouchableOpacity style={styles.redeemButton}>
        <LinearGradient
          colors={isDarkMode ? ['#2d3561', '#1a1a2e'] : ['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.redeemGradient}
        >
          <Ionicons name="gift-outline" size={20} color="#fff" />
          <Text style={styles.redeemButtonText}>Redeem Points</Text>
        </LinearGradient>
      </TouchableOpacity>

      <BottomNav />
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
  helpButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsCard: {
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#FBBF24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pointsIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ffffff30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pointsLevel: {
    backgroundColor: '#ffffff30',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  pointsLevelText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  pointsAmount: {
    fontSize: 56,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  pointsLabel: {
    fontSize: 14,
    color: '#ffffffcc',
    textAlign: 'center',
    marginBottom: 16,
  },
  nextRewardContainer: {
    marginTop: 8,
  },
  nextRewardText: {
    fontSize: 12,
    color: '#ffffffcc',
    textAlign: 'center',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#ffffff30',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  statsContainerDark: {
    backgroundColor: '#16213e',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  statDividerDark: {
    backgroundColor: '#2d3561',
  },
  tiersContainer: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  tiersScroll: {
    flexDirection: 'row',
  },
  tierCard: {
    width: 100,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  tierCardDark: {
    backgroundColor: '#16213e',
  },
  tierCardActive: {
    borderWidth: 2,
    borderColor: '#FBBF24',
  },
  tierPoints: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  tierName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  transactionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionCardDark: {
    backgroundColor: '#16213e',
  },
  transactionIcon: {
    marginRight: 14,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 6,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  transactionDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  transactionTime: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  transactionPoints: {
    fontSize: 16,
    fontWeight: '700',
  },
  creditText: {
    color: '#10B981',
  },
  debitText: {
    color: '#EF4444',
  },
  redeemButton: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 30,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  redeemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  redeemButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});