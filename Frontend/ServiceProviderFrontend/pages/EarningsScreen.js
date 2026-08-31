import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getBillingOverview,
  createCommissionCheckoutSession,
  refreshMonthlyBill,
} from '../services/billingApi';
import { ThemeContext } from '../context/ThemeContext';
import HeaderSection from '../components/HeaderSection';

const { width } = Dimensions.get('window');

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function EarningsScreen() {
  const navigation = useNavigation();
  const { isDark, toggleTheme } = useContext(ThemeContext) || { isDark: false, toggleTheme: () => {} };

  const [period, setPeriod] = useState('Month'); // 'Month' | 'Year' | 'All Time'
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'fees' | 'boosts'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);

  const [billingData, setBillingData] = useState({
    isSuspended: false,
    suspensionReason: '',
    currentMonthBill: null,
    bills: [],
    lifetimeStats: {
      totalEarned: 0,
      totalCommissionPaid: 0,
      totalCommissionPending: 0,
      completedBookingsTotal: 0,
      netEarnings: 0,
      totalSpentOnBoosts: 0,
      totalBoostSteps: 0,
      boostCount: 0,
    },
    adBoostStats: {
      totalSpentOnBoosts: 0,
      totalBoostSteps: 0,
      boostCount: 0,
      recentBoosts: [],
    },
  });

  const theme = {
    bg: isDark ? '#0F172A' : '#F8FAFC',
    cardBg: isDark ? '#1E293B' : '#FFFFFF',
    cardBorder: isDark ? '#334155' : '#E2E8F0',
    textPrimary: isDark ? '#F8FAFC' : '#1E293B',
    textSecondary: isDark ? '#94A3B8' : '#64748B',
    textMuted: isDark ? '#64748B' : '#94A3B8',
    surfaceVariant: isDark ? '#1E293B' : '#FFFFFF',
    trackBg: isDark ? '#334155' : '#F1F5F9',
    divider: isDark ? '#334155' : '#F1F5F9',
    headerBtnBg: isDark ? '#1E293B' : '#FFFFFF',
    pillInactiveBg: isDark ? '#1E293B' : '#FFFFFF',
    pillInactiveText: isDark ? '#94A3B8' : '#64748B',
  };

  const fetchBillingData = useCallback(async () => {
    try {
      const res = await getBillingOverview();
      if (res?.success && res?.data) {
        setBillingData(res.data);
      }
    } catch (error) {
      console.warn('Failed to load billing overview:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBillingData();
  }, [fetchBillingData]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMonthlyBill();
    } catch (e) {
      // Ignore refresh error and fetch overview
    }
    await fetchBillingData();
  };

  const formatLkr = (num) => {
    const n = Number(num) || 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatDate = (dateVal) => {
    if (!dateVal) return 'N/A';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = String(d.getUTCDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getUTCMonth()];
    const year = d.getUTCFullYear();
    return `${day} ${month} ${year}`;
  };

  const currentBill = billingData?.currentMonthBill || null;
  const allBills = billingData?.bills || [];
  const lifetime = billingData?.lifetimeStats || {
    totalEarned: 0,
    totalCommissionPaid: 0,
    totalCommissionPending: 0,
    completedBookingsTotal: 0,
    netEarnings: 0,
    totalSpentOnBoosts: 0,
    totalBoostSteps: 0,
    boostCount: 0,
  };

  const adBoostStats = billingData?.adBoostStats || {
    totalSpentOnBoosts: 0,
    totalBoostSteps: 0,
    boostCount: 0,
    recentBoosts: [],
  };

  const currentYear = new Date().getUTCFullYear().toString();
  const thisYearBills = allBills.filter((b) => b.billingMonth && b.billingMonth.startsWith(currentYear));

  let displayEarnings = 0;
  let displayJobsCount = 0;
  let displayAvgPerJob = 0;
  let displayCommissionDue = 0;
  let displayBoostExpense = adBoostStats.totalSpentOnBoosts;
  let displayNetEarnings = 0;

  if (period === 'Month') {
    displayEarnings = currentBill?.totalIncome || 0;
    displayJobsCount = currentBill?.completedBookingsCount || 0;
    displayCommissionDue = currentBill?.status !== 'PAID' ? currentBill?.serviceChargeAmount || 0 : 0;
    displayAvgPerJob = displayJobsCount > 0 ? displayEarnings / displayJobsCount : 0;
    const currentPaidComm = currentBill?.status === 'PAID' ? currentBill?.serviceChargeAmount || 0 : 0;
    displayNetEarnings = Math.max(0, displayEarnings - currentPaidComm);
  } else if (period === 'Year') {
    displayEarnings = thisYearBills.reduce((sum, b) => sum + (Number(b.totalIncome) || 0), 0);
    displayJobsCount = thisYearBills.reduce((sum, b) => sum + (Number(b.completedBookingsCount) || 0), 0);
    displayCommissionDue = thisYearBills
      .filter((b) => b.status !== 'PAID')
      .reduce((sum, b) => sum + (Number(b.serviceChargeAmount) || 0), 0);
    const yearPaidComm = thisYearBills
      .filter((b) => b.status === 'PAID')
      .reduce((sum, b) => sum + (Number(b.serviceChargeAmount) || 0), 0);
    displayAvgPerJob = displayJobsCount > 0 ? displayEarnings / displayJobsCount : 0;
    displayNetEarnings = Math.max(0, displayEarnings - yearPaidComm - displayBoostExpense);
  } else {
    displayEarnings = lifetime.totalEarned;
    displayJobsCount = lifetime.completedBookingsTotal;
    displayCommissionDue = lifetime.totalCommissionPending;
    displayAvgPerJob = displayJobsCount > 0 ? displayEarnings / displayJobsCount : 0;
    displayNetEarnings = lifetime.netEarnings || Math.max(0, displayEarnings - lifetime.totalCommissionPaid - displayBoostExpense);
  }

  const chartMonths = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const mStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = MONTH_NAMES[d.getUTCMonth()];
    const foundBill = allBills.find((b) => b.billingMonth === mStr);
    const income = foundBill ? Number(foundBill.totalIncome) || 0 : 0;

    chartMonths.push({
      label,
      monthKey: mStr,
      income,
      active: i === 0,
    });
  }

  const maxChartIncome = Math.max(...chartMonths.map((m) => m.income), 1000);
  const barData = chartMonths.map((m) => ({
    ...m,
    pct: Math.max(m.income / maxChartIncome, 0.06),
  }));

  const handlePayServiceCharge = async (billToPay) => {
    const bill = billToPay || currentBill;

    if (!bill || bill.serviceChargeAmount <= 0) {
      Alert.alert('No Payment Due', 'There are no outstanding 5% platform service charges for this period.');
      return;
    }

    setPaying(true);

    try {
      const res = await createCommissionCheckoutSession(bill._id, bill.billingMonth);

      if (res?.success && res?.url) {
        try {
          navigation.navigate('CheckoutScreen', { checkoutUrl: res.url });
        } catch (navError) {
          Linking.openURL(res.url);
        }
      } else {
        Alert.alert('Payment Error', res?.message || 'Unable to initialize Stripe checkout session.');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || error.message || 'Failed to start payment.');
    } finally {
      setPaying(false);
    }
  };

  const urgentBill =
    allBills.find(
      (b) => ['SUSPENDED', 'OVERDUE'].includes(b.status) && (Number(b.serviceChargeAmount) || 0) > 0
    ) ||
    currentBill ||
    allBills[0] ||
    null;

  const isSuspended = billingData.isSuspended;

  return (
    <View style={[styles.root, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.glowOrb1, { opacity: isDark ? 0.15 : 0.08 }]} />
      <View style={[styles.glowOrb2, { opacity: isDark ? 0.12 : 0.06 }]} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7C3AED']} />}
      >
        <HeaderSection navigation={navigation} />

        <View style={styles.refreshRow}>
          <View style={styles.screenBadge}>
            <MaterialCommunityIcons name="finance" size={13} color="#7C3AED" />
            <Text style={styles.screenBadgeText}>FINANCIAL HUB</Text>
          </View>

          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: theme.headerBtnBg, borderColor: theme.cardBorder }]}
            onPress={onRefresh}
            disabled={refreshing || loading}
            activeOpacity={0.7}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <MaterialIcons name="refresh" size={20} color={theme.textPrimary} />
            )}
          </TouchableOpacity>
        </View>

        {isSuspended && (
          <Surface style={[styles.suspensionBanner, isDark && styles.suspensionBannerDark]} elevation={4}>
            <View style={styles.bannerHeader}>
              <View style={styles.bannerIconCircle}>
                <MaterialCommunityIcons name="shield-alert" size={24} color="#DC2626" />
              </View>

              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.bannerTitle}>Account Suspended</Text>
                <Text style={styles.bannerSub}>Overdue Platform Fee</Text>
              </View>
            </View>

            <Text style={styles.bannerMessage}>
              Your account is suspended due to unpaid monthly platform service charges (5% commission) past the 3-day
              grace period. Features are blocked except the Payment Portal. Please pay below to restore access instantly.
            </Text>

            {urgentBill && urgentBill.status !== 'PAID' && (
              <TouchableOpacity
                style={styles.urgentPayBtn}
                onPress={() => handlePayServiceCharge(urgentBill)}
                disabled={paying}
                activeOpacity={0.85}
              >
                {paying ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="credit-card-fast" size={20} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.urgentPayBtnText}>
                      Pay Overdue LKR {formatLkr(urgentBill.serviceChargeAmount)} via Stripe
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </Surface>
        )}

        <LinearGradient
          colors={isDark ? ['#312E81', '#4C1D95', '#6D28D9'] : ['#4F46E5', '#7C3AED', '#9333EA']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroLabelWrap}>
              <MaterialCommunityIcons name="wallet-outline" size={16} color="rgba(255,255,255,0.85)" />
              <Text style={styles.heroLabel}>
                {period === 'Month'
                  ? `GROSS EARNINGS (${currentBill?.billingMonth || 'THIS MONTH'})`
                  : period === 'Year'
                  ? `GROSS EARNINGS (${currentYear})`
                  : 'LIFETIME GROSS EARNINGS'}
              </Text>
            </View>

            <View style={styles.periodBadge}>
              <Text style={styles.periodBadgeText}>{period}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator color="#FFF" size="large" style={{ marginVertical: 18 }} />
          ) : (
            <Text style={styles.heroAmount}>LKR {formatLkr(displayEarnings)}</Text>
          )}

          <View style={styles.heroFooter}>
            <View style={styles.heroTag}>
              <MaterialCommunityIcons name="check-decagram" size={15} color="#A7F3D0" />
              <Text style={styles.heroTagText}>{displayJobsCount} Completed Jobs</Text>
            </View>

            <View style={styles.heroTagFee}>
              <MaterialCommunityIcons name="percent-outline" size={14} color="#FDE68A" />
              <Text style={styles.heroTagFeeText}>5% Fee: LKR {formatLkr(displayEarnings * 0.05)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.metricRow}>
          <Surface style={[styles.metricCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#10B98118' }]}>
              <MaterialCommunityIcons name="cash-check" size={22} color="#10B981" />
            </View>

            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Net Earnings</Text>

            <Text style={[styles.metricValue, { color: '#10B981' }]} numberOfLines={1}>
              LKR {formatLkr(displayNetEarnings)}
            </Text>

            <Text style={styles.metricSub}>After fees & boosts</Text>
          </Surface>

          <Surface style={[styles.metricCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#EC489918' }]}>
              <MaterialCommunityIcons name="rocket-launch" size={20} color="#EC4899" />
            </View>

            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>AdBoost Outcome</Text>

            <Text style={[styles.metricValue, { color: '#EC4899' }]} numberOfLines={1}>
              {adBoostStats.boostCount} Boosts
            </Text>

            <Text style={[styles.metricSub]}>+{adBoostStats.totalBoostSteps} Priority Steps</Text>
          </Surface>

          <Surface style={[styles.metricCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
            <View style={[styles.metricIconWrap, { backgroundColor: '#F59E0B18' }]}>
              <MaterialCommunityIcons name="chart-bell-curve-cumulative" size={20} color="#F59E0B" />
            </View>

            <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Boost Investment</Text>

            <Text style={[styles.metricValue, { color: '#F59E0B' }]} numberOfLines={1}>
              LKR {formatLkr(adBoostStats.totalSpentOnBoosts)}
            </Text>

            <Text style={styles.metricSub}>Total spend</Text>
          </Surface>
        </View>

        {urgentBill && (
          <Surface style={[styles.portalCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={2}>
            <View style={styles.portalHeader}>
              <View style={styles.portalTitleWrap}>
                <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gatewayIconBadge}>
                  <MaterialCommunityIcons name="shield-check" size={20} color="#FFF" />
                </LinearGradient>

                <View>
                  <Text style={[styles.portalTitle, { color: theme.textPrimary }]}>
                    Monthly 5% Platform Charge
                  </Text>

                  <Text style={[styles.portalMonth, { color: theme.textSecondary }]}>
                    Billing Period: {urgentBill.billingMonth || 'Current'}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.statusPill,
                  urgentBill.status === 'PAID'
                    ? styles.statusPaid
                    : urgentBill.status === 'SUSPENDED' || urgentBill.status === 'OVERDUE'
                    ? styles.statusSuspended
                    : styles.statusPending,
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    urgentBill.status === 'PAID'
                      ? 'check-circle'
                      : urgentBill.status === 'SUSPENDED' || urgentBill.status === 'OVERDUE'
                      ? 'alert-circle'
                      : 'clock-outline'
                  }
                  size={14}
                  color={
                    urgentBill.status === 'PAID'
                      ? '#15803D'
                      : urgentBill.status === 'SUSPENDED' || urgentBill.status === 'OVERDUE'
                      ? '#DC2626'
                      : '#B45309'
                  }
                  style={{ marginRight: 4 }}
                />

                <Text
                  style={[
                    styles.statusPillText,
                    urgentBill.status === 'PAID'
                      ? styles.statusPaidText
                      : urgentBill.status === 'SUSPENDED' || urgentBill.status === 'OVERDUE'
                      ? styles.statusSuspendedText
                      : styles.statusPendingText,
                  ]}
                >
                  {urgentBill.status}
                </Text>
              </View>
            </View>

            <View style={[styles.portalDivider, { backgroundColor: theme.divider }]} />

            <View style={styles.portalRow}>
              <Text style={[styles.portalLabel, { color: theme.textSecondary }]}>Monthly Income Earned:</Text>
              <Text style={[styles.portalVal, { color: theme.textPrimary }]}>
                LKR {formatLkr(urgentBill.totalIncome)}
              </Text>
            </View>

            <View style={styles.portalRow}>
              <Text style={[styles.portalLabel, { color: theme.textSecondary }]}>5% Platform Service Fee:</Text>
              <Text style={[styles.portalValHighlight, { color: '#7C3AED' }]}>
                LKR {formatLkr(urgentBill.serviceChargeAmount)}
              </Text>
            </View>

            <View style={styles.portalRow}>
              <Text style={[styles.portalLabel, { color: theme.textSecondary }]}>Grace Period Due Date:</Text>

              <View style={styles.dueDateBadge}>
                <MaterialCommunityIcons name="calendar-clock" size={13} color="#D97706" />
                <Text style={styles.dueDateText}>
                  {formatDate(urgentBill.dueDate)} (3 Days Grace)
                </Text>
              </View>
            </View>

            {urgentBill.status !== 'PAID' && urgentBill.serviceChargeAmount > 0 && (
              <TouchableOpacity
                style={styles.payGatewayBtn}
                onPress={() => handlePayServiceCharge(urgentBill)}
                disabled={paying}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={
                    urgentBill.status === 'SUSPENDED' || urgentBill.status === 'OVERDUE'
                      ? ['#DC2626', '#B91C1C']
                      : ['#6366F1', '#4F46E5', '#4338CA']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.payGatewayGradient}
                >
                  {paying ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="credit-card-chip-outline" size={22} color="#FFF" style={{ marginRight: 8 }} />

                      <Text style={styles.payGatewayText}>
                        Pay 5% Fee (LKR {formatLkr(urgentBill.serviceChargeAmount)})
                      </Text>

                      <View style={styles.gatewaySecuredBadge}>
                        <MaterialIcons name="lock" size={12} color="#FFF" />
                        <Text style={styles.gatewaySecuredText}>STRIPE</Text>
                      </View>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {urgentBill.status === 'PAID' && (
              <View style={[styles.paidReceiptBox, { backgroundColor: isDark ? '#064E3B33' : '#F0FDF4' }]}>
                <MaterialCommunityIcons name="check-decagram" size={20} color="#10B981" />

                <View style={{ flex: 1 }}>
                  <Text style={styles.paidReceiptTitle}>Payment Settled in Full</Text>
                  <Text style={styles.paidReceiptSub}>
                    Paid on {formatDate(urgentBill.paymentDetails?.paidAt || urgentBill.updatedAt)} • All features active
                  </Text>
                </View>
              </View>
            )}
          </Surface>
        )}

        <View style={styles.pillContainer}>
          {['Month', 'Year', 'All Time'].map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={[
                styles.pill,
                { backgroundColor: period === p ? '#7C3AED' : theme.pillInactiveBg, borderColor: theme.cardBorder },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: period === p ? '#FFFFFF' : theme.pillInactiveText },
                ]}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Surface style={[styles.chartCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
          <View style={styles.chartHeaderRow}>
            <View>
              <Text style={[styles.chartTitle, { color: theme.textPrimary }]}>Performance History</Text>
              <Text style={[styles.chartSub, { color: theme.textSecondary }]}>6-Month Income Timeline</Text>
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={[styles.legendText, { color: theme.textSecondary }]}>Booking Income</Text>
            </View>
          </View>

          <View style={styles.barsContainer}>
            {barData.map((bar) => (
              <View key={bar.monthKey} style={styles.barWrap}>
                <Text style={[styles.barAmountText, { color: bar.active ? '#7C3AED' : theme.textMuted }]}>
                  {bar.income > 0 ? `${Math.round(bar.income / 1000)}k` : '0'}
                </Text>

                <View style={[styles.barTrack, { backgroundColor: theme.trackBg }]}>
                  <View
                    style={[
                      styles.barFill,
                      {
                        height: `${bar.pct * 100}%`,
                        backgroundColor: bar.active ? '#7C3AED' : isDark ? '#4338CA' : '#DDD6FE',
                      },
                    ]}
                  />
                </View>

                <Text
                  style={[
                    styles.barLabel,
                    { color: bar.active ? '#7C3AED' : theme.textMuted },
                    bar.active && styles.barLabelActive,
                  ]}
                >
                  {bar.label}
                </Text>
              </View>
            ))}
          </View>
        </Surface>

        <View style={styles.tabNavRow}>
          {[
            { key: 'overview', label: 'Overview', icon: 'view-grid-outline' },
            { key: 'fees', label: '5% Commission', icon: 'percent' },
            { key: 'boosts', label: 'AdBoosts', icon: 'rocket-launch-outline' },
          ].map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tabNavBtn,
                activeTab === t.key && styles.tabNavBtnActive,
                { borderColor: theme.cardBorder },
              ]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={t.icon}
                size={16}
                color={activeTab === t.key ? '#7C3AED' : theme.textSecondary}
                style={{ marginRight: 6 }}
              />

              <Text
                style={[
                  styles.tabNavText,
                  { color: activeTab === t.key ? '#7C3AED' : theme.textSecondary },
                  activeTab === t.key && styles.tabNavTextActive,
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'overview' && (
          <View>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Monthly Statements</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                {allBills.length} Billing Cycles
              </Text>
            </View>

            {allBills.length === 0 ? (
              <Surface style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
                <MaterialCommunityIcons name="file-document-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No monthly statements generated yet.</Text>
                <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                  Completed coordination bookings will automatically sync into monthly invoices.
                </Text>
              </Surface>
            ) : (
              allBills.map((b) => (
                <Surface
                  key={b._id || b.billingMonth}
                  style={[styles.billItemCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                  elevation={1}
                >
                  <View style={styles.billItemTop}>
                    <View>
                      <Text style={[styles.billMonthTitle, { color: theme.textPrimary }]}>{b.billingMonth}</Text>
                      <Text style={[styles.billPeriodSub, { color: theme.textSecondary }]}>
                        {b.completedBookingsCount || 0} completed bookings
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusPillSmall,
                        b.status === 'PAID'
                          ? styles.statusPaid
                          : b.status === 'SUSPENDED' || b.status === 'OVERDUE'
                          ? styles.statusSuspended
                          : styles.statusPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillSmallText,
                          b.status === 'PAID'
                            ? styles.statusPaidText
                            : b.status === 'SUSPENDED' || b.status === 'OVERDUE'
                            ? styles.statusSuspendedText
                            : styles.statusPendingText,
                        ]}
                      >
                        {b.status}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.billDetailsRow, { borderTopColor: theme.divider }]}>
                    <View>
                      <Text style={[styles.billDetailLabel, { color: theme.textMuted }]}>Gross Income</Text>
                      <Text style={[styles.billDetailVal, { color: theme.textPrimary }]}>
                        LKR {formatLkr(b.totalIncome)}
                      </Text>
                    </View>

                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={[styles.billDetailLabel, { color: theme.textMuted }]}>5% Service Fee</Text>
                      <Text style={[styles.billDetailVal, { color: '#7C3AED' }]}>
                        LKR {formatLkr(b.serviceChargeAmount)}
                      </Text>
                    </View>
                  </View>

                  {b.status !== 'PAID' && (Number(b.serviceChargeAmount) || 0) > 0 && (
                    <TouchableOpacity
                      style={styles.smallPayBtn}
                      onPress={() => handlePayServiceCharge(b)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="credit-card-outline" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.smallPayBtnText}>
                        Pay LKR {formatLkr(b.serviceChargeAmount)} via Stripe
                      </Text>
                    </TouchableOpacity>
                  )}
                </Surface>
              ))
            )}
          </View>
        )}

        {activeTab === 'fees' && (
          <View>
            <Surface style={[styles.infoCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
              <View style={styles.infoCardTop}>
                <MaterialCommunityIcons name="information-outline" size={22} color="#6366F1" />
                <Text style={[styles.infoCardTitle, { color: theme.textPrimary }]}>How 5% Commission Works</Text>
              </View>

              <Text style={[styles.infoCardBody, { color: theme.textSecondary }]}>
                • <Text style={{ fontWeight: '500' }}>Rate:</Text> Exactly 5% of your gross earnings from completed bookings.
                {'\n'}• <Text style={{ fontWeight: '500' }}>Billing Cycle:</Text> Monthly closing on the last day of each calendar month.
                {'\n'}• <Text style={{ fontWeight: '500' }}>3-Day Grace Period:</Text> You have 3 days after month end (due by 3rd of next month at 23:59:59) to pay.
                {'\n'}• <Text style={{ fontWeight: '500' }}>Suspension Protection:</Text> If unpaid past 3 days, account features are temporarily locked until settled via the secured Payment Portal.
              </Text>
            </Surface>

            <View style={styles.feeBreakdownRow}>
              <Surface style={[styles.feeSummaryBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
                <Text style={[styles.feeSummaryLabel, { color: theme.textMuted }]}>Total 5% Paid</Text>
                <Text style={[styles.feeSummaryVal, { color: '#10B981' }]}>
                  LKR {formatLkr(lifetime.totalCommissionPaid)}
                </Text>
              </Surface>

              <Surface style={[styles.feeSummaryBox, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
                <Text style={[styles.feeSummaryLabel, { color: theme.textMuted }]}>Pending 5% Due</Text>
                <Text style={[styles.feeSummaryVal, { color: '#EF4444' }]}>
                  LKR {formatLkr(lifetime.totalCommissionPending)}
                </Text>
              </Surface>
            </View>
          </View>
        )}

        {activeTab === 'boosts' && (
          <View>
            <LinearGradient
              colors={isDark ? ['#831843', '#9D174D'] : ['#F43F5E', '#E11D48']}
              style={styles.boostHeroBanner}
            >
              <View style={styles.boostBannerRow}>
                <View>
                  <Text style={styles.boostBannerSub}>Ad Priority Acceleration</Text>
                  <Text style={styles.boostBannerTitle}>{adBoostStats.boostCount} Boost Campaigns</Text>
                </View>

                <View style={styles.boostStepsBadge}>
                  <MaterialCommunityIcons name="arrow-up-bold-circle" size={16} color="#FFF" />
                  <Text style={styles.boostStepsText}>+{adBoostStats.totalBoostSteps} Steps</Text>
                </View>
              </View>

              <Text style={styles.boostBannerFoot}>
                Total Boost Investment: LKR {formatLkr(adBoostStats.totalSpentOnBoosts)}
              </Text>
            </LinearGradient>

            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>AdBoost Payment History</Text>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                {adBoostStats.recentBoosts.length} Payments
              </Text>
            </View>

            {adBoostStats.recentBoosts.length === 0 ? (
              <Surface style={[styles.emptyCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]} elevation={1}>
                <MaterialCommunityIcons name="rocket-launch-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyText, { color: theme.textPrimary }]}>No AdBoost payments yet.</Text>
                <Text style={[styles.emptySubText, { color: theme.textSecondary }]}>
                  Boost your ads to increase priority and attract more booking requests.
                </Text>
              </Surface>
            ) : (
              adBoostStats.recentBoosts.map((b) => (
                <Surface
                  key={b._id}
                  style={[styles.boostTxCard, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}
                  elevation={1}
                >
                  <View style={styles.boostTxLeft}>
                    <View style={styles.boostTxIconWrap}>
                      <MaterialCommunityIcons name="rocket" size={20} color="#EC4899" />
                    </View>

                    <View>
                      <Text style={[styles.boostTxTitle, { color: theme.textPrimary }]}>
                        Priority Boost +{b.boostAmount}
                      </Text>

                      <Text style={[styles.boostTxDate, { color: theme.textSecondary }]}>
                        {formatDate(b.createdAt)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.boostTxAmount}>- LKR {formatLkr(b.amountPaid)}</Text>
                </Surface>
              ))
            )}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },

  glowOrb1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: '#7C3AED',
  },

  glowOrb2: {
    position: 'absolute',
    top: 200,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#3B82F6',
  },

  refreshRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 14,
    marginBottom: 16,
  },

  screenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 5,
  },

  screenBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7C3AED',
    letterSpacing: 0.8,
  },

  refreshBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },

  suspensionBanner: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  suspensionBannerDark: {
    backgroundColor: '#450A0A',
    borderColor: '#7F1D1D',
  },

  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },

  bannerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },

  bannerSub: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },

  bannerMessage: {
    fontSize: 12.5,
    color: '#991B1B',
    lineHeight: 18,
    marginBottom: 12,
  },

  urgentPayBtn: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 13,
  },

  urgentPayBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13.5,
  },

  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 14,
    elevation: 6,
    shadowColor: '#7C3AED',
    shadowOpacity: 0.4,
    shadowRadius: 18,
  },

  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  heroLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  heroLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },

  periodBadge: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },

  periodBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
  },

  heroAmount: {
    color: '#FFF',
    fontSize: 33,
    fontWeight: '600',
    marginVertical: 10,
  },

  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },

  heroTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },

  heroTagText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },

  heroTagFee: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },

  heroTagFeeText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },

  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  metricCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    alignItems: 'center',
  },

  metricIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  metricLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
  },

  metricValue: {
    fontSize: 13,
    fontWeight: '600',
    marginVertical: 2,
    textAlign: 'center',
  },

  metricSub: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    fontWeight: '500',
  },

  portalCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
  },

  portalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  portalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  gatewayIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  portalTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  portalMonth: {
    fontSize: 11.5,
    marginTop: 1,
  },

  portalDivider: {
    height: 1,
    marginVertical: 12,
  },

  portalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },

  portalLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },

  portalVal: {
    fontSize: 13.5,
    fontWeight: '500',
  },

  portalValHighlight: {
    fontSize: 15,
    fontWeight: '600',
  },

  dueDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 4,
  },

  dueDateText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#B45309',
  },

  payGatewayBtn: {
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
  },

  payGatewayGradient: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },

  payGatewayText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    flex: 1,
    textAlign: 'left',
  },

  gatewaySecuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },

  gatewaySecuredText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },

  statusPillText: {
    fontSize: 11,
    fontWeight: '600',
  },

  statusPaid: {
    backgroundColor: '#DCFCE7',
  },

  statusPaidText: {
    color: '#15803D',
  },

  statusPending: {
    backgroundColor: '#FEF3C7',
  },

  statusPendingText: {
    color: '#B45309',
  },

  statusSuspended: {
    backgroundColor: '#FEE2E2',
  },

  statusSuspendedText: {
    color: '#DC2626',
  },

  paidReceiptBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 10,
  },

  paidReceiptTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
  },

  paidReceiptSub: {
    fontSize: 11,
    color: '#166534',
    marginTop: 1,
  },

  pillContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },

  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },

  pillText: {
    fontWeight: '600',
    fontSize: 12.5,
  },

  chartCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
  },

  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },

  chartTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  chartSub: {
    fontSize: 11,
    marginTop: 1,
  },

  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#7C3AED',
  },

  legendText: {
    fontSize: 11,
    fontWeight: '600',
  },

  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 115,
  },

  barWrap: {
    alignItems: 'center',
    width: (width - 110) / 6,
  },

  barAmountText: {
    fontSize: 9.5,
    marginBottom: 4,
    fontWeight: '500',
  },

  barTrack: {
    height: 75,
    width: 14,
    borderRadius: 10,
    justifyContent: 'flex-end',
  },

  barFill: {
    width: 14,
    borderRadius: 10,
  },

  barLabel: {
    fontSize: 11,
    marginTop: 8,
    fontWeight: '600',
  },

  barLabelActive: {
    fontWeight: '600',
  },

  tabNavRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },

  tabNavBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },

  tabNavBtnActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#7C3AED12',
  },

  tabNavText: {
    fontSize: 12,
    fontWeight: '500',
  },

  tabNavTextActive: {
    fontWeight: '600',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },

  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '600',
  },

  billItemCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },

  billItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  billMonthTitle: {
    fontSize: 15,
    fontWeight: '600',
  },

  billPeriodSub: {
    fontSize: 11.5,
    marginTop: 2,
  },

  statusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },

  statusPillSmallText: {
    fontSize: 10,
    fontWeight: '600',
  },

  billDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },

  billDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  billDetailVal: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },

  smallPayBtn: {
    backgroundColor: '#7C3AED',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 10,
  },

  smallPayBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  infoCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },

  infoCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },

  infoCardTitle: {
    fontSize: 14.5,
    fontWeight: '600',
  },

  infoCardBody: {
    fontSize: 12,
    lineHeight: 19,
  },

  feeBreakdownRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },

  feeSummaryBox: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    alignItems: 'center',
  },

  feeSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  feeSummaryVal: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },

  boostHeroBanner: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },

  boostBannerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  boostBannerSub: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontWeight: '500',
  },

  boostBannerTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    marginTop: 2,
  },

  boostStepsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 4,
  },

  boostStepsText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },

  boostBannerFoot: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 10,
  },

  boostTxCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },

  boostTxLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  boostTxIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EC489918',
    justifyContent: 'center',
    alignItems: 'center',
  },

  boostTxTitle: {
    fontSize: 13.5,
    fontWeight: '500',
  },

  boostTxDate: {
    fontSize: 11,
    marginTop: 2,
  },

  boostTxAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EC4899',
  },

  emptyCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    marginVertical: 10,
    borderWidth: 1,
  },

  emptyText: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 8,
  },

  emptySubText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});