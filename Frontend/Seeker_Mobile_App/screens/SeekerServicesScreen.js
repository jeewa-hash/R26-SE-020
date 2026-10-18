import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import PageHeader from '../components/PageHeader';
import SeekerServiceSessionsScreen from './IT22129376/SeekerServiceSessionsScreen';
import { useTheme } from '../hooks/useTheme';
import { useNotification } from '../context/NotificationContext';
import { LanguageContext } from '../context/LanguageContext';

const shortcuts = [
  ['MyPostsScreen', 'My Posts', 'මගේ පළ කිරීම්', 'newspaper-outline'],
  ['SeekerCalendar', 'Calendar', 'දින දර්ශනය', 'calendar-outline'],
  ['FeedScreen', 'Community', 'පළ කිරීම්', 'people-outline'],
];

export default function SeekerServicesScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const { language } = useContext(LanguageContext) || {};
  const isSi = language === 'si';
  const { unreadCount = 0 } = useNotification() || {};
  const text = { color: isDarkMode ? '#E2E8F0' : '#334155' };
  return <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: isDarkMode ? '#1a1a2e' : '#F8F9FA' }]}>
    <PageHeader title={isSi ? 'මගේ සේවා' : 'My Services'} subtitle={isSi ? 'ඉල්ලීම්, මිල ගණන් සහ සේවා තත්ත්වය' : 'Your requests, quotations and service progress'} showBack={false} renderActions={({ textColor }) => <>
      <TouchableOpacity style={styles.headerButton} accessibilityRole="button" accessibilityLabel="Messages" onPress={() => navigation.navigate('ChatListScreen')}><Ionicons name="chatbubble-ellipses-outline" size={23} color={textColor} /></TouchableOpacity>
      <TouchableOpacity style={styles.headerButton} accessibilityRole="button" accessibilityLabel={`Notifications, ${unreadCount} unread`} onPress={() => navigation.navigate('NotificationScreen')}>
        <Ionicons name="notifications-outline" size={23} color={textColor} />
        {unreadCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text></View>}
      </TouchableOpacity>
    </>} />
    <View style={styles.shortcuts}>
        {shortcuts.map(([route, label, labelSi, icon]) => <TouchableOpacity key={route} style={[styles.shortcut, { backgroundColor: isDarkMode ? '#252642' : '#FFFFFF', borderColor: isDarkMode ? '#34304E' : '#E2E8F0' }]} accessibilityRole="button" accessibilityLabel={isSi ? labelSi : label} onPress={() => navigation.navigate(route)}>
          <Ionicons name={icon} size={18} color={isDarkMode ? '#A5B4FC' : '#4F46E5'} /><Text style={[styles.shortcutText, text]}>{isSi ? labelSi : label}</Text>
        </TouchableOpacity>)}
    </View>
    <SeekerServiceSessionsScreen navigation={navigation} embedded />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  root: { flex: 1 },
  headerButton: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  shortcuts: { flexDirection: 'row', alignItems: 'stretch', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4, gap: 8 },
  shortcut: { flex: 1, minWidth: 0, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 4, paddingVertical: 10, minHeight: 64, borderWidth: 1, borderRadius: 13 },
  shortcutText: { fontSize: 12, fontWeight: '600', textAlign: 'center', flexShrink: 1 },
  badge: { position: 'absolute', top: 0, right: 0, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, backgroundColor: '#DC2626', alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});
