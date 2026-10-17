import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, Platform, Alert, StyleSheet } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { buildAuthHeaders } from '../services/seekerAuthStorage';
import { CONFIG } from '../../../config';
import { COLORS } from '../theme';
import { useTheme } from '../../../hooks/useTheme';

export default function RequestedTimeModal({ request, onClose, onSaved }) {
  const { isDarkMode } = useTheme();
  const [date, setDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [mode, setMode] = useState(null);
  const [saving, setSaving] = useState(false);
  const notify = (message) => Platform.OS === 'web' ? window.alert(message) : Alert.alert('Requested time', message);
  const save = async () => {
    if (!Number.isFinite(date.getTime()) || date <= new Date()) return notify('Choose a future start date and time.');
    setSaving(true);
    try {
      const response = await fetch(`${CONFIG.SEEKER_SERVICE_URL}/request-quotations/${request._id || request.id}/preferred-time`, {
        method: 'PATCH', headers: await buildAuthHeaders(), body: JSON.stringify({ preferredStartTime: date.toISOString() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Unable to change the time.');
      onSaved(); onClose();
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const localDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}T${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
  return <Modal visible transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.overlay}><View style={[styles.card, { backgroundColor: isDarkMode ? COLORS.darkCard : COLORS.card }]}>
      <Text style={{ fontSize: 19, fontWeight: '600', color: isDarkMode ? COLORS.darkText : COLORS.text }}>Choose a new start time</Text>
      <Text style={{ color: isDarkMode ? COLORS.darkMuted : COLORS.muted }}>{request.rescheduleReason || 'Set the date and time for this request.'}</Text>
      {Platform.OS === 'web' ? React.createElement('input', { type: 'datetime-local', 'aria-label': 'Requested start date and time', value: localDate, onChange: event => { const value = new Date(event.target.value); if (Number.isFinite(value.getTime())) setDate(value); }, style: { padding: 12, fontSize: 16, colorScheme: isDarkMode ? 'dark' : 'light' } }) : <><TouchableOpacity onPress={() => setMode('date')}><Text style={[styles.link, { color: isDarkMode ? '#A5B4FC' : COLORS.primary }]}>{date.toLocaleDateString()}</Text></TouchableOpacity><TouchableOpacity onPress={() => setMode('time')}><Text style={[styles.link, { color: isDarkMode ? '#A5B4FC' : COLORS.primary }]}>{date.toLocaleTimeString()}</Text></TouchableOpacity></>}
      {Platform.OS !== 'web' && mode ? <DateTimePicker value={date} mode={mode} minimumDate={new Date()} onChange={(event, value) => { setMode(null); if (value) setDate(value); }} /> : null}
      <TouchableOpacity style={styles.button} onPress={save} disabled={saving}><Text style={{ color: '#fff' }}>{saving ? 'Saving…' : 'Send New Time'}</Text></TouchableOpacity>
      <TouchableOpacity onPress={onClose} disabled={saving}><Text style={[styles.link, { color: isDarkMode ? '#A5B4FC' : COLORS.primary }]}>Cancel</Text></TouchableOpacity>
    </View></View>
  </Modal>;
}
const styles = StyleSheet.create({ overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }, card: { padding: 22, borderRadius: 18, gap: 16, width: '100%', maxWidth: 500, alignSelf: 'center' }, button: { backgroundColor: '#667eea', padding: 14, alignItems: 'center', borderRadius: 12 }, link: { minHeight: 44, textAlignVertical: 'center', paddingVertical: 12 } });
