import PageHeader from '../components/PageHeader';
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

// ─────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────
const P = {
  indigo: '#4F46E5',
  indigoDeep: '#4338CA',
  indigoSoft: '#EEF2FF',
  indigoSoftDark: '#1E1B4B',
  indigoLight: '#A5B4FC',
  emerald: '#10B981',
  emeraldDark: '#059669',
  emeraldSoft: '#ECFDF5',
  emeraldSoftDark: '#064E3B',
  emeraldLight: '#34D399',
  amber: '#F59E0B',
  amberDeep: '#D97706',
  amberLight: '#FBBF24',
  amberSoft: '#FEF3C7',
  amberSoftDark: '#78350F',
  rose: '#EF4444',
  roseSoft: '#FEF2F2',
  roseSoftDark: '#7F1D1D',
  roseLight: '#FCA5A5',
  slate900: '#0F172A',
  slate800: '#1E293B',
  slate700: '#334155',
  slate600: '#475569',
  slate500: '#64748B',
  slate400: '#94A3B8',
  slate300: '#CBD5E1',
  slate200: '#E2E8F0',
  slate100: '#F1F5F9',
  slate50: '#F8FAFC',
  white: '#FFFFFF',
};

// Tier thresholds (same as your original data)
const TIERS = [
  { key: 'silver', points: 500, label: 'Silver' },
  { key: 'gold', points: 1000, label: 'Gold' },
  { key: 'platinum', points: 2000, label: 'Platinum' },
  { key: 'diamond', points: 5000, label: 'Diamond' },
];

const REWARD_GATE = 1500; // existing next-reward threshold

const getTierInfo = (points) => {
  // Current tier = highest threshold achieved
  let current = null;
  let next = null;
  for (const tier of TIERS) {
    if (points >= tier.points) current = tier;
    else if (!next) next = tier;
  }
  return { current, next };
};

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
      // Retry any missed rewards for completed bookings before reading the balance.
      // The backend deduplicates by booking ID, so this is safe on every screen visit.
      try {
        const reconcileResponse = await fetch(
          `${API_BASE_URL}/coordination/bookings/me/rewards/reconcile`,
          { method: 'POST', headers }
        );
        if (!reconcileResponse.ok) {
          console.warn('Could not reconcile completed booking rewards:', reconcileResponse.status);
        }
      } catch (reconcileError) {
        console.warn('Could not reconcile completed booking rewards:', reconcileError.message);
      }

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

  const getPointsToNextReward = () => Math.max(0, REWARD_GATE - totalPoints);

  const { current: currentTier, next: nextTier } = getTierInfo(totalPoints);

  // Progress bar tied to real next tier (falls back to reward gate)
  const progressTarget = nextTier?.points ?? REWARD_GATE;
  const progressPct = Math.max(0, Math.min((totalPoints / progressTarget) * 100, 100));

  const memberLabel = currentTier
    ? `${currentTier.label} Member`
    : 'Starter';

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? P.slate900 : P.indigoDeep}
      />

      <PageHeader
        title={<>Star Points</>}
        onBack={() => navigation.goBack()}
        renderActions={({ textColor }) => (
          <TouchableOpacity
            style={[
              styles.headerActionBtn,
              isDarkMode && { backgroundColor: P.slate800 },
            ]}
            activeOpacity={0.75}
          >
            <Ionicons name="help-circle-outline" size={22} color={textColor} />
          </TouchableOpacity>
        )}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRewards(true)}
            tintColor={P.amber}
          />
        }
      >
        {/* ── Points hero card ── */}
        <View style={styles.pointsCardWrap}>
          <LinearGradient
            colors={[P.amberLight, P.amber, P.amberDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.pointsCard}
          >
            {/* Decorative orbs */}
            <View style={styles.orb1} />
            <View style={styles.orb2} />

            <View style={styles.pointsHeader}>
              <View style={styles.pointsIconWrap}>
                <Ionicons name="star" size={28} color={P.white} />
              </View>
              <View style={styles.levelPill}>
                <Ionicons name="ribbon" size={12} color={P.white} />
                <Text style={styles.levelPillText}>{memberLabel}</Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={P.white} style={styles.pointsLoader} />
            ) : (
              <Text style={styles.pointsAmount}>{totalPoints.toLocaleString()}</Text>
            )}

            <Text style={styles.pointsLabel}>Total Star Points</Text>

            <View style={styles.nextRewardBox}>
              <View style={styles.nextRewardHeader}>
                <Text style={styles.nextRewardText}>
                  {getPointsToNextReward() > 0
                    ? `${getPointsToNextReward()} pts to next reward`
                    : 'Reward unlocked'}
                </Text>
                {nextTier && (
                  <Text style={styles.nextRewardTarget}>{nextTier.label}</Text>
                )}
              </View>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressHelper}>
                {Math.min(totalPoints, progressTarget).toLocaleString()} / {progressTarget.toLocaleString()} pts
              </Text>
            </View>
          </LinearGradient>
        </View>

        {/* ── Error message ── */}
        {error ? (
          <View
            style={[
              styles.errorCard,
              isDarkMode && { backgroundColor: P.roseSoftDark, borderColor: P.rose },
            ]}
          >
            <Ionicons name="alert-circle" size={20} color={P.rose} />
            <Text
              style={[styles.errorText, isDarkMode && { color: P.roseLight }]}
              numberOfLines={3}
            >
              {error}
            </Text>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={() => loadRewards(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={14} color={P.white} />
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('SeekerServices')} style={{ backgroundColor: isDarkMode ? P.slate800 : P.indigoSoft, borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <Text style={{ color: isDarkMode ? P.indigoLight : P.indigo, fontWeight: '700', fontSize: 16 }}>Also use points on a service</Text>
          <Text style={{ color: isDarkMode ? P.slate300 : P.slate600, fontSize: 13, lineHeight: 20, marginTop: 6 }}>1 Star Point = LKR 1 towards a completed service. Open My Services to choose how many points to use. Your provider keeps the full agreed earnings.</Text>
        </TouchableOpacity>

        {/* ── Stats row ── */}
        <View style={styles.statsSectionLabel}>
          <Text style={[styles.sectionLabel, isDarkMode && { color: P.slate400 }]}>
            THIS MONTH
          </Text>
        </View>

        <View
          style={[
            styles.statsContainer,
            isDarkMode && { backgroundColor: P.slate800, borderColor: P.slate700 },
          ]}
        >
          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: isDarkMode ? P.emeraldSoftDark : P.emeraldSoft },
              ]}
            >
              <Ionicons
                name="arrow-up"
                size={18}
                color={isDarkMode ? P.emeraldLight : P.emerald}
              />
            </View>
            <Text style={[styles.statValue, isDarkMode && { color: P.white }]}>
              +{monthlyEarned}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && { color: P.slate400 }]}>
              Earned
            </Text>
          </View>

          <View
            style={[styles.statDivider, isDarkMode && { backgroundColor: P.slate700 }]}
          />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: isDarkMode ? P.roseSoftDark : P.roseSoft },
              ]}
            >
              <Ionicons
                name="arrow-down"
                size={18}
                color={isDarkMode ? P.roseLight : P.rose}
              />
            </View>
            <Text style={[styles.statValue, isDarkMode && { color: P.white }]}>
              -{monthlyRedeemed}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && { color: P.slate400 }]}>
              Redeemed
            </Text>
          </View>

          <View
            style={[styles.statDivider, isDarkMode && { backgroundColor: P.slate700 }]}
          />

          <View style={styles.statItem}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: isDarkMode ? P.indigoSoftDark : P.indigoSoft },
              ]}
            >
              <Ionicons
                name="gift"
                size={18}
                color={isDarkMode ? P.indigoLight : P.indigo}
              />
            </View>
            <Text style={[styles.statValue, isDarkMode && { color: P.white }]}>
              {balance.lifetimeEarned}
            </Text>
            <Text style={[styles.statLabel, isDarkMode && { color: P.slate400 }]}>
              Lifetime
            </Text>
          </View>
        </View>

        {/* ── Reward tiers ── */}
        <View style={styles.tiersSection}>
          <View style={styles.tiersHeader}>
            <Text style={[styles.sectionTitle, isDarkMode && { color: P.white }]}>
              Reward Tiers
            </Text>
            <Text style={[styles.sectionHint, isDarkMode && { color: P.slate400 }]}>
              Earn more to unlock
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tiersScroll}
            contentContainerStyle={styles.tiersScrollContent}
          >
            {TIERS.map((tier) => {
              const unlocked = totalPoints >= tier.points;
              const isCurrent = currentTier?.key === tier.key;
              const progress = Math.min(100, (totalPoints / tier.points) * 100);

              return (
                <View
                  key={tier.key}
                  style={[
                    styles.tierCard,
                    unlocked && styles.tierCardUnlocked,
                    isCurrent && styles.tierCardCurrent,
                    isDarkMode && {
                      backgroundColor: P.slate800,
                      borderColor: unlocked ? P.amber : P.slate700,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tierIconWrap,
                      {
                        backgroundColor: unlocked
                          ? isDarkMode
                            ? P.amberSoftDark
                            : P.amberSoft
                          : isDarkMode
                          ? P.slate900
                          : P.slate100,
                      },
                    ]}
                  >
                    <Ionicons
                      name={unlocked ? 'star' : 'star-outline'}
                      size={22}
                      color={
                        unlocked
                          ? P.amber
                          : isDarkMode
                          ? P.slate500
                          : P.slate400
                      }
                    />
                  </View>

                  <Text
                    style={[
                      styles.tierPoints,
                      isDarkMode && { color: P.white },
                      !unlocked && isDarkMode && { color: P.slate400 },
                    ]}
                  >
                    {tier.points.toLocaleString()}
                  </Text>
                  <Text
                    style={[
                      styles.tierName,
                      isDarkMode && { color: P.slate400 },
                    ]}
                  >
                    {tier.label}
                  </Text>

                  {/* Per-tier mini progress bar */}
                  <View
                    style={[
                      styles.tierProgressBg,
                      isDarkMode && { backgroundColor: P.slate700 },
                    ]}
                  >
                    <View
                      style={[
                        styles.tierProgressFill,
                        {
                          width: `${progress}%`,
                          backgroundColor: unlocked ? P.amber : P.slate400,
                        },
                      ]}
                    />
                  </View>

                  {isCurrent && (
                    <View style={styles.currentPill}>
                      <Text style={styles.currentPillText}>Current</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <BottomNav />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: P.slate50 },
  containerDark: { backgroundColor: P.slate900 },
  scrollContent: { paddingTop: 8, paddingBottom: 20 },

  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Points hero ──
  pointsCardWrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 20,
  },
  pointsCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: P.amber,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: { elevation: 8 },
    }),
  },
  orb1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -110,
    right: -60,
  },
  orb2: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -80,
    left: -30,
  },

  pointsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pointsIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  levelPillText: {
    fontSize: 12,
    fontWeight: '800',
    color: P.white,
    letterSpacing: 0.2,
  },

  pointsAmount: {
    fontSize: 56,
    fontWeight: '900',
    color: P.white,
    textAlign: 'center',
    letterSpacing: -2,
    marginBottom: 4,
  },
  pointsLoader: { height: 76 },
  pointsLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 20,
    letterSpacing: 0.3,
  },

  nextRewardBox: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  nextRewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  nextRewardText: {
    fontSize: 12.5,
    color: P.white,
    fontWeight: '700',
  },
  nextRewardTarget: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: P.white,
    borderRadius: 4,
  },
  progressHelper: {
    fontSize: 10.5,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 6,
    letterSpacing: 0.2,
  },

  // ── Error ──
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: P.roseSoft,
    borderWidth: 1,
    borderColor: P.rose,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '600',
    color: '#991B1B',
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: P.rose,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  retryText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: P.white,
  },

  // ── Stats ──
  statsSectionLabel: {
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: P.slate500,
    letterSpacing: 0.8,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: P.white,
    marginHorizontal: 16,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  statItem: { flex: 1, alignItems: 'center', gap: 4 },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    color: P.slate500,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  statDivider: {
    width: 1,
    backgroundColor: P.slate200,
    marginVertical: 8,
  },

  // ── Tiers ──
  tiersSection: {
    marginTop: 24,
  },
  tiersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
  },
  sectionHint: {
    fontSize: 12,
    color: P.slate500,
    fontWeight: '600',
  },
  tiersScroll: { flexDirection: 'row' },
  tiersScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tierCard: {
    width: 130,
    backgroundColor: P.white,
    padding: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.slate200,
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
    }),
  },
  tierCardUnlocked: {
    borderColor: P.amber,
    borderWidth: 1.5,
  },
  tierCardCurrent: {
    borderColor: P.amber,
    borderWidth: 2,
  },
  tierIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  tierPoints: {
    fontSize: 15,
    fontWeight: '800',
    color: P.slate900,
    letterSpacing: -0.3,
  },
  tierName: {
    fontSize: 11.5,
    color: P.slate500,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.2,
  },
  tierProgressBg: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    backgroundColor: P.slate100,
    marginTop: 10,
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  currentPill: {
    marginTop: 8,
    backgroundColor: P.amber,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  currentPillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: P.white,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
