import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const dateOptions = { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Colombo' };
const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Colombo' };
const slotDate = slot => new Date(`${slot.date}T${String(slot.startTime).slice(0, 5)}:00+05:30`);
const valid = date => date && Number.isFinite(date.getTime());

export default function RescheduleReviewCard({ request, currentStart, expired, isDark, busy, onApprove, onDecline }) {
  const C = isDark
    ? { card: '#17251D', border: '#344B3C', text: '#F0FDF4', muted: '#B3C3B8', soft: '#203D2A', accent: '#86EFAC', badge: '#43391F', badgeText: '#FDE68A' }
    : { card: '#FFFFFF', border: '#D8E8DC', text: '#183126', muted: '#65746B', soft: '#F0F8F2', accent: '#166534', badge: '#FFF5D7', badgeText: '#946200' };
  const proposed = request.requestedStartTime ? new Date(request.requestedStartTime).getTime() : null;
  const slots = (request.suggestedSlots || []).filter(slot => valid(slotDate(slot)) && (!proposed || Math.floor(slotDate(slot).getTime() / 60000) === Math.floor(proposed / 60000)));
  const note = String(request.note || request.reason || '').trim();
  const showNote = note && !['Seeker suggested a new service time', 'Seeker-proposed reschedule time', 'A new service time was requested.'].includes(note);

  return <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }]}>
    <View style={styles.heading}>
      <View style={[styles.icon, { backgroundColor: C.soft }]}><Ionicons name="calendar-outline" size={22} color={C.accent} /></View>
      <View style={styles.flex}>
        <Text style={[styles.title, { color: C.text }]}>New time requested</Text>
        <Text style={[styles.subtitle, { color: C.muted }]}>Review the change before confirming</Text>
      </View>
    </View>
    <View style={[styles.badge, { backgroundColor: C.badge }]}><View style={[styles.dot, { backgroundColor: C.badgeText }]} /><Text style={[styles.badgeText, { color: C.badgeText }]}>Awaiting your approval</Text></View>

    {valid(currentStart) ? <View style={[styles.current, { borderColor: C.border }]}>
      <Text style={[styles.label, { color: C.muted }]}>{expired ? 'Previous schedule' : 'Current schedule'}</Text>
      <Text style={[styles.currentValue, { color: C.muted }]}>{currentStart.toLocaleDateString('en-GB', dateOptions)} · {currentStart.toLocaleTimeString('en-US', timeOptions)}</Text>
    </View> : null}

    {showNote ? <View style={styles.noteBox}><Text style={[styles.label, { color: C.muted }]}>Request note</Text><Text style={[styles.note, { color: C.text }]}>{note}</Text></View> : null}

    {slots.map((slot, index) => {
      const start = slotDate(slot);
      const end = slot.endTime ? new Date(`${slot.date}T${slot.endTime}:00+05:30`) : null;
      return <View key={`${slot.date}-${slot.startTime}-${index}`} style={[styles.proposal, { backgroundColor: C.soft }]}>
        <Text style={[styles.label, { color: C.accent }]}>{slots.length > 1 ? `Available option ${index + 1}` : 'Proposed schedule'}</Text>
        <Text style={[styles.date, { color: C.text }]}>{start.toLocaleDateString('en-GB', dateOptions)}</Text>
        <View style={styles.timeRow}><Ionicons name="time-outline" size={18} color={C.accent} /><Text style={[styles.time, { color: C.text }]}>{start.toLocaleTimeString('en-US', timeOptions)}{valid(end) ? ` – ${end.toLocaleTimeString('en-US', timeOptions)}` : ''}</Text></View>
        <Text style={[styles.timezone, { color: C.muted }]}>Sri Lanka time</Text>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Approve new time ${start.toLocaleDateString('en-GB', dateOptions)} ${start.toLocaleTimeString('en-US', timeOptions)}`} disabled={busy} onPress={() => onApprove(slot)} style={[styles.approve, busy && styles.disabled]}>
          {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />}
          <Text style={styles.approveText}>{busy ? 'Updating…' : 'Approve new time'}</Text>
        </TouchableOpacity>
      </View>;
    })}
    {!slots.length ? <Text style={[styles.note, { color: C.muted }]}>No proposed time is available. Refresh the job to get the latest request.</Text> : null}
    <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={onDecline} style={[styles.decline, { borderColor: C.border }, busy && styles.disabled]}><Text style={[styles.declineText, { color: C.muted }]}>Decline request</Text></TouchableOpacity>
    <Text style={[styles.footer, { color: C.muted }]}>{expired ? 'Declining leaves this service expired.' : 'Declining keeps the current schedule.'}</Text>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: 18 }, flex: { flex: 1 },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 12 }, icon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 17, lineHeight: 23, fontWeight: '700' }, subtitle: { fontSize: 12, lineHeight: 18, marginTop: 3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, marginTop: 16 }, badgeText: { fontSize: 11, fontWeight: '600' }, dot: { width: 5, height: 5, borderRadius: 3 },
  current: { marginTop: 18, paddingBottom: 16, borderBottomWidth: 1 }, label: { fontSize: 11, fontWeight: '600', lineHeight: 16 }, currentValue: { fontSize: 13, lineHeight: 21, marginTop: 5 },
  proposal: { borderRadius: 14, padding: 16, marginTop: 16 }, date: { fontSize: 18, lineHeight: 26, fontWeight: '700', marginTop: 6 }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 }, time: { fontSize: 16, lineHeight: 23, fontWeight: '600', flexShrink: 1 }, timezone: { fontSize: 11, marginTop: 5, marginLeft: 25 },
  approve: { backgroundColor: '#15803D', borderRadius: 12, minHeight: 48, padding: 12, flexDirection: 'row', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 18 }, approveText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  noteBox: { marginTop: 16 }, note: { fontSize: 13, lineHeight: 21, marginTop: 6 },
  decline: { borderWidth: 1, borderRadius: 12, minHeight: 46, padding: 12, justifyContent: 'center', alignItems: 'center', marginTop: 16 }, declineText: { fontSize: 13, fontWeight: '600' }, footer: { textAlign: 'center', fontSize: 11, lineHeight: 17, marginTop: 9 }, disabled: { opacity: 0.5 },
});
