import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default function JobsHeader({ isDarkMode, activeCount = 0, quotesCount = 0, scheduledCount = 0 }) {
  return (
    <LinearGradient
      colors={isDarkMode ? ['#1a1a2e', '#16213e'] : [COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.header}
    >
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.title}>My Jobs</Text>
          <Text style={styles.subtitle}>Track requests, quotes, schedules and completed services</Text>
        </View>
        <View style={styles.iconCircle}>
          <MaterialIcons name="work" size={28} color="#fff" />
        </View>
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{activeCount}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{quotesCount}</Text>
          <Text style={styles.summaryLabel}>Quotes</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{scheduledCount}</Text>
          <Text style={styles.summaryLabel}>Scheduled</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    maxWidth: 270,
    lineHeight: 18,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    marginTop: 20,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 18,
    padding: 12,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
    marginTop: 2,
  },
});
