import PageHeader from '../components/PageHeader';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { getStoredSeekerAuth } from './IT22129376/services/seekerAuthStorage';
import { getSeekerBookings } from './IT22129376/services/myJobsApi';
import { getBookingStartDate, getHumanProviderName, getHumanServiceTitle } from '../services/liveBookingApi';
import { COLORS } from './IT22129376/theme';

const keyOf = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dayOf = date => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const plusDays = (date, count) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
const weekOf = date => plusDays(dayOf(date), -((date.getDay() + 6) % 7));
const VIEWS = ['Month', 'Week', 'Agenda'];
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SeekerCalendarScreen({ navigation, embedded = false }) {
  const { isDarkMode } = useTheme();
  const [view, setView] = useState('Month');
  const [dayOnly, setDayOnly] = useState(false);
  const [date, setDate] = useState(dayOf(new Date()));
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const C = { bg: isDarkMode ? COLORS.darkBg : COLORS.bg, card: isDarkMode ? COLORS.darkCard : COLORS.card, text: isDarkMode ? COLORS.darkText : COLORS.text, muted: isDarkMode ? COLORS.darkMuted : COLORS.muted, border: isDarkMode ? COLORS.darkBorder : COLORS.border, accent: isDarkMode ? '#A5B4FC' : '#4F46E5' };
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const auth = await getStoredSeekerAuth();
      if (!auth.seekerId) throw new Error('Please sign in to view your calendar.');
      const result = await getSeekerBookings(auth.seekerId);
      if (!result.usedUrl) throw new Error('Your calendar could not be loaded. Please try again.');
      setBookings((result.bookings || []).filter(item => getBookingStartDate(item)));
    } catch (err) { setError(err.message); setBookings([]); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const events = useMemo(() => bookings.map(booking => ({ booking, start: getBookingStartDate(booking) })).sort((a, b) => a.start - b.start), [bookings]);
  const byDay = useMemo(() => { const grouped = {}; events.forEach(event => { const key = keyOf(event.start); (grouped[key] ||= []).push(event); }); return grouped; }, [events]);
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const gridStart = weekOf(startOfMonth);
  const gridSize = Math.ceil((((startOfMonth.getDay() + 6) % 7) + new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()) / 7) * 7;
  const days = Array.from({ length: view === 'Week' ? 7 : gridSize }, (_, index) => plusDays(view === 'Week' ? weekOf(date) : gridStart, index));
  const visibleEvents = view === 'Month' && dayOnly ? byDay[keyOf(date)] || [] : events.filter(({ start }) => view === 'Week' ? start >= weekOf(date) && start < plusDays(weekOf(date), 7) : start.getFullYear() === date.getFullYear() && start.getMonth() === date.getMonth());
  const move = direction => { setDayOnly(false); setDate(current => view === 'Week' ? plusDays(current, direction * 7) : new Date(current.getFullYear(), current.getMonth() + direction, 1)); };
  const openBooking = booking => navigation.navigate('SeekerServiceSessionDetails', { sessionId: booking.externalSessionId || booking.sessionId || `booking:${booking._id || booking.id}`, session: { sessionId: booking.externalSessionId || booking.sessionId, title: getHumanServiceTitle(booking), booking, bookings: [booking] } });
  return <SafeAreaView edges={embedded ? [] : ['top']} style={[styles.container, { backgroundColor: C.bg }]}>
    <PageHeader title="Calendar" showBack={!embedded} renderActions={({ textColor }) => <TouchableOpacity onPress={() => { setDate(dayOf(new Date())); setDayOnly(false); }} style={[styles.today, { borderColor: C.border }]}><Text style={{ color: C.accent }}>Today</Text></TouchableOpacity>} />
    <View style={[styles.tabs, { backgroundColor: C.card, borderColor: C.border }]}>{VIEWS.map(item => <TouchableOpacity key={item} accessibilityRole="tab" accessibilityState={{ selected: item === view }} style={[styles.tab, item === view && { backgroundColor: COLORS.primary }]} onPress={() => { setView(item); setDayOnly(false); }}><Text style={{ color: item === view ? '#fff' : C.muted, fontWeight: '600' }}>{item}</Text></TouchableOpacity>)}</View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />}>
      <View style={styles.period}><TouchableOpacity accessibilityLabel="Previous period" onPress={() => move(-1)} style={styles.iconButton}><Ionicons name="chevron-back" size={22} color={C.text} /></TouchableOpacity><Text style={[styles.periodTitle, { color: C.text }]}>{date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Text><TouchableOpacity accessibilityLabel="Next period" onPress={() => move(1)} style={styles.iconButton}><Ionicons name="chevron-forward" size={22} color={C.text} /></TouchableOpacity></View>
      {view !== 'Agenda' ? <View style={[styles.calendar, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.grid}>{WEEKDAYS.map(day => <Text key={day} style={[styles.weekday, { color: C.muted }]}>{day}</Text>)}</View>
        <View style={styles.grid}>{days.map(day => { const selected = keyOf(day) === keyOf(date); const count = (byDay[keyOf(day)] || []).length; return <TouchableOpacity key={keyOf(day)} accessibilityLabel={`${day.toDateString()}, ${count} bookings`} accessibilityState={{ selected }} onPress={() => { setDate(day); setDayOnly(view === 'Month'); }} style={[styles.day, selected && { backgroundColor: COLORS.primary }]}><Text style={{ color: selected ? '#fff' : C.text, opacity: view === 'Month' && day.getMonth() !== date.getMonth() ? 0.4 : 1, fontWeight: keyOf(day) === keyOf(new Date()) ? '800' : '500' }}>{day.getDate()}</Text>{count ? <Text style={[styles.dayCount, { color: selected ? '#fff' : C.accent }]}>{count} {count === 1 ? 'job' : 'jobs'}</Text> : <View style={{ height: 14 }} />}</TouchableOpacity>; })}</View>
      </View> : null}
      {view === 'Month' ? <View style={styles.scopeRow}><Text style={{ color: C.muted, flex: 1 }}>Confirmed bookings and all booking history</Text><TouchableOpacity accessibilityRole="button" onPress={() => setDayOnly(value => !value)} style={[styles.today, { borderColor: C.border }]}><Text style={{ color: C.accent }}>{dayOnly ? 'Show All Month' : 'Selected Day'}</Text></TouchableOpacity></View> : null}
      <Text style={[styles.sectionTitle, { color: C.text }]}>{view === 'Month' && dayOnly ? date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : view === 'Week' ? `Week of ${weekOf(date).toLocaleDateString()}` : view === 'Month' ? 'All bookings this month' : 'This month’s agenda'}</Text>
      {error ? <View style={[styles.empty, { backgroundColor: C.card }]}><Text style={{ color: C.muted }}>{error}</Text><TouchableOpacity onPress={load} style={styles.today}><Text style={{ color: C.accent }}>Retry</Text></TouchableOpacity></View> : loading ? <ActivityIndicator color={C.accent} /> : visibleEvents.length ? visibleEvents.map(({ booking, start }, index) => <TouchableOpacity key={booking._id || booking.id || index} onPress={() => openBooking(booking)} style={[styles.event, { backgroundColor: C.card, borderColor: C.border }]}>
        <View style={styles.flex}><Text style={[styles.eventTitle, { color: C.text }]}>{getHumanServiceTitle(booking)}</Text><Text style={[styles.meta, { color: C.muted }]}>{start.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text><Text style={[styles.meta, { color: C.muted }]}>{getHumanProviderName(booking)}</Text><Text style={[styles.status, { color: C.accent }]}>{String(booking.bookingStatus || booking.status || 'CONFIRMED').replace(/_/g, ' ')}</Text></View><Ionicons name="chevron-forward" size={20} color={C.muted} />
      </TouchableOpacity>) : <View style={[styles.empty, { backgroundColor: C.card }]}><Ionicons name="calendar-outline" size={30} color={C.accent} /><Text style={{ color: C.muted }}>No booked services for this period.</Text></View>}
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({ scopeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginTop: 16 }, container: { flex: 1 }, flex: { flex: 1, minWidth: 0 }, header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 }, title: { fontSize: 25, fontWeight: '700' }, iconButton: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }, today: { padding: 10, borderWidth: 1, borderRadius: 12 }, tabs: { flexDirection: 'row', marginHorizontal: 16, padding: 5, borderRadius: 16, borderWidth: 1 }, tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 }, content: { padding: 16, paddingBottom: 32 }, period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }, periodTitle: { fontSize: 18, fontWeight: '600', flexShrink: 1, textAlign: 'center' }, calendar: { borderWidth: 1, borderRadius: 18, padding: 7 }, grid: { flexDirection: 'row', flexWrap: 'wrap' }, weekday: { width: '14.285714%', textAlign: 'center', fontSize: 11, paddingVertical: 10 }, day: { width: '14.285714%', minHeight: 58, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, dayCount: { fontSize: 9, marginTop: 3 }, sectionTitle: { fontSize: 17, fontWeight: '600', marginTop: 24, marginBottom: 12 }, event: { padding: 16, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }, eventTitle: { fontSize: 15, fontWeight: '600' }, meta: { fontSize: 12, marginTop: 6 }, status: { fontSize: 11, fontWeight: '600', marginTop: 10 }, empty: { padding: 28, borderRadius: 16, alignItems: 'center', gap: 12 } });
