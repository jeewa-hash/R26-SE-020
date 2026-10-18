import React, { useState } from 'react';
import { Alert } from 'react-native';
import ScreenShell from './ScreenShell';
import SuggestedSlotCard from './components/SuggestedSlotCard';
import ActionButton from './components/ActionButton';
import EmptyJobsState from './components/EmptyJobsState';
import { selectSuggestedSlot } from './services/myJobsApi';
import { useTheme } from '../../hooks/useTheme';

const getSlotId = (slot) => slot?._id || slot?.id;

export default function SuggestedSlotsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const quote = route.params?.quote;
  const [selectedSlot, setSelectedSlot] = useState(quote?.selectedSlot || null);
  const [validatedQuote, setValidatedQuote] = useState(null);
  const [loadingSlotId, setLoadingSlotId] = useState(null);

  if (!quote?.coordinationId) {
    return (
      <ScreenShell title="Suggested Slots" subtitle="No coordination result" navigation={navigation}>
        <EmptyJobsState
          title="No real suggested slots found"
          message="Run the smart coordination check first. Suggested slots are loaded from the coordination backend."
          icon="event-busy"
          buttonLabel="Back to Review"
          onButtonPress={() => navigation.goBack()}
          isDarkMode={isDarkMode}
        />
      </ScreenShell>
    );
  }

  const slots = quote.suggestedSlots || [];

  const handleSelect = async (slot) => {
    const slotId = getSlotId(slot);

    if (!slotId) {
      Alert.alert('Invalid Slot', 'This slot does not have a valid backend slot ID.');
      return;
    }

    setLoadingSlotId(slotId);

    try {
      const result = await selectSuggestedSlot(quote.coordinationId, slotId);
      const payload = result.data || result;
      const decision = payload.coordination?.finalDecision;
      if (!['CAN_ACCEPT', 'AVAILABLE_WITH_CAUTION'].includes(decision)) {
        throw new Error('This time is not ready for booking. Please review availability again.');
      }
      setValidatedQuote({
        ...quote,
        coordinationStatus: decision,
        coordinationDecision: decision,
        scheduleEvaluation: payload.scheduleEvaluation,
        selectedSlot: payload.selectedSlot || slot,
        coordinatedStartTime: payload.scheduleEvaluation?.requiredWindowStart || slot.startTime,
        coordinatedEndTime: payload.scheduleEvaluation?.requiredWindowEnd || slot.endTime,
      });
      setSelectedSlot(payload.selectedSlot || slot);
    } catch (error) {
      Alert.alert('Slot Selection Failed', error.message || 'Please try again.');
    } finally {
      setLoadingSlotId(null);
    }
  };

  const updatedQuote = validatedQuote;

  return (
    <ScreenShell
      title="Suggested Slots"
      subtitle="Choose a better time"
      navigation={navigation}
      footer={
        <ActionButton
          label="Continue to Confirm Job"
          icon="check-circle"
          variant="success"
          disabled={!validatedQuote || Boolean(loadingSlotId)}
          onPress={() => navigation.navigate('IT22129376ConfirmJob', { quote: updatedQuote })}
        />
      }
    >
      {!slots.length ? (
        <EmptyJobsState
          title="No slots returned"
          message="The backend did not return any suggested slots for this coordination."
          icon="event-busy"
          isDarkMode={isDarkMode}
        />
      ) : (
        slots.map((slot) => {
          const slotId = getSlotId(slot);
          const selectedId = getSlotId(selectedSlot);

          return (
            <SuggestedSlotCard
              key={slotId}
              slot={slot}
              selected={selectedId === slotId}
              loading={loadingSlotId === slotId}
              isDarkMode={isDarkMode}
              onSelect={() => handleSelect(slot)}
            />
          );
        })
      )}
    </ScreenShell>
  );
}
