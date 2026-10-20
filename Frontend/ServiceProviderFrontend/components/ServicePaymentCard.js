import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CONFIG } from '../config';
import { buildAuthHeaders } from '../services/providerFlowApi';
import { fetchProviderWithTimeout } from '../utils/providerHttp';
import { confirm } from '../utils/providerFlowUi';

const money = value => `LKR ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
export default function ServicePaymentCard({ booking, isDark = false, onChanged }) {
  const [payment, setPayment] = useState(booking.payment || null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);
  const url = `${CONFIG.COORDINATION_SERVICE_URL}/bookings/${booking._id || booking.id}/payment`;
  const request = useCallback(async (suffix = '', options = {}) => {
    const response = await fetchProviderWithTimeout(`${url}${suffix}`, { ...options, headers: await buildAuthHeaders() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Unable to load payment details.');
    return data;
  }, [url]);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setPayment((await request()).payment); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { load(); }, [load, booking.updatedAt]);
  const receive = async method => {
    if (pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      setPayment((await request('/received', { method: 'PUT', body: JSON.stringify({ method }) })).payment);
      onChanged?.();
    } catch (e) { setError(e.message); }
    finally { pending.current = false; setBusy(false); }
  };
  const confirmReceived = method => confirm('Confirm customer payment', payment.customerAmountDue > 0 ? `Have you received ${money(payment.customerAmountDue)} by ${method === 'CASH' ? 'cash' : 'bank transfer'}? Confirm only after receiving it.` : 'No customer payment is due. The full amount is owed by the platform; this does not confirm a platform payout.', () => receive(method));
  const text = { color: isDark ? '#F0FDF4' : '#183522' }, muted = { color: isDark ? '#AFBFBA' : '#64746A' };
  const row = (label, value) => <View style={styles.row}><Text style={[styles.label, muted]}>{label}</Text><Text style={[styles.value, text]}>{value}</Text></View>;
  return <View style={[styles.card, isDark && { backgroundColor: '#17271E', borderColor: '#355541' }]}>
    <Text style={[styles.title, text]}>Payment</Text>
    {row('Your agreed earnings', money(booking.finalAmount))}
    {loading ? <ActivityIndicator color="#15803D" style={{ marginTop: 16 }} /> : payment ? <>
      {row('Customer pays you', money(payment.customerAmountDue))}
      {payment.platformAmountOwed > 0 ? <>{row('Platform owes you', money(payment.platformAmountOwed))}<Text style={[styles.hint, muted]}>Star Points do not reduce your agreed earnings. Platform reimbursement is pending; it has not been paid.</Text></> : null}
      <View style={styles.notice}><Text style={styles.noticeText}>{payment.customerPaymentStatus === 'RECEIVED' ? payment.customerAmountDue > 0 ? 'Customer payment confirmed' : 'No customer payment due · confirmed' : 'Awaiting customer payment confirmation'}</Text></View>
      {payment.customerPaymentStatus !== 'RECEIVED' ? <>
        {payment.customerAmountDue > 0 ? <><TouchableOpacity accessibilityRole="button" disabled={busy || !!error} style={[styles.button, busy && { opacity: 0.5 }]} onPress={() => confirmReceived('CASH')}><Text style={styles.buttonText}>Received cash</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={busy || !!error} style={styles.secondary} onPress={() => confirmReceived('BANK_TRANSFER')}><Text style={styles.link}>Received bank transfer</Text></TouchableOpacity></> : <TouchableOpacity accessibilityRole="button" disabled={busy || !!error} style={styles.button} onPress={() => confirmReceived('POINTS_ONLY')}><Text style={styles.buttonText}>Confirm no customer payment due</Text></TouchableOpacity>}
      </> : null}
    </> : !error ? <Text style={[styles.hint, muted]}>The seeker needs to confirm payment details in My Services. They can use Star Points towards this bill.</Text> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <TouchableOpacity accessibilityRole="button" disabled={loading || busy} onPress={load} style={styles.refresh}><Text style={styles.link}>{busy ? 'Confirming…' : 'Refresh payment'}</Text></TouchableOpacity>
  </View>;
}
const styles = StyleSheet.create({
  card: { backgroundColor: '#FFFFFF', borderColor: '#D5E8DB', borderWidth: 1, borderRadius: 18, padding: 18 }, title: { fontSize: 18, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, marginTop: 16 }, label: { fontSize: 14, flexShrink: 1 }, value: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
  hint: { fontSize: 13, lineHeight: 20, marginTop: 12 }, notice: { backgroundColor: '#EAF6EE', padding: 12, borderRadius: 12, marginTop: 16 }, noticeText: { color: '#166534', fontSize: 13, fontWeight: '600', lineHeight: 20 },
  button: { backgroundColor: '#15803D', borderRadius: 12, padding: 14, marginTop: 16, alignItems: 'center' }, buttonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  secondary: { padding: 14, alignItems: 'center', borderColor: '#D5E8DB', borderWidth: 1, borderRadius: 12, marginTop: 10 }, link: { color: '#15803D', fontWeight: '600', fontSize: 13 },
  refresh: { paddingVertical: 12, alignSelf: 'flex-start', marginTop: 6 }, error: { color: '#DC2626', lineHeight: 20, fontSize: 13, marginTop: 12 },
});
