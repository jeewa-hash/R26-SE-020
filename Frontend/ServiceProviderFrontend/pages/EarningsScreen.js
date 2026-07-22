import React, { useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions, LinearGradient } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const BAR_DATA = [
  { label: 'Dec', pct: 0.38 }, { label: 'Jan', pct: 0.52 }, { label: 'Feb', pct: 0.45 },
  { label: 'Mar', pct: 0.68 }, { label: 'Apr', pct: 0.60 }, { label: 'May', pct: 1.00, active: true },
];

const STATS = [
  { label: 'Jobs Done', value: '18', sub: '+3 this month', icon: 'check-circle-outline', color: '#10B981' },
  { label: 'Avg/Job', value: 'LKR 2.5k', sub: '↗ +8%', icon: 'trending-up', color: '#6366F1' },
];

export default function EarningsScreen() {
  const [period, setPeriod] = useState('Month');

  return (
    <View style={styles.root}>
      {/* ── Background Decoration ── */}
      <View style={styles.topCircle} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerSub}>Overview</Text>
            <Text style={styles.headerTitle}>Earnings</Text>
          </View>
          <TouchableOpacity style={styles.settingsBtn}>
            <MaterialIcons name="download" size={22} color="#1F2937" />
          </TouchableOpacity>
        </View>

        {/* ── Main Earnings Card ── */}
        <Surface style={styles.heroCard} elevation={4}>
          <Text style={styles.heroLabel}>AVAILABLE BALANCE</Text>
          <Text style={styles.heroAmount}>LKR 45,200.00</Text>
          <View style={styles.heroFooter}>
            <View style={styles.growthBadge}>
              <MaterialIcons name="trending-up" size={14} color="#FFF" />
              <Text style={styles.growthText}>12.4%</Text>
            </View>
            <Text style={styles.growthSub}>Higher than April</Text>
          </View>
        </Surface>

        {/* ── Time Switcher ── */}
        <View style={styles.pillContainer}>
          {['Week', 'Month', 'Year'].map((p) => (
            <TouchableOpacity 
              key={p} 
              onPress={() => setPeriod(p)}
              style={[styles.pill, period === p && styles.pillActive]}
            >
              <Text style={[styles.pillText, period === p && styles.pillTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Visual Insights (Chart) ── */}
        <Surface style={styles.chartCard} elevation={1}>
          <Text style={styles.chartTitle}>Performance History</Text>
          <View style={styles.barsContainer}>
            {BAR_DATA.map((bar) => (
              <View key={bar.label} style={styles.barWrap}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { 
                    height: `${bar.pct * 100}%`, 
                    backgroundColor: bar.active ? '#7C3AED' : '#DDD6FE' 
                  }]} />
                </View>
                <Text style={[styles.barLabel, bar.active && styles.barLabelActive]}>{bar.label}</Text>
              </View>
            ))}
          </View>
        </Surface>

        {/* ── Stats Grid ── */}
        <View style={styles.statsRow}>
          {STATS.map((stat) => (
            <Surface key={stat.label} style={styles.miniStatCard} elevation={1}>
              <View style={[styles.statIconCircle, { backgroundColor: `${stat.color}15` }]}>
                <MaterialCommunityIcons name={stat.icon} size={20} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabelText}>{stat.label}</Text>
            </Surface>
          ))}
        </View>

        {/* ── Recent Activity ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <TouchableOpacity><Text style={styles.viewAll}>History</Text></TouchableOpacity>
        </View>

        <Surface style={styles.transactionCard} elevation={1}>
          {[
            { name: 'Pipe Repair', user: 'Kumara P.', amount: '+2,500', type: 'job' },
            { name: 'Platform Fee', user: 'Auto-deduct', amount: '-780', type: 'fee' }
          ].map((tx, i) => (
            <View key={i} style={[styles.txRow, i === 0 && styles.txBorder]}>
              <View style={[styles.txDot, { backgroundColor: tx.type === 'job' ? '#10B981' : '#EF4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.txName}>{tx.name}</Text>
                <Text style={styles.txUser}>{tx.user}</Text>
              </View>
              <Text style={[styles.txAmount, { color: tx.type === 'job' ? '#10B981' : '#1F2937' }]}>{tx.amount}</Text>
            </View>
          ))}
        </Surface>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { paddingHorizontal: 20 },
  topCircle: {
    position: 'absolute', top: -100, right: -50, width: 250, height: 250,
    borderRadius: 125, backgroundColor: '#7C3AED', opacity: 0.05,
  },
  // Header
  header: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 60, marginBottom: 25 
  },
  headerSub: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#1E293B' },
  settingsBtn: { 
    width: 45, height: 45, borderRadius: 15, backgroundColor: '#FFF',
    justifyContent: 'center', alignItems: 'center', elevation: 2 
  },
  // Hero Card
  heroCard: {
    backgroundColor: '#7C3AED', padding: 25, borderRadius: 24,
    shadowColor: '#7C3AED', shadowOpacity: 0.3, shadowRadius: 15,
  },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  heroAmount: { color: '#FFF', fontSize: 32, fontWeight: '800', marginVertical: 10 },
  heroFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  growthBadge: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, marginRight: 10 
  },
  growthText: { color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  growthSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  // Pills
  pillContainer: { flexDirection: 'row', gap: 10, marginVertical: 25 },
  pill: { flex: 1, paddingVertical: 12, borderRadius: 16, backgroundColor: '#FFF', alignItems: 'center', elevation: 1 },
  pillActive: { backgroundColor: '#1E293B' },
  pillText: { fontWeight: '700', color: '#64748B' },
  pillTextActive: { color: '#FFF' },
  // Chart
  chartCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 20, marginBottom: 20 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 20 },
  barsContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 100 },
  barWrap: { alignItems: 'center', width: (width - 120) / 6 },
  barTrack: { height: 80, width: 12, backgroundColor: '#F1F5F9', borderRadius: 10, justifyContent: 'flex-end' },
  barFill: { width: 12, borderRadius: 10 },
  barLabel: { fontSize: 10, color: '#94A3B8', marginTop: 8, fontWeight: '600' },
  barLabelActive: { color: '#7C3AED' },
  // Stats
  statsRow: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  miniStatCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, padding: 16, alignItems: 'center' },
  statIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  statLabelText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  // Activity
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  viewAll: { color: '#7C3AED', fontWeight: '700' },
  transactionCard: { backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 20 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18 },
  txBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  txDot: { width: 8, height: 8, borderRadius: 4, marginRight: 15 },
  txName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  txUser: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  txAmount: { fontSize: 15, fontWeight: '800' },
});