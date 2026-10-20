import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CONFIG } from '../../../config';
import { buildAuthHeaders } from '../services/seekerAuthStorage';
import { fetchSeekerWithTimeout } from '../../../utils/seekerHttp';

const money = value => `LKR ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
async function request(url, options = {}) {
  const response = await fetchSeekerWithTimeout(url, { ...options, headers: await buildAuthHeaders() });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || data.error || 'Unable to load payment details.');
  return data;
}

export default function ServicePaymentCard({ booking, isDarkMode = false, onChanged }) {
  const bookingId = String(booking._id || booking.id);
  const url = `${CONFIG.COORDINATION_SERVICE_URL}/bookings/${bookingId}/payment`;
  const [payment, setPayment] = useState(booking.payment || null);
  const [balance, setBalance] = useState(null);
  const [points, setPoints] = useState('0');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = await request(url);
      setPayment(result.payment);
      if (!result.payment) {
        const rewards = await request(`${CONFIG.SEEKER_SERVICE_URL}/api/rewards/balance`);
        if (!Number.isFinite(rewards.balance) || rewards.balance < 0) throw new Error('Unable to verify your Star Points balance.');
        setBalance(rewards.balance);
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [url]);
  useEffect(() => { load(); }, [load, booking.updatedAt]);
  const max = Math.max(0, Math.min(Math.floor(balance || 0), Math.floor(Number(booking.finalAmount) || 0)));
  const selected = Number(points);
  const valid = /^\d+$/.test(points) && Number.isSafeInteger(selected) && selected <= max;
  const prepare = async () => {
    if (submitting.current || !valid) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      const result = await request(url, { method: 'POST', body: JSON.stringify({ points: selected }) });
      setPayment(result.payment);
      onChanged?.();
    } catch (e) { setError(`${e.message} If the request timed out, refresh before trying again.`); }
    finally { submitting.current = false; setBusy(false); }
  };
  const confirm = () => {
    const message = `Use ${selected} Star Points and pay ${money(Number(booking.finalAmount) - selected)} directly to the provider? Once confirmed, this points choice cannot be changed.`;
    if (Platform.OS === 'web') { if (window.confirm(message)) prepare(); }
    else Alert.alert('Confirm payment details', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Confirm', onPress: prepare }]);
  };
  const text = { color: isDarkMode ? '#F1F5F9' : '#172033' };
  const muted = { color: isDarkMode ? '#B9C1D3' : '#64748B' };
  const row = (label, value) => <View style={styles.row}><Text style={[styles.label, muted]}>{label}</Text><Text style={[styles.value, text]}>{value}</Text></View>;
  return <View style={[styles.card, isDarkMode && { backgroundColor: '#202136', borderColor: '#383959' }]}>
    <Text style={[styles.title, text]}>Service payment</Text>
    <Text style={[styles.hint, muted]}>Pay the provider directly by cash or bank transfer.</Text>
    {row('Agreed price', money(booking.finalAmount))}
    {loading ? <ActivityIndicator style={{ marginTop: 16 }} color="#6366F1" /> : payment ? <>
      {row('Star Points used', `${payment.pointsRedeemed} · ${money(payment.pointsRedeemed)}`)}
      {row('You pay the provider', money(payment.customerAmountDue))}
      <View style={styles.notice}><Text style={styles.noticeText}>{payment.customerPaymentStatus === 'RECEIVED' ? 'Provider confirmed your payment.' : 'Payment pending · the provider will confirm after receiving your payment.'}</Text></View>
      {payment.platformAmountOwed > 0 ? <Text style={[styles.hint, muted]}>The platform owes the provider {money(payment.platformAmountOwed)} for your points. You do not pay this portion.</Text> : null}
    </> : !error ? <>
      <View style={styles.pointsHeading}><Text style={[styles.label, text]}>Use Star Points</Text><Text style={[styles.hint, muted]}>{balance} available · 1 point = LKR 1</Text></View>
      <View style={styles.pointsRow}><TextInput accessibilityLabel="Star Points to redeem" keyboardType="number-pad" value={points} onChangeText={setPoints} editable={!busy} style={[styles.input, text]} /><TouchableOpacity accessibilityRole="button" disabled={busy || !max} onPress={() => setPoints(String(max))} style={styles.max}><Text style={styles.link}>Use {max} points</Text></TouchableOpacity></View>
      {!valid ? <Text style={styles.error}>Choose a whole number from 0 to {max}.</Text> : null}
      {row('You pay the provider', money(Number(booking.finalAmount) - (valid ? selected : 0)))}
      <TouchableOpacity accessibilityRole="button" disabled={busy || !valid} onPress={confirm} style={[styles.button, (busy || !valid) && { opacity: 0.5 }]}><Text style={styles.buttonText}>{busy ? 'Confirming…' : 'Confirm payment details'}</Text></TouchableOpacity>
      <Text style={[styles.hint, muted]}>This records your points choice. It does not transfer money.</Text>
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <TouchableOpacity accessibilityRole="button" disabled={loading || busy} onPress={load} style={styles.refresh}><Text style={styles.link}>Refresh payment</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E4E6EF', borderRadius: 20, padding: 18, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: '700' }, hint: { fontSize: 12, lineHeight: 19, marginTop: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 16 }, label: { fontSize: 14, flexShrink: 1 }, value: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  pointsHeading: { marginTop: 20 }, pointsRow: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#C7D2FE', borderRadius: 12, padding: 12, fontSize: 16 }, max: { padding: 10 }, link: { color: '#6366F1', fontWeight: '600', fontSize: 13 },
  button: { backgroundColor: '#6366F1', borderRadius: 12, padding: 15, alignItems: 'center', marginTop: 18 }, buttonText: { color: '#FFFFFF', fontWeight: '700' },
  notice: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 12, marginTop: 16 }, noticeText: { color: '#3730A3', fontSize: 13, lineHeight: 20 },
  error: { color: '#DC2626', fontSize: 13, lineHeight: 20, marginTop: 12 }, refresh: { paddingVertical: 12, alignSelf: 'flex-start', marginTop: 4 },
});
