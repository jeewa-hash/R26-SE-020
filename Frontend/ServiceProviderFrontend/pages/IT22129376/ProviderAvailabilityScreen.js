import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { createAvailabilitySlot, deleteAvailabilitySlot, getMyAvailability, updateAvailabilitySlot, updateProviderAvailabilityStatus } from './services/providerAvailabilityApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';

const emptyForm = { date: '', startTime: '', endTime: '', notes: '' };

export default function ProviderAvailabilityScreen({ navigation }) {
  const { isDark } = useContext(ThemeContext) || { isDark: false };
  const C = { bg: isDark ? '#0F172A' : '#F8FAFC', card: isDark ? '#1E293B' : '#FFFFFF', text: isDark ? '#F8FAFC' : '#1E293B', muted: isDark ? '#94A3B8' : '#64748B', border: isDark ? '#334155' : '#E2E8F0', input: isDark ? '#0F172A' : '#F8FAFC' };
  const [form, setForm] = useState(emptyForm);
  const [slots, setSlots] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const availability = await getMyAvailability();
      setSlots(Array.isArray(availability?.availableSlots) ? availability.availableSlots : []);
      setIsAvailable(availability?.isActive !== false);
    } catch (loadError) { setError('Unable to load availability right now.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const save = async () => {
    const { date, startTime, endTime, notes } = form;
    if (!date || !startTime || !endTime) return Alert.alert('Missing details', 'Date, start time and end time are required.');
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return Alert.alert('Invalid time', 'Enter a valid date and make sure end time is after start time.');
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (start < today) return Alert.alert('Invalid date', 'Availability cannot be added for a past date.');
    const duplicate = slots.some((slot) => String(slot._id) !== String(editingId || '') && slot.date === date && slot.startTime === startTime && slot.endTime === endTime);
    if (duplicate) return Alert.alert('Duplicate slot', 'This exact availability slot already exists.');
    const { providerId } = await getStoredProviderAuth();
    const payload = { providerId, date, startTime, endTime, startDateTime: start.toISOString(), endDateTime: end.toISOString(), isAvailable: true, slotType: 'AVAILABLE', notes: notes.trim() };
    try {
      setSaving(true);
      if (editingId) await updateAvailabilitySlot(editingId, payload); else await createAvailabilitySlot(payload);
      Alert.alert('Success', editingId ? 'Availability updated successfully.' : 'Availability saved successfully.');
      setForm(emptyForm); setEditingId(null); await load();
    } catch (saveError) { Alert.alert('Unable to save', saveError.message || 'Unable to update availability right now.'); }
    finally { setSaving(false); }
  };

  const edit = (slot) => { setEditingId(slot._id); setForm({ date: slot.date || '', startTime: slot.startTime || '', endTime: slot.endTime || '', notes: slot.notes || '' }); };
  const remove = (slot) => Alert.alert('Delete availability?', `${slot.date} · ${slot.startTime}–${slot.endTime}`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await deleteAvailabilitySlot(slot._id); if (editingId === slot._id) { setEditingId(null); setForm(emptyForm); } await load(); } catch (deleteError) { Alert.alert('Unable to delete', deleteError.message); } } }]);
  const toggleStatus = async () => { try { setUpdatingStatus(true); const result = await updateProviderAvailabilityStatus(!isAvailable); setIsAvailable(result?.isActive !== false); } catch (statusError) { Alert.alert('Unable to update', statusError.message); } finally { setUpdatingStatus(false); } };

  return <View style={[styles.container, { backgroundColor: C.bg }]}>
    <ProviderPageHeader navigation={navigation} title="Manage Availability" subtitle="Set the time slots you are available for service bookings." />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }]}><View><Text style={[styles.sectionTitle, { color: C.text }]}>Quick Availability Status</Text><Text style={[styles.quickStatus, { color: isAvailable ? '#10B981' : '#F59E0B' }]}>{isAvailable ? 'Available' : 'Unavailable'}</Text></View><TouchableOpacity disabled={updatingStatus} style={[styles.statusButton, !isAvailable && styles.statusButtonAvailable]} onPress={toggleStatus}>{updatingStatus ? <ActivityIndicator color="#FFF" /> : <Text style={styles.statusButtonText}>{isAvailable ? 'Go Unavailable' : 'Go Available'}</Text>}</TouchableOpacity></View>
      <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}><Text style={[styles.sectionTitle, { color: C.text }]}>{editingId ? 'Edit Availability Slot' : 'Add Availability Slot'}</Text>
        <Text style={[styles.label, { color: C.muted }]}>Date (YYYY-MM-DD)</Text><TextInput style={[styles.input, { backgroundColor: C.input, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={form.date} onChangeText={(value) => setField('date', value)} placeholder="2026-09-01" />
        <View style={styles.row}><View style={styles.half}><Text style={[styles.label, { color: C.muted }]}>Start (HH:mm)</Text><TextInput style={[styles.input, { backgroundColor: C.input, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={form.startTime} onChangeText={(value) => setField('startTime', value)} placeholder="09:00" /></View><View style={styles.half}><Text style={[styles.label, { color: C.muted }]}>End (HH:mm)</Text><TextInput style={[styles.input, { backgroundColor: C.input, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={form.endTime} onChangeText={(value) => setField('endTime', value)} placeholder="12:00" /></View></View>
        <Text style={[styles.label, { color: C.muted }]}>Notes (optional)</Text><TextInput style={[styles.input, { backgroundColor: C.input, borderColor: C.border, color: C.text }]} placeholderTextColor={isDark ? '#64748B' : '#94A3B8'} value={form.notes} onChangeText={(value) => setField('notes', value)} placeholder="Morning service hours" />
        <View style={styles.actions}>{editingId ? <TouchableOpacity style={styles.cancelButton} onPress={() => { setEditingId(null); setForm(emptyForm); }}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity> : null}<TouchableOpacity disabled={saving} style={styles.saveButton} onPress={save}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveText}>{editingId ? 'Update Availability' : 'Save Availability'}</Text>}</TouchableOpacity></View>
      </View>
      <Text style={[styles.listTitle, { color: C.text }]}>Existing Availability</Text>
      {loading ? <View style={[styles.state, { backgroundColor: C.card }]}><ActivityIndicator color="#667eea" /><Text style={[styles.stateText, { color: C.muted }]}>Loading availability...</Text></View> : error ? <View style={[styles.state, { backgroundColor: C.card }]}><Text style={styles.error}>{error}</Text><TouchableOpacity onPress={load}><Text style={styles.retry}>Try again</Text></TouchableOpacity></View> : slots.length === 0 ? <View style={[styles.state, { backgroundColor: C.card }]}><Ionicons name="calendar-outline" size={30} color="#94A3B8" /><Text style={[styles.stateText, { color: C.muted }]}>No availability slots added yet.</Text></View> : slots.map((slot) => <View key={slot._id} style={[styles.slotCard, { backgroundColor: C.card, borderColor: C.border }]}><View style={styles.slotTop}><View><Text style={[styles.slotDate, { color: C.text }]}>{slot.date}</Text><Text style={[styles.slotTime, { color: C.muted }]}>{slot.startTime} – {slot.endTime}</Text></View><Text style={[styles.status, !slot.isAvailable && styles.unavailable]}>{slot.isAvailable ? 'Available' : 'Unavailable'}</Text></View>{slot.notes ? <Text style={[styles.notes, { color: C.muted }]}>{slot.notes}</Text> : null}<View style={styles.slotActions}><TouchableOpacity onPress={() => edit(slot)}><Text style={styles.edit}>Edit</Text></TouchableOpacity><TouchableOpacity onPress={() => remove(slot)}><Text style={styles.delete}>Delete</Text></TouchableOpacity></View></View>)}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 16, paddingBottom: 50 }, quickCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, quickStatus: { fontSize: 13, fontWeight: '500' }, statusButton: { backgroundColor: '#B45309', borderRadius: 11, minWidth: 128, paddingHorizontal: 14, paddingVertical: 11, alignItems: 'center' }, statusButtonAvailable: { backgroundColor: '#059669' }, statusButtonText: { color: '#FFF', fontWeight: '600', fontSize: 12 }, card: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' }, sectionTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginBottom: 8 }, label: { color: '#475569', fontSize: 12, fontWeight: '500', marginTop: 10, marginBottom: 6 }, input: { borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', borderRadius: 11, paddingHorizontal: 12, minHeight: 46, color: '#111827' }, row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 16 }, saveButton: { backgroundColor: '#667eea', borderRadius: 11, paddingHorizontal: 16, paddingVertical: 12, minWidth: 145, alignItems: 'center' }, saveText: { color: '#FFF', fontWeight: '600' }, cancelButton: { paddingHorizontal: 16, paddingVertical: 12 }, cancelText: { color: '#64748B', fontWeight: '500' }, listTitle: { fontSize: 17, fontWeight: '600', color: '#111827', marginTop: 22, marginBottom: 10 }, state: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center', gap: 9 }, stateText: { color: '#64748B' }, error: { color: '#B91C1C' }, retry: { color: '#667eea', fontWeight: '500' }, slotCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' }, slotTop: { flexDirection: 'row', justifyContent: 'space-between' }, slotDate: { color: '#111827', fontWeight: '600' }, slotTime: { color: '#64748B', marginTop: 4 }, status: { color: '#047857', backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11 }, unavailable: { color: '#B45309', backgroundColor: '#FEF3C7' }, notes: { color: '#64748B', marginTop: 9, fontSize: 12 }, slotActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20, marginTop: 12 }, edit: { color: '#4F46E5', fontWeight: '500' }, delete: { color: '#DC2626', fontWeight: '500' },
});
