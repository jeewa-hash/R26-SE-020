import React, { useState } from 'react';
import { Alert } from 'react-native';
import ScreenShell from './ScreenShell';
import SuggestedSlotCard from './components/SuggestedSlotCard';
import ActionButton from './components/ActionButton';
import { quotes } from './mock/myJobsMockData';
import { selectSuggestedSlot } from './services/myJobsApi';
import { useTheme } from '../../hooks/useTheme';

export default function SuggestedSlotsScreen({ route, navigation }) {
  const { isDarkMode } = useTheme();
  const quote = route.params?.quote || quotes[0];
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlotId, setLoadingSlotId] = useState(null);

  const handleSelect = async (slot) => {
    setLoadingSlotId(slot._id || slot.id);
    try {
      if (quote.coordinationId && slot._id) {
        await selectSuggestedSlot({ coordinationId: quote.coordinationId, slotId: slot._id });
      }
      setSelectedSlot(slot);
    } catch (error) {
      Alert.alert('Slot Selection Failed', error.message || 'Please try again.');
    } finally {
      setLoadingSlotId(null);
    }
  };

  const updatedQuote = selectedSlot
    ? {
        ...quote,
        selectedSlot,
        proposedStartTime: selectedSlot.startTime,
        coordinationDecision: 'AVAILABLE_WITH_CAUTION',
      }
    : quote;

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
          disabled={!selectedSlot}
          onPress={() => navigation.navigate('IT22129376ConfirmJob', { quote: updatedQuote })}
        />
      }
    >
      {(quote.suggestedSlots || []).map((slot) => (
        <SuggestedSlotCard
          key={slot._id || slot.id}
          slot={slot}
          selected={(selectedSlot?._id || selectedSlot?.id) === (slot._id || slot.id)}
          loading={loadingSlotId === (slot._id || slot.id)}
          isDarkMode={isDarkMode}
          onSelect={() => handleSelect(slot)}
        />
      ))}
    </ScreenShell>
  );
}
