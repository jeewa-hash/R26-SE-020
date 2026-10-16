import { COLORS } from './theme';
import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';
import { getMyAvailability, saveWeeklyAvailability, updateProviderAvailabilityStatus } from './services/providerAvailabilityApi';

const showAlert = (title, message) => {
  if (Platform.OS === 'web') window.alert(`${title}\n\n${message}`);
  else Alert.alert(title, message);
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const initialWeek = () => DAYS.map((day) => ({ day, isAvailable: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].includes(day), slots: [{ startTime: '08:00', endTime: '17:00' }] }));
const timeDate = (value) => { const [hours, minutes] = String(value || '08:00').split(':').map(Number); const date = new Date(); date.setHours(hours || 0, minutes || 0, 0, 0); return date; };
const timeText = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

export default function ProviderAvailabilityScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = { bg: isDark ? COLORS.darkBg : COLORS.bg, card: isDark ? COLORS.darkCard : COLORS.card, text: isDark ? COLORS.darkText : COLORS.text, muted: isDark ? COLORS.darkMuted : COLORS.muted, border: isDark ? COLORS.darkBorder : COLORS.border };
  const [isAvailable, setIsAvailable] = useState(true);
  const [week, setWeek] = useState(initialWeek);
  const [picker, setPicker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getMyAvailability();
      setIsAvailable(data?.isAvailable !== false && data?.isActive !== false);
      if (Array.isArray(data?.weeklyAvailability) && data.weeklyAvailability.length) {
        setWeek(DAYS.map((day) => data.weeklyAvailability.find((item) => item.day === day) || { day, isAvailable: false, slots: [{ startTime: '08:00', endTime: '17:00' }] }));
      } else if (data) {
        setWeek(DAYS.map((day) => ({ day, isAvailable: (data.availableDays || []).includes(day), slots: [{ startTime: data.workingHours?.start || '08:00', endTime: data.workingHours?.end || '17:00' }] })));
      }
    } catch (error) {
      if (error?.status !== 404) showAlert('Unable to load', error?.message || 'Availability could not be loaded.');
    } finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const updateDay = (day, transform) => setWeek((current) => current.map((item) => item.day === day ? transform(item) : item));
  const selectTime = (day, field) => setPicker({ day, field, value: timeDate(week.find((item) => item.day === day)?.slots?.[0]?.[field]) });

  const renderTime = (item, slot, field, label) => Platform.OS === 'web' ? (
    <View style={[styles.timeButton, { borderColor: C.border }]}>
      <Text style={[styles.timeLabel, { color: C.muted }]}>{label}</Text>
      {React.createElement('input', {
        type: 'time',
        'aria-label': `${item.day} ${label.toLowerCase()} time`,
        value: slot[field],
        required: true,
        onChange: (event) => {
          const value = event.target.value;
          updateDay(item.day, (current) => ({ ...current, slots: [{ ...(current.slots?.[0] || slot), [field]: value }] }));
        },
        style: { width: '100%', boxSizing: 'border-box', marginTop: 4, border: 0, backgroundColor: C.card, color: C.text, colorScheme: isDark ? 'dark' : 'light', fontSize: 14 },
      })}
    </View>
  ) : (
    <TouchableOpacity style={[styles.timeButton, { borderColor: C.border }]} onPress={() => selectTime(item.day, field)}>
      <Text style={[styles.timeLabel, { color: C.muted }]}>{label}</Text>
      <Text style={[styles.timeValue, { color: C.text }]}>{slot[field]}</Text>
    </TouchableOpacity>
  );

  const save = async () => {
    for (const day of week.filter((item) => item.isAvailable)) {
      const slot = day.slots?.[0];
      if (!slot || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startTime) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endTime) || timeDate(slot.endTime) <= timeDate(slot.startTime)) return showAlert('Invalid hours', `${day}'s end time must be after its start time.`);
    }
    try {
      setSaving(true);
      const enabled = week.filter((item) => item.isAvailable);
      await saveWeeklyAvailability({
        isAvailable,
        isActive: isAvailable,
        weeklyAvailability: week,
        availableDays: enabled.map((item) => item.day),
        workingHours: { start: '00:00', end: '23:59' },
        unavailableSlots: [],
        maxBookingsPerDay: 3,
      });
      showAlert('Saved', 'Your weekly availability has been updated.');
    } catch (error) { showAlert('Unable to save', error?.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const toggleGlobal = async (next) => {
    setIsAvailable(next);
    try { await updateProviderAvailabilityStatus(next); }
    catch (error) { setIsAvailable(!next); showAlert('Unable to update', error?.message || 'Please try again.'); }
  };

  return <View style={[styles.container, { backgroundColor: C.bg }]}>
    <ProviderPageHeader navigation={navigation} title="Manage Availability" subtitle="Set your working days and service hours." />
    <ScrollView contentContainerStyle={styles.content}>
      <View style={[styles.globalCard, { backgroundColor: C.card, borderColor: C.border }]}><View style={styles.flex}><Text style={[styles.title, { color: C.text }]}>Accepting new jobs</Text><Text style={[styles.body, { color: C.muted }]}>This global setting is checked before weekly hours.</Text></View><Switch value={isAvailable} onValueChange={toggleGlobal} trackColor={{ false: '#CBD5E1', true: '#86C99A' }} thumbColor={isAvailable ? '#15803D' : '#F5FAF6'} /></View>
      <Text style={[styles.heading, { color: C.text }]}>Weekly availability</Text>
      {loading ? <ActivityIndicator color="#15803D" style={styles.loader} /> : week.map((item) => {
        const slot = item.slots?.[0] || { startTime: '08:00', endTime: '17:00' };
        return <View key={item.day} style={[styles.dayCard, { backgroundColor: C.card, borderColor: C.border }]}>
          <View style={styles.dayHeader}><Text style={[styles.day, { color: C.text }]}>{item.day}</Text><Switch value={item.isAvailable} onValueChange={(value) => updateDay(item.day, (current) => ({ ...current, isAvailable: value }))} trackColor={{ false: '#CBD5E1', true: '#86C99A' }} thumbColor={item.isAvailable ? '#15803D' : '#F5FAF6'} /></View>
          <Text style={[styles.stateText, { color: item.isAvailable ? '#18794E' : C.muted }]}>{item.isAvailable ? 'Enabled' : 'Disabled'}</Text>
          {item.isAvailable ? <View style={styles.timeRow}>{renderTime(item, slot, 'startTime', 'Start')}<Text style={{ color: C.muted }}>–</Text>{renderTime(item, slot, 'endTime', 'End')}</View> : null}
        </View>;
      })}
      <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving || loading}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>Save Availability</Text>}</TouchableOpacity>
    </ScrollView>
    {Platform.OS !== 'web' && picker ? <DateTimePicker value={picker.value} mode="time" onChange={(event, date) => { if (date) updateDay(picker.day, (item) => ({ ...item, slots: [{ ...(item.slots?.[0] || {}), [picker.field]: timeText(date) }] })); setPicker(null); }} /> : null}
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1 }, content: { padding: 16, paddingBottom: 50 }, flex: { flex: 1 }, globalCard: { borderRadius: 18, padding: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }, title: { fontSize: 17, fontWeight: '600' }, body: { fontSize: 12, fontWeight: '400', lineHeight: 18, marginTop: 4 }, heading: { fontSize: 18, fontWeight: '600', marginTop: 22, marginBottom: 10 }, loader: { margin: 30 }, dayCard: { borderRadius: 16, borderWidth: 1, padding: 15, marginBottom: 10 }, dayHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, day: { fontSize: 15, fontWeight: '600' }, stateText: { fontSize: 12, fontWeight: '500', marginTop: -5 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 }, timeButton: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10 }, timeLabel: { fontSize: 10, fontWeight: '500' }, timeValue: { fontSize: 14, fontWeight: '500', marginTop: 2 }, saveButton: { height: 48, borderRadius: 13, backgroundColor: '#15803D', alignItems: 'center', justifyContent: 'center', marginTop: 10 }, saveText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
});
