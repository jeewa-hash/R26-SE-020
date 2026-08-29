import React, { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';
import JobsHeader from './components/JobsHeader';
import JobsTabBar from './components/JobsTabBar';
import ActiveJobsSection from './sections/ActiveJobsSection';
import QuotesSection from './sections/QuotesSection';
import ScheduledJobsSection from './sections/ScheduledJobsSection';
import JobHistorySection from './sections/JobHistorySection';
import { activeJobs, historyJobs, quotes, scheduledJobs } from './mock/myJobsMockData';
import { COLORS } from './theme';

export default function MyJobsScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('Active');
  const [refreshing, setRefreshing] = useState(false);

  const counts = useMemo(() => ({
    Active: activeJobs.length,
    Quotes: quotes.length,
    Scheduled: scheduledJobs.length,
    History: historyJobs.length,
  }), []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const renderSection = () => {
    switch (activeTab) {
      case 'Quotes':
        return <QuotesSection quotes={quotes} navigation={navigation} isDarkMode={isDarkMode} />;
      case 'Scheduled':
        return <ScheduledJobsSection bookings={scheduledJobs} navigation={navigation} isDarkMode={isDarkMode} />;
      case 'History':
        return <JobHistorySection history={historyJobs} navigation={navigation} isDarkMode={isDarkMode} />;
      case 'Active':
      default:
        return <ActiveJobsSection jobs={activeJobs} navigation={navigation} isDarkMode={isDarkMode} />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.containerDark]} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={isDarkMode ? COLORS.darkBg : COLORS.primary} />
      <JobsHeader
        isDarkMode={isDarkMode}
        activeCount={counts.Active}
        quotesCount={counts.Quotes}
        scheduledCount={counts.Scheduled}
      />
      <JobsTabBar activeTab={activeTab} onTabChange={setActiveTab} counts={counts} isDarkMode={isDarkMode} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {renderSection()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  containerDark: { backgroundColor: COLORS.darkBg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 110 },
});
