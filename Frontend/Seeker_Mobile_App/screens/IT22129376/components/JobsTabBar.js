import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../theme';

const tabs = ['Active', 'Quotes', 'Scheduled', 'History'];

export default function JobsTabBar({ activeTab, onTabChange, counts = {}, isDarkMode }) {
  return (
    <View style={[styles.wrapper, isDarkMode && styles.wrapperDark]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.content}>
        {tabs.map((tab) => {
          const active = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.tabActive, isDarkMode && styles.tabDark]}
              onPress={() => onTabChange(tab)}
              activeOpacity={0.85}
            >
              <Text style={[styles.tabText, isDarkMode && styles.tabTextDark, active && styles.tabTextActive]}>
                {tab}
              </Text>
              <View style={[styles.countPill, active && styles.countPillActive]}>
                <Text style={[styles.countText, active && styles.countTextActive]}>{counts[tab] || 0}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.bg,
    paddingVertical: 14,
  },
  wrapperDark: {
    backgroundColor: COLORS.darkBg,
  },
  content: {
    paddingHorizontal: 16,
    gap: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  tabDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
  },
  tabActive: {
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabTextDark: {
    color: COLORS.darkMuted,
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  countPill: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  countPillActive: {
    backgroundColor: COLORS.primary,
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  countTextActive: {
    color: '#fff',
  },
});
