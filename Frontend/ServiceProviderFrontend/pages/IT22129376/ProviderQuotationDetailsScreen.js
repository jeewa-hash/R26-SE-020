import React, { useCallback, useContext, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import ProviderPageHeader from '../../components/ProviderPageHeader';
import { ThemeContext } from '../../context/ThemeContext';
import { getProviderQuotationById, getProviderRequestById, getProviderBookings, retryProviderQuotation, askSeekerToReschedule, getHumanServiceTitle, statusLabel } from '../../services/providerFlowApi';
import { getStoredProviderAuth } from './services/providerAuthStorage';
import { bookingForQuote, idOf } from '../../utils/providerFlowState';
import { confirm, notify, openProviderTab } from '../../utils/providerFlowUi';

export default function ProviderQuotationDetailsScreen({ route, navigation }) {
  const { isDark } = useContext(ThemeContext) || {};
  const [quote, setQuote] = useState(route.params?.quotation || {});
  const [request, setRequest] = useState(null);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const quoteId = idOf(route.params?.quotationId || route.params?.quotation?._id || route.params?.quotation?.id);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (!quoteId) throw new Error('Quotation ID is missing. Return to My Jobs and refresh.');
      const latest = await getProviderQuotationById(quoteId);
      setQuote(latest);
      const { providerId } = await getStoredProviderAuth();
      const requestId = idOf(latest.providerRequestId || latest.externalRequestQuotationId);
      const results = await Promise.allSettled([
        requestId ? getProviderRequestById(requestId) : Promise.resolve(null),
        getProviderBookings(providerId),
      ]);
      setRequest(results[0].status === 'fulfilled' ? results[0].value : null);
      setBooking(results[1].status === 'fulfilled' ? bookingForQuote(results[1].value, latest) || null : null);
      if (results.some(result => result.status === 'rejected')) setError('Some linked details could not be loaded. Refresh before taking the next step.');
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [quoteId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const action = async work => {
    if (busy) return;
    setBusy(true);
    try { await work(); await load(); }
    catch (e) { notify('Unable to update quotation', e.message); }
    finally { setBusy(false); }
  };
  const status = String(quote.status || 'SENT').toUpperCase();
  const coordination = String(quote.coordinationStatus || 'NOT_CHECKED').toUpperCase();
  const sent = ['SENT', 'COUNTER_OFFERED'].includes(status);
  const needsTime = ['RESCHEDULE_REQUIRED','CONFLICT_DETECTED','NOT_AVAILABLE','REJECTED_DUE_TO_CONFLICT','NEEDS_RESCHEDULE','CONFLICT_FOUND'].includes(coordination);
  const textColor = isDark ? '#F5FAF6' : '#162C49';
  const button = (label, onPress, disabled = false) => <TouchableOpacity disabled={disabled || busy || loading} onPress={onPress} style={{ backgroundColor: '#15803D', padding: 14, borderRadius: 10, opacity: disabled || busy || loading ? .5 : 1 }}><Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600' }}>{label}</Text></TouchableOpacity>;
  return <View style={{ flex: 1, backgroundColor: isDark ? '#0C0F0D' : '#F5FAF6' }}>
    <ProviderPageHeader navigation={navigation} title="Quotation Details" subtitle="Track validation, the seeker’s decision and the confirmed booking" />
    <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
      {loading || busy ? <ActivityIndicator color="#15803D" /> : null}
      {error ? <Text accessibilityRole="alert" style={{ color: '#DC2626' }}>{error}</Text> : null}
      <Text style={{ color: textColor, fontSize: 22, fontWeight: '700' }}>{getHumanServiceTitle(request || quote)}</Text>
      <Text style={{ color: textColor }}>Price: LKR {Number(quote.price || 0).toLocaleString()}</Text>
      <Text style={{ color: textColor }}>Quotation: {statusLabel(status)}</Text>
      <Text style={{ color: textColor }}>Availability: {statusLabel(coordination)}</Text>
      <Text style={{ color: textColor }}>Requested start: {quote.proposedStartTime ? new Date(quote.proposedStartTime).toLocaleString() : 'Not selected'}</Text>
      {quote.notes ? <Text style={{ color: textColor }}>{quote.notes}</Text> : null}
      <Text style={{ color: textColor }}>{booking ? 'The seeker confirmed this booking. Open it to manage travel, start work and complete the job.' : status === 'ACCEPTED' ? 'The quotation is accepted. A booking appears once the seeker confirms it. Refresh to check.' : sent ? request?.rescheduleRequestedAt ? 'Waiting for the seeker to choose a new time.' : needsTime ? 'The requested time conflicts with your schedule. Ask the seeker for another time; your price stays the same.' : ['CAN_ACCEPT','AVAILABLE_WITH_CAUTION'].includes(coordination) ? 'Waiting for the seeker to accept and confirm a booking.' : 'Availability validation needs attention. Retry the saved quotation.' : `This quotation is ${statusLabel(status).toLowerCase()}.`}</Text>
      {booking ? button('Open Booking', () => navigation.navigate('IT22129376ProviderJobDetails', { booking })) : null}
      {request ? button('View Original Request', () => navigation.navigate('IT22129376ProviderRequestDetails', { request })) : null}
      {sent && !request?.rescheduleRequestedAt ? button('Recheck Availability', () => action(() => retryProviderQuotation(quoteId))) : null}
      {sent && needsTime && request && !request.rescheduleRequestedAt ? button('Ask Seeker to Reschedule', () => confirm('Request a new time', 'Ask the seeker to choose another start time? Your price stays unchanged.', () => action(() => askSeekerToReschedule(idOf(request._id || request.id), 'I cannot work at the requested time. Please choose another start time.')))) : null}
      {button('Manage Availability', () => navigation.navigate('ProviderAvailability'))}
      {button('Refresh Status', load)}
      {button('Back to My Jobs', () => openProviderTab(navigation, 'Bookings', { tab: booking ? 'Scheduled' : 'Quotes' }))}
    </ScrollView>
  </View>;
}
