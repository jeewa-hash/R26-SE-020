import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
export default function DurationModelEvidence({ evaluation, isDark }) {
  const [expanded, setExpanded] = useState(false);
  const e = evaluation?.modelEvidence;
  const text = isDark ? '#F0FDF4' : '#182B20', muted = isDark ? '#B1C2B6' : '#58685E';
  const ml = e?.prediction && e.source === 'TRAINED_DURATION_MODEL';
  const prediction = e?.prediction, detail = prediction?.evidence;
  const entries = [['serviceCategory','Service category'],['serviceType','Service type'],['taskName','Task'],['yearsExperience','Experience (years)'],['taskFrequencyPerMonth','Task frequency / month'],['plannedTeamSize','Planned team size']];
  return <View style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderColor: isDark ? '#35483B' : '#DCE9E0', backgroundColor: isDark ? '#161F19' : '#FFFFFF' }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><Ionicons name="analytics-outline" size={22} color="#15803D" /><View style={{ flex: 1 }}><Text style={{ color: text, fontWeight: '700', fontSize: 16 }}>Duration estimate</Text><Text style={{ color: muted, fontSize: 12, marginTop: 4 }}>{e ? `${e.predictedDurationMins} minutes · ${ml ? 'Ridge model' : 'Reference fallback'}` : 'No captured model evidence for this quotation'}</Text></View><Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={muted} /></TouchableOpacity>
    {expanded && <View style={{ marginTop: 14, gap: 11 }}>
      <Text style={{ color: muted, lineHeight: 19, fontSize: 12 }}>This model estimates task duration. Availability, travel and delay feasibility are checked separately.</Text>
      {e ? <>
        {entries.map(([key,label]) => <View key={key} style={{ flexDirection: 'row', gap: 12 }}><Text style={{ color: muted, fontSize: 12, flex: 1 }}>{label}</Text><Text selectable style={{ color: text, fontSize: 12, flex: 1, textAlign: 'right' }}>{e.submittedPayload?.[key] == null ? 'Missing · model default' : `${e.submittedPayload[key]}${e.inputSources?.[key] ? ` · ${e.inputSources[key]}` : ''}`}</Text></View>)}
        {e.taskHistorySnapshot?.windowStart && <Text style={{ color: muted, fontSize: 12 }}>Recorded platform frequency: {e.taskHistorySnapshot.completedCount} matching completed jobs · {new Date(e.taskHistorySnapshot.windowStart).toLocaleDateString()} – {new Date(e.taskHistorySnapshot.windowEnd).toLocaleDateString()}. The model uses this platform activity as a monthly-frequency proxy; outside work is not included.</Text>}
        {e.capturedAt && <Text style={{ color: muted, fontSize: 12 }}>Captured: {new Date(e.capturedAt).toLocaleString()}</Text>}
        <Text selectable style={{ color: muted, fontSize: 12 }}>Model version: {e.modelVersion || 'Not used (fallback)'}</Text>
        <Text style={{ color: text, fontSize: 12 }}>Prediction: {e.predictedDurationMins} min + {e.bufferMinutes} min scheduling buffer</Text>
        {e.requiredWindowEnd && <Text style={{ color: text, fontSize: 12 }}>Finish at this model check (with buffer): {new Date(e.requiredWindowEnd).toLocaleString()}</Text>}
        {detail?.imputedFields?.length > 0 && <Text style={{ color: muted, lineHeight: 19, fontSize: 12 }}>Training median used for: {detail.imputedFields.join(', ')}. These are defaults, not collected provider values.</Text>}
        {detail?.unseenCategories?.length > 0 && <Text style={{ color: '#B45309', lineHeight: 19, fontSize: 12 }}>Outside training vocabulary: {detail.unseenCategories.join(', ')}. Treat this estimate with caution.</Text>}
        {detail?.effectiveInputs && <Text selectable style={{ color: muted, lineHeight: 19, fontSize: 11 }}>Effective model inputs: {JSON.stringify(detail.effectiveInputs, null, 2)}</Text>}
        {!ml && <Text style={{ color: '#B45309', fontSize: 12 }}>The trained model was not used for this result. This cannot be presented as a Ridge prediction.</Text>}
      </> : <Text style={{ color: muted, fontSize: 12 }}>Recheck availability to capture the actual input/output snapshot. Historical results are not reconstructed.</Text>}
    </View>}
  </View>;
}
