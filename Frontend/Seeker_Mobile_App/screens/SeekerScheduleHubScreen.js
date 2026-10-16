import React, { useContext, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { LanguageContext } from '../context/LanguageContext';
import { COLORS } from './IT22129376/theme';
import SeekerCalendarScreen from './SeekerCalendarScreen';
import SeekerServiceSessionsScreen from './IT22129376/SeekerServiceSessionsScreen';

export default function SeekerScheduleHubScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const { language } = useContext(LanguageContext) || {};
  const isSi = language === 'si';
  const [tab, setTab] = useState(route.name === 'SeekerServiceSessions' ? 'Sessions' : 'Calendar');
  const C = { bg: isDarkMode ? COLORS.darkBg : COLORS.bg, card: isDarkMode ? COLORS.darkCard : COLORS.card, text: isDarkMode ? COLORS.darkText : COLORS.text, muted: isDarkMode ? COLORS.darkMuted : COLORS.muted, border: isDarkMode ? COLORS.darkBorder : COLORS.border };
  return <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: C.bg }]}>
    <View style={styles.header}>
      <TouchableOpacity accessibilityLabel="Back to profile" style={styles.back} onPress={() => navigation.navigate('ProfileScreen')}><Ionicons name="arrow-back" size={24} color={C.text} /></TouchableOpacity>
      <Text style={[styles.title, { color: C.text }]}>{isSi ? 'දින දර්ශනය සහ සැසි' : 'Calendar & Sessions'}</Text>
    </View>
    <View style={[styles.tabs, { backgroundColor: C.card, borderColor: C.border }]}>
      {['Sessions', 'Calendar'].map(value => <TouchableOpacity key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }} onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.active]}><Ionicons name={value === 'Calendar' ? 'calendar-outline' : 'layers-outline'} size={19} color={tab === value ? '#fff' : C.muted} /><Text style={{ color: tab === value ? '#fff' : C.text, fontWeight: '600' }}>{isSi ? value === 'Sessions' ? 'සැසි' : 'දින දර්ශනය' : value}</Text></TouchableOpacity>)}
    </View>
    <View style={styles.container}>{tab === 'Sessions' ? <SeekerServiceSessionsScreen navigation={navigation} embedded /> : <SeekerCalendarScreen navigation={navigation} embedded />}</View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ container: { flex: 1, minHeight: 0 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 }, back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, fontSize: 22, fontWeight: '700' }, tabs: { flexDirection: 'row', padding: 5, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderRadius: 16 }, tab: { flex: 1, minHeight: 44, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }, active: { backgroundColor: COLORS.primary } });
