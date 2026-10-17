import PageHeader from '../../components/PageHeader';
import RequestedTimeModal from './components/RequestedTimeModal';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../hooks/useTheme';
import { COLORS, toneColors } from './theme';
import { getStoredSeekerAuth } from './services/seekerAuthStorage';
import {
  createSeekerRescheduleSuggestion,
  getProviderQuotationsForSeeker,
  getSeekerBookings,
  getSeekerRequestQuotations,
} from './services/myJobsApi';

const getRecordSessionId = (item) => String(
  item?.sessionId || item?.externalSessionId || item?.serviceSessionId || ''
);
const getRequestId = (item) => String(item?._id || item?.id || item?.requestQuotationId || '');
const getQuoteRequestId = (item) => String(item?.externalRequestQuotationId || item?.requestQuotationId || item?.providerRequestId || '');
const shortId = (value) => value ? String(value).slice(-8) : '';

const formatMoney = (value) => {
  const amount = Number(value || 0);

  return `LKR ${amount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
};

const formatDateTime = (value) => {
  if (!value) return 'Not provided';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getTitle = (session) => {
  return (
    session?.title ||
    session?.detectedObject ||
    session?.serviceSubcategory ||
    session?.briefDescription ||
    'Service Request'
  );
};

const getCategory = (session) => {
  return (
    session?.detectedCategory ||
    session?.serviceCategory ||
    session?.category ||
    'General'
  );
};

const getSubcategory = (session) => {
  return (
    session?.detectedObject ||
    session?.serviceSubcategory ||
    session?.subcategory ||
    session?.object ||
    'Service'
  );
};

const getLocation = (session) => {
  const location = session?.serviceLocation || session?.location || session?.district;

  if (typeof location === 'string') return location;
  if (location?.address) return location.address;

  return 'Location not available';
};

const getProviderNameFromRequest = (request) => {
  const provider = request?.provider || request?.providerId || request?.providerSnapshot;

  return (
    request?.providerName ||
    request?.businessName ||
    request?.providerSnapshot?.businessName ||
    request?.providerSnapshot?.name ||
    provider?.businessName ||
    provider?.name ||
    provider?.fullName ||
    (provider?._id || provider?.id || provider ? `Provider · ${shortId(provider?._id || provider?.id || provider)}` : 'Provider')
  );
};

const getProviderNameFromQuote = (quote) => {
  return (
    quote?.providerName ||
    quote?.businessName ||
    quote?.providerSnapshot?.businessName ||
    quote?.providerSnapshot?.name ||
    quote?.provider?.businessName ||
    quote?.provider?.name ||
    quote?.provider?.fullName ||
    'Provider'
  );
};

const getQuotePrice = (quote) => {
  return quote?.price || quote?.quotedPrice || quote?.finalAmount || quote?.amount || 0;
};

const getQuoteStatusTone = (quote) => {
  const status = String(quote?.coordinationDecision || quote?.coordinationStatus || quote?.status || '').toUpperCase();

  if (status === 'CAN_ACCEPT' || status === 'AVAILABLE_WITH_CAUTION' || status === 'ACCEPTED') {
    return toneColors.success;
  }

  if (status === 'NOT_AVAILABLE' || status === 'REJECTED' || status === 'CANCELLED') {
    return toneColors.danger;
  }

  if (status === 'NOT_CHECKED' || status === 'SENT') {
    return toneColors.warning;
  }

  return toneColors.info;
};

function DetailsHeader({ isDarkMode, title, subtitle }) {
  return (
    <PageHeader title={<>{title}</>} subtitle={<>{subtitle}</>} />
  );
}

function InfoRow({ icon, label, value, isDarkMode }) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.infoIcon, isDarkMode && styles.providerIconDark]}>
        <Ionicons name={icon} size={18} color={COLORS.primary} />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, isDarkMode && styles.textMutedDark]}>
          {label}
        </Text>

        <Text style={[styles.infoValue, isDarkMode && styles.textDark]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function SectionCard({ title, icon, count, children, isDarkMode }) {
  return (
    <View style={[styles.sectionCard, isDarkMode && styles.sectionCardDark]}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <MaterialIcons name={icon} size={21} color={COLORS.primary} />
          <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>
            {title}
          </Text>
        </View>

        {typeof count === 'number' ? (
          <View style={[styles.sectionCount, isDarkMode && styles.sectionCountDark]}>
            <Text style={[styles.sectionCountText, isDarkMode && styles.accentTextDark]}>{count}</Text>
          </View>
        ) : null}
      </View>

      {children}
    </View>
  );
}

export default function SeekerServiceSessionDetailsScreen({ navigation, route }) {
  const { isDarkMode } = useTheme();
  const initialSession = route?.params?.session || {};
  const sessionId = route?.params?.sessionId || initialSession?.sessionId;
  const [timeRequest, setTimeRequest] = useState(null);
  const [session, setSession] = useState(initialSession);
  const [selectedQuoteId, setSelectedQuoteId] = useState(null);
  const [comparisonVisible, setComparisonVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rescheduleVisible, setRescheduleVisible] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date(Date.now() + 24 * 60 * 60 * 1000));
  const [rescheduleNote, setRescheduleNote] = useState('');
  const [pickerMode, setPickerMode] = useState(null);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const loadRelatedData = useCallback(async () => {
    if (!sessionId) return;
    try {
      setRefreshing(true);
      const auth = await getStoredSeekerAuth();
      if (!auth?.seekerId) return;
      const [requestResult, quoteResult, bookingResult] = await Promise.all([
        getSeekerRequestQuotations(auth.seekerId),
        getProviderQuotationsForSeeker(),
        getSeekerBookings(auth.seekerId),
      ]);
      const allRequests = requestResult?.requests || [];
      const requests = allRequests.filter((item) => getRecordSessionId(item) === String(sessionId));
      const requestIds = new Set(requests.map(getRequestId));
      const quotations = (quoteResult?.quotations || []).filter((item) => (
        getRecordSessionId(item) === String(sessionId) || requestIds.has(getQuoteRequestId(item))
      ));
      const bookings = (bookingResult?.bookings || []).filter((item) => getRecordSessionId(item) === String(sessionId));
      setSession((current) => ({
        ...current,
        sessionId,
        requests,
        quotations,
        bookings,
        booking: bookings[0] || current?.booking || null,
      }));
    } finally {
      setRefreshing(false);
    }
  }, [sessionId]);

  useFocusEffect(useCallback(() => { loadRelatedData(); }, [loadRelatedData]));
  const requests = Array.isArray(session.requests) ? session.requests : [];
  const quotations = Array.isArray(session.quotations) ? session.quotations : [];
  const booking = session.booking || null;

  const sortedQuotes = useMemo(() => {
    return [...quotations].sort((a, b) => Number(getQuotePrice(a)) - Number(getQuotePrice(b)));
  }, [quotations]);

  const bestQuote = sortedQuotes[0] || null;
  const quoteId = (quote) => String(quote?._id || quote?.id || quote?.externalQuotationId || '');
  const selectedQuote = sortedQuotes.find((quote) => quoteId(quote) === selectedQuoteId);

  const canCompare = sortedQuotes.length > 1;

  const handleCompareQuotes = () => {
    if (!canCompare) {
      Alert.alert(
        'Compare Quotes',
        'You need at least 2 provider quotations to compare this session.'
      );
      return;
    }

    setComparisonVisible((visible) => !visible);
  };

  const handleSmartReviewQuote = (quote) => {
    if (!quote.coordinationId || !['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(quote.coordinationStatus)) {
      const message = 'This offer is not ready for confirmation. The provider must finish validation or ask you to choose a new time.';
      if (Platform.OS === 'web') window.alert(message); else Alert.alert('Offer pending', message);
      return;
    }
    navigation.navigate('IT22129376ConfirmJob', { quote });
  };

  const submitReschedule = async () => {
    const quote = sortedQuotes.find((item) => String(item?.status || '').toUpperCase() === 'ACCEPTED') || sortedQuotes[0];
    if (!booking?._id && !booking?.id) {
      Alert.alert('Booking required', 'A reschedule suggestion can be sent after a booking is confirmed.');
      return;
    }
    if (rescheduleDate <= new Date()) {
      Alert.alert('Choose a future time', 'The suggested service time must be in the future.');
      return;
    }
    try {
      setSubmittingReschedule(true);
      const auth = await getStoredSeekerAuth();
      await createSeekerRescheduleSuggestion({
        sessionId,
        quotationId: quote?._id || quote?.id || quote?.externalQuotationId,
        bookingId: booking?._id || booking?.id,
        seekerId: auth?.seekerId,
        providerId: booking?.providerId || quote?.providerId,
        requestedStartTime: rescheduleDate.toISOString(),
        note: rescheduleNote.trim(),
      });
      setRescheduleVisible(false);
      setRescheduleNote('');
      Alert.alert('Suggestion sent', 'The provider must review and confirm the new time. Your booking has not been changed yet.');
      await loadRelatedData();
    } catch (error) {
      Alert.alert('Unable to suggest reschedule', error?.message || 'Please try again.');
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleOpenQuote = (quote) => {
    navigation.navigate('IT22129376QuoteDetails', {
      quote,
      quotationId: quote?._id || quote?.id || quote?.externalQuotationId,
      sessionId: session.sessionId,
    });
  };

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.containerDark]}
      edges={['top']}
    >
      <StatusBar
        barStyle="light-content"
        backgroundColor={isDarkMode ? COLORS.darkBg : COLORS.primary}
      />

      <DetailsHeader
        isDarkMode={isDarkMode}
        title="Request Details"
        subtitle="Service session, provider requests and quotations"
      />



      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadRelatedData} />}
      >
        <View style={[styles.summaryCard, isDarkMode && styles.sectionCardDark]}>
          <Text style={[styles.mainTitle, isDarkMode && styles.textDark]} numberOfLines={2}>
            {getTitle(session)}
          </Text>

          <Text style={[styles.mainSubtitle, isDarkMode && styles.textMutedDark]}>
            Service Session ID: {String(session.sessionId || '')}
          </Text>

          <View style={styles.chipRow}>
            <View style={styles.chip}>
              <Text style={styles.chipText}>{getCategory(session)}</Text>
            </View>

            <View style={styles.chip}>
              <Text style={styles.chipText}>{getSubcategory(session)}</Text>
            </View>
          </View>

          <InfoRow
            icon="location-outline"
            label="Service Location"
            value={getLocation(session)}
            isDarkMode={isDarkMode}
          />

          <InfoRow
            icon="time-outline"
            label="Preferred Time"
            value={formatDateTime(session.preferredStartTime || session.proposedStartTime)}
            isDarkMode={isDarkMode}
          />

          <InfoRow
            icon="calendar-outline"
            label="Created Date"
            value={formatDateTime(session.createdAt || session.created_at)}
            isDarkMode={isDarkMode}
          />

          {session.briefDescription || session.description ? (
            <View style={[styles.descriptionBox, isDarkMode && styles.descriptionBoxDark]}>
              <Text style={[styles.descriptionTitle, isDarkMode && styles.textDark]}>
                Description
              </Text>

              <Text style={[styles.descriptionText, isDarkMode && styles.textMutedDark]}>
                {session.briefDescription || session.description}
              </Text>
            </View>
          ) : null}
        </View>

        <SectionCard
          title="Requested Providers"
          icon="groups"
          count={requests.length}
          isDarkMode={isDarkMode}
        >
          {!requests.length ? (
            <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
              No provider requests found for this session.
            </Text>
          ) : (
            requests.map((request, index) => (
              <View
                key={request?._id || request?.id || index}
                style={[styles.providerRow, isDarkMode && styles.providerRowDark]}
              >
                <View style={[styles.providerIcon, isDarkMode && styles.providerIconDark]}>
                  <Ionicons name="person-outline" size={19} color={COLORS.primary} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.providerName, isDarkMode && styles.textDark]} numberOfLines={1}>
                    {getProviderNameFromRequest(request)}
                  </Text>

                  <Text style={[styles.providerMeta, isDarkMode && styles.textMutedDark]}>
                    {String(request?.status || 'pending').toLowerCase() === 'pending' ? 'Request Sent' : `Status: ${request?.status}`}
                  </Text>
                  <Text style={[styles.providerMeta, isDarkMode && styles.textMutedDark]}>
                    Requested start: {formatDateTime(request.preferredStartTime)}
                  </Text>
                  {request.rescheduleRequestedAt ? <>
                    <Text style={[styles.providerMeta, isDarkMode && styles.textMutedDark]}>Provider requested a new time: {request.rescheduleReason}</Text>
                    <TouchableOpacity onPress={() => setTimeRequest(request)} style={[styles.reviewQuoteButton, isDarkMode && styles.reviewQuoteButtonDark]}><Text style={[styles.reviewQuoteButtonText, isDarkMode && styles.accentTextDark]}>Choose New Date & Time</Text></TouchableOpacity>
                  </> : null}
                </View>

                <Ionicons name="send-outline" size={18} color={COLORS.warning} />
              </View>
            ))
          )}
        </SectionCard>

        <SectionCard
          title="Received Quotations"
          icon="request-quote"
          count={sortedQuotes.length}
          isDarkMode={isDarkMode}
        >
          {!sortedQuotes.length ? (
            <Text style={[styles.emptyText, isDarkMode && styles.textMutedDark]}>
              No quotations received yet. Provider responses will appear here.
            </Text>
          ) : (
            sortedQuotes.map((quote, index) => {
              const isBest =
                bestQuote &&
                (bestQuote._id || bestQuote.id || bestQuote.externalQuotationId) ===
                  (quote._id || quote.id || quote.externalQuotationId);

              const baseTone = getQuoteStatusTone(quote);
              const darkTones = {
                [toneColors.success.bg]: { bg: '#123D35', text: '#6EE7B7' },
                [toneColors.warning.bg]: { bg: '#42331D', text: '#FCD34D' },
                [toneColors.danger.bg]: { bg: '#472436', text: '#FDA4AF' },
                [toneColors.info.bg]: { bg: '#23355B', text: '#93C5FD' },
                [toneColors.neutral.bg]: { bg: '#303850', text: '#CBD5E1' },
              };
              const tone = isDarkMode ? darkTones[baseTone.bg] || baseTone : baseTone;

              return (
                <TouchableOpacity
                  key={quote?._id || quote?.id || index}
                  style={[
                    styles.quoteCard,
                    isDarkMode && styles.quoteCardDark,
                    isBest && styles.bestQuoteCard,
                    isBest && isDarkMode && styles.bestQuoteCardDark,
                  ]}
                  onPress={() => handleOpenQuote(quote)}
                  activeOpacity={0.88}
                >
                  <View style={styles.quoteTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.quoteProvider, isDarkMode && styles.textDark]} numberOfLines={1}>
                        {getProviderNameFromQuote(quote)}
                      </Text>

                      <Text style={[styles.quoteNote, isDarkMode && styles.textMutedDark]} numberOfLines={2}>
                        {quote?.note || quote?.notes || 'Provider quotation received.'}
                      </Text>
                    </View>

                    {isBest ? (
                      <View style={styles.bestPill}>
                        <Ionicons name="sparkles-outline" size={13} color="#fff" />
                        <Text style={styles.bestPillText}>Lowest price</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.quoteMetaRow}>
                    <View style={styles.quoteMetaItem}>
                      <Ionicons name="cash-outline" size={17} color={COLORS.primary} />
                      <Text style={[styles.quoteMetaText, isDarkMode && styles.textDark]}>
                        {formatMoney(getQuotePrice(quote))}
                      </Text>
                    </View>

                    <View style={styles.quoteMetaItem}>
                      <Ionicons name="time-outline" size={17} color={COLORS.primary} />
                      <Text style={[styles.quoteMetaText, isDarkMode && styles.textDark]}>
                        {quote?.estimatedDurationHours
                          ? `${quote.estimatedDurationHours} hrs`
                          : quote?.durationText || 'Duration N/A'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.quoteFooter, isDarkMode && styles.quoteFooterDark]}>
                    <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                      <Text style={[styles.statusText, { color: tone.text }]}>
                        {quote?.coordinationDecision || quote?.coordinationStatus || quote?.status || 'SENT'}
                      </Text>
                    </View>

                    <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />
                  </View>

                  <TouchableOpacity
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selectedQuoteId === quoteId(quote) }}
                    accessibilityLabel={`Select quotation from ${getProviderNameFromQuote(quote)}`}
                    style={styles.selectionButton}
                    onPress={() => setSelectedQuoteId(quoteId(quote))}
                  >
                    <Ionicons name={selectedQuoteId === quoteId(quote) ? 'radio-button-on' : 'radio-button-off'} size={22} color={COLORS.primary} />
                    <Text style={[styles.quoteMetaText, isDarkMode && styles.textDark]}>{selectedQuoteId === quoteId(quote) ? 'Selected for review' : 'Select this quotation'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.reviewQuoteButton, isDarkMode && styles.reviewQuoteButtonDark]} onPress={() => handleSmartReviewQuote(quote)}>
                    <Text style={[styles.reviewQuoteButtonText, isDarkMode && styles.accentTextDark]}>Select & Continue to Confirmation</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}

          <TouchableOpacity
            style={[
              styles.compareButton,
              !canCompare && styles.compareButtonDisabled,
            ]}
            onPress={handleCompareQuotes}
            activeOpacity={0.85}
          >
            <MaterialIcons name="compare-arrows" size={20} color="#fff" />
            <Text style={styles.compareButtonText}>
              Compare Quotations
            </Text>
          </TouchableOpacity>

          {comparisonVisible && canCompare ? (
            <ScrollView horizontal style={{ marginTop: 16 }}>
              {sortedQuotes.map((quote) => (
                <TouchableOpacity key={quoteId(quote)} style={[styles.comparisonColumn, isDarkMode && styles.quoteCardDark, selectedQuoteId === quoteId(quote) && styles.selectedColumn]} onPress={() => setSelectedQuoteId(quoteId(quote))} accessibilityRole="radio" accessibilityState={{ checked: selectedQuoteId === quoteId(quote) }}>
                  <Text style={[styles.quoteProvider, isDarkMode && styles.textDark]}>{getProviderNameFromQuote(quote)}</Text>
                  <Text style={[styles.quoteMetaText, isDarkMode && styles.textDark]}>{formatMoney(getQuotePrice(quote))}</Text>
                  <Text style={[styles.quoteNote, isDarkMode && styles.textMutedDark]}>Proposed start: {formatDateTime(quote.proposedStartTime)}</Text>
                  <Text style={[styles.quoteNote, isDarkMode && styles.textMutedDark]}>Duration: {quote.estimatedDurationHours ? `${quote.estimatedDurationHours} hrs` : quote.durationText || 'Calculated automatically'}</Text>
                  <Text style={[styles.quoteNote, isDarkMode && styles.textMutedDark]}>Offer: {['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(quote.coordinationStatus) ? 'Ready to select' : 'Awaiting provider validation'}</Text>
                  <Ionicons name={selectedQuoteId === quoteId(quote) ? 'radio-button-on' : 'radio-button-off'} size={24} color={COLORS.primary} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : null}
          {selectedQuote ? (
            <TouchableOpacity style={styles.compareButton} onPress={() => handleSmartReviewQuote(selectedQuote)}>
              <Text style={styles.compareButtonText}>Continue with Selected Quotation</Text>
            </TouchableOpacity>
          ) : null}

          {!canCompare ? (
            <Text style={[styles.compareHelpText, isDarkMode && styles.textMutedDark]}>
              At least 2 quotations are required for comparison.
            </Text>
          ) : null}
        </SectionCard>

        {booking ? (
          <SectionCard
            title="Booking Status"
            icon="event-available"
            isDarkMode={isDarkMode}
          >
            <View style={[styles.bookingBox, isDarkMode && styles.providerRowDark]}>
              <View style={[styles.providerIcon, isDarkMode && styles.providerIconDark]}>
                <Ionicons name="checkmark-circle-outline" size={20} color={COLORS.success} />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.providerName, isDarkMode && styles.textDark]}>
                  {booking.bookingStatus || 'CONFIRMED'}
                </Text>

                <Text style={[styles.providerMeta, isDarkMode && styles.textMutedDark]}>
                  {formatDateTime(booking.scheduledStartTime || booking.startTime || booking.createdAt)}
                </Text>
              </View>
            </View>
          </SectionCard>
        ) : null}

        <TouchableOpacity style={[styles.rescheduleButton, !booking && styles.compareButtonDisabled]} onPress={() => booking ? setRescheduleVisible(true) : Alert.alert('Booking required', 'A confirmed booking is required before suggesting a reschedule.')}>
          <Ionicons name="calendar-outline" size={19} color="#fff" />
          <Text style={styles.compareButtonText}>Suggest Reschedule</Text>
        </TouchableOpacity>

        <View style={{ height: 110 }} />
      </ScrollView>

      {timeRequest ? <RequestedTimeModal request={timeRequest} onClose={() => setTimeRequest(null)} onSaved={loadRelatedData} /> : null}
      <Modal visible={rescheduleVisible} transparent animationType="fade" onRequestClose={() => setRescheduleVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, isDarkMode && styles.sectionCardDark]}>
            <Text style={[styles.sectionTitle, isDarkMode && styles.textDark]}>Suggest Reschedule</Text>
            <Text style={[styles.modalHelp, isDarkMode && styles.textMutedDark]}>The provider will review this suggestion. It will not directly change the booking.</Text>
            <Text style={[styles.infoLabel, isDarkMode && styles.textMutedDark]}>Suggested date</Text>
            <TouchableOpacity style={[styles.pickerButton, isDarkMode && styles.providerRowDark]} onPress={() => setPickerMode('date')}><Text style={[styles.infoValue, isDarkMode && styles.textDark]}>{rescheduleDate.toLocaleDateString()}</Text></TouchableOpacity>
            <Text style={[styles.infoLabel, isDarkMode && styles.textMutedDark]}>Suggested time</Text>
            <TouchableOpacity style={[styles.pickerButton, isDarkMode && styles.providerRowDark]} onPress={() => setPickerMode('time')}><Text style={[styles.infoValue, isDarkMode && styles.textDark]}>{rescheduleDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text></TouchableOpacity>
            {pickerMode ? <DateTimePicker value={rescheduleDate} mode={pickerMode} minimumDate={pickerMode === 'date' ? new Date() : undefined} onChange={(event, value) => { setPickerMode(null); if (value) setRescheduleDate((current) => { const next = new Date(current); if (pickerMode === 'date') next.setFullYear(value.getFullYear(), value.getMonth(), value.getDate()); else next.setHours(value.getHours(), value.getMinutes(), 0, 0); return next; }); }} /> : null}
            <Text style={[styles.infoLabel, isDarkMode && styles.textMutedDark]}>Note (optional)</Text>
            <TextInput style={[styles.noteInput, isDarkMode && styles.providerRowDark, isDarkMode && styles.textDark]} value={rescheduleNote} onChangeText={setRescheduleNote} placeholder="Why would you like a different time?" placeholderTextColor={isDarkMode ? COLORS.darkMuted : COLORS.muted} multiline />
            <View style={styles.modalActions}><TouchableOpacity style={styles.modalCancel} onPress={() => setRescheduleVisible(false)}><Text style={[styles.modalCancelText, isDarkMode && styles.textMutedDark]}>Cancel</Text></TouchableOpacity><TouchableOpacity style={styles.modalSubmit} onPress={submitReschedule} disabled={submittingReschedule}>{submittingReschedule ? <ActivityIndicator color="#fff" /> : <Text style={styles.compareButtonText}>Send Suggestion</Text>}</TouchableOpacity></View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  bestQuoteCardDark: { backgroundColor: '#252E50', borderColor: '#818CF8' },
  quoteFooterDark: { borderTopColor: COLORS.darkBorder },
  sectionCountDark: { backgroundColor: '#2A3354' },
  providerIconDark: { backgroundColor: '#2A3354' },
  reviewQuoteButtonDark: { backgroundColor: '#252E50', borderColor: '#818CF8' },
  accentTextDark: { color: '#B4BEFF' },
  selectionButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14, paddingVertical: 8 },
  comparisonColumn: { width: 230, padding: 16, gap: 12, marginRight: 12, borderRadius: 16, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#fff' },
  selectedColumn: { borderColor: COLORS.primary, borderWidth: 2 },
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  containerDark: {
    backgroundColor: COLORS.darkBg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '600',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.82)',
    marginTop: 4,
    maxWidth: 290,
    lineHeight: 18,
  },
  backButton: {
    position: 'absolute',
    top: 16,
    right: 18,
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    zIndex: 5,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
    paddingTop: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionCardDark: {
    backgroundColor: COLORS.darkCard,
    borderColor: COLORS.darkBorder,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    lineHeight: 28,
  },
  mainSubtitle: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  chipText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 15,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.muted,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 19,
  },
  descriptionBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  descriptionBoxDark: {
    backgroundColor: '#ffffff08',
    borderColor: COLORS.darkBorder,
  },
  descriptionTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
  },
  descriptionText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitleRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionTitle: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 8,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  emptyText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  providerRowDark: {
    backgroundColor: '#ffffff08',
    borderColor: COLORS.darkBorder,
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  providerName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  providerMeta: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 3,
  },
  quoteCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  quoteCardDark: {
    backgroundColor: '#ffffff08',
    borderColor: COLORS.darkBorder,
  },
  bestQuoteCard: {
    borderColor: COLORS.primary,
    backgroundColor: '#EEF2FF',
  },
  quoteTopRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'flex-start',
  },
  quoteProvider: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  quoteNote: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  bestPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bestPillText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  quoteMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  quoteMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quoteMetaText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: '500',
  },
  quoteFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  compareButton: {
    marginTop: 6,
    height: 46,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  compareButtonDisabled: {
    opacity: 0.55,
  },
  compareButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  compareHelpText: {
    marginTop: 8,
    color: COLORS.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  bookingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  reviewQuoteButton: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: 9,
    alignItems: 'center',
  },
  reviewQuoteButtonText: {
    textAlign: 'center',
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  rescheduleButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginBottom: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHelp: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 10,
  },
  pickerButton: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 5,
    marginBottom: 10,
  },
  noteInput: {
    minHeight: 86,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    padding: 12,
    marginTop: 5,
    textAlignVertical: 'top',
    fontWeight: '400',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 16,
  },
  modalCancel: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalCancelText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '500',
  },
  modalSubmit: {
    minWidth: 140,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  textDark: {
    color: COLORS.darkText,
  },
  textMutedDark: {
    color: COLORS.darkMuted,
  },
});
