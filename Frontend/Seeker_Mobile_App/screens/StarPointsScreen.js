import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import BottomNav from '../components/BottomNav';
import { useTheme } from '../hooks/useTheme';
import { API_BASE_URL } from '../config';

export default function StarPointsScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [balance, setBalance] = useState({ balance: 0, lifetimeEarned: 0, lifetimeSpent: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadRewards = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError('');

      const token = await AsyncStorage.getItem('userToken');
      if (!token) throw new Error('Please log in again to view your Star Points.');

      const headers = { Authorization: `Bearer ${token}` };
      const [balanceResponse, historyResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/rewards/balance`, { headers }),
        fetch(`${API_BASE_URL}/api/rewards/history?page=1&limit=50`, { headers }),
      ]);

      const balanceData = await balanceResponse.json();
      const historyData = await historyResponse.json();

      if (!balanceResponse.ok) throw new Error(balanceData.error || 'Could not load your Star Points.');
      if (!historyResponse.ok) throw new Error(historyData.error || 'Could not load point history.');

      setBalance({
        balance: Number(balanceData.balance || 0),
        lifetimeEarned: Number(balanceData.lifetimeEarned || 0),
        lifetimeSpent: Number(balanceData.lifetimeSpent || 0),
      });
      setTransactions(historyData.transactions || []);
    } catch (loadError) {
      setError(loadError.message || 'Could not load Star Points.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadRewards();
  }, [loadRewards]));

  const totalPoints = balance.balance;
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const monthlyEarned = transactions
    .filter((transaction) => transaction.type === 'EARN' && new Date(transaction.createdAt) >= startOfMonth)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const monthlyRedeemed = Math.abs(transactions
    .filter((transaction) => transaction.type === 'SPEND' && new Date(transaction.createdAt) >= startOfMonth)
    .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0));

  const getPointsToNextReward = () => {
    const nextReward = 1500;
    return Math.max(0, nextReward - totalPoints);
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadRewards(true)} />}
      >
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
          {loading ? <ActivityIndicator size="large" color="#fff" style={styles.pointsLoader} /> : <Text style={styles.pointsAmount}>{totalPoints}</Text>}
          <Text style={styles.pointsLabel}>Total Star Points</Text>
          <View style={styles.nextRewardContainer}>
            <Text style={styles.nextRewardText}>
              {getPointsToNextReward()} points to next reward
            </Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min((totalPoints / 1500) * 100, 100)}%` }]} />
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
            <Text style={[styles.statValue, isDarkMode && styles.textDark]}>{balance.lifetimeEarned}</Text>
            <Text style={[styles.statLabel, isDarkMode && styles.textMutedDark]}>Lifetime Earned</Text>
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

        {/* Spacer at the bottom (no transaction history) */}
        <View style={{ height: 80 }} />
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
  pointsLoader: {
    height: 76,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
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
  textDark: {
    color: '#fff',
  },
  textMutedDark: {
    color: '#9CA3AF',
  },
});