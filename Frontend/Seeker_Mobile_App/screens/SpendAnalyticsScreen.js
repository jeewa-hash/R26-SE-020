import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import BottomNav from '../components/BottomNav';

const { width } = Dimensions.get('window');

export default function SpendAnalyticsScreen({ navigation }) {
  const weeklySpend = [
    { day: "Mon", amount: 45 },
    { day: "Tue", amount: 120 },
    { day: "Wed", amount: 30 },
    { day: "Thu", amount: 85 },
    { day: "Fri", amount: 200 },
    { day: "Sat", amount: 150 },
    { day: "Sun", amount: 60 },
  ];

  const maxAmount = Math.max(...weeklySpend.map(item => item.amount));
  const totalSpend = weeklySpend.reduce((sum, item) => sum + item.amount, 0);

  const categories = [
    { name: "Repairing", amount: 350, color: "#FF6B6B", percentage: 35 },
    { name: "Cleaning", amount: 280, color: "#4ECDC4", percentage: 28 },
    { name: "Gardening", amount: 180, color: "#45B7D1", percentage: 18 },
    { name: "Personal Care", amount: 190, color: "#96CEB4", percentage: 19 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Spend Analytics</Text>
        <View style={{ width: 40 }} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Total Spend Card */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.totalCard}
        >
          <Text style={styles.totalLabel}>Total Spent This Week</Text>
          <Text style={styles.totalAmount}>${totalSpend}</Text>
          <Text style={styles.totalSubtext}>+12% from last week</Text>
        </LinearGradient>

        {/* Weekly Chart */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Weekly Overview</Text>
          <View style={styles.chartBars}>
            {weeklySpend.map((item, index) => (
              <View key={index} style={styles.chartBarItem}>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: (item.amount / maxAmount) * 120,
                        backgroundColor: item.amount === maxAmount ? '#667eea' : '#E0E7FF'
                      }
                    ]} 
                  />
                  <Text style={styles.barAmount}>${item.amount}</Text>
                </View>
                <Text style={styles.barDay}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Category Breakdown */}
        <View style={styles.categoryCard}>
          <Text style={styles.chartTitle}>Spending by Category</Text>
          {categories.map((category, index) => (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryAmount}>${category.amount}</Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${category.percentage}%`, backgroundColor: category.color }]} />
              </View>
              <Text style={styles.categoryPercentage}>{category.percentage}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      <BottomNav />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ffffff20', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#fff' },
  content: { padding: 16, paddingBottom: 80 },
  totalCard: { borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16 },
  totalLabel: { fontSize: 14, color: '#ffffffcc', marginBottom: 8 },
  totalAmount: { fontSize: 48, fontWeight: '700', color: '#fff', marginBottom: 8 },
  totalSubtext: { fontSize: 12, color: '#ffffffcc' },
  chartCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16 },
  chartTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 20 },
  chartBars: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  chartBarItem: { alignItems: 'center', flex: 1 },
  barWrapper: { alignItems: 'center', marginBottom: 8 },
  bar: { width: 30, borderRadius: 8, marginBottom: 6 },
  barAmount: { fontSize: 10, color: '#6B7280', fontWeight: '500' },
  barDay: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  categoryCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  categoryItem: { marginBottom: 16 },
  categoryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  categoryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  categoryName: { flex: 1, fontSize: 14, color: '#1F2937' },
  categoryAmount: { fontSize: 14, fontWeight: '600', color: '#667eea' },
  progressBarContainer: { height: 6, backgroundColor: '#F3F4F6', borderRadius: 3, overflow: 'hidden', marginBottom: 4 },
  progressBar: { height: '100%', borderRadius: 3 },
  categoryPercentage: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
});