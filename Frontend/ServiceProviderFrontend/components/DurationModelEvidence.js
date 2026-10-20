import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const duration = value => {
  if (value == null || !Number.isFinite(Number(value))) return 'Not available';
  const minutes = Math.round(Number(value));
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours} hr${remainder ? ` ${remainder} min` : ''}` : `${minutes} min`;
};
const localDate = value => {
  const date = new Date(value);
  return Number.isFinite(+date) ? date.toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
    hour12: true, timeZone: 'Asia/Colombo',
  }) : 'Not available';
};
const fieldNames = {
  service_category: 'service category', service_type: 'service type', task_name: 'task',
  years_experience: 'experience', task_frequency_per_month: 'recent job count', planned_team_size: 'team size',
};

export default function DurationModelEvidence({ evaluation, isDark }) {
  const [expanded, setExpanded] = useState(false);
  const [technical, setTechnical] = useState(false);
  const e = evaluation?.modelEvidence;
  const text = isDark ? '#F0FDF4' : '#182B20', muted = isDark ? '#B1C2B6' : '#58685E';
  const ml = Boolean(e?.prediction && e.source === 'TRAINED_DURATION_MODEL');
  const detail = e?.prediction?.evidence;
  const inputs = e?.submittedPayload || {};
  const row = (label, value) => <View key={label} style={{ gap: 4 }}>
    <Text style={{ color: muted, fontSize: 12 }}>{label}</Text>
    <Text selectable style={{ color: text, fontSize: 14, lineHeight: 21 }}>{value ?? 'Not provided'}</Text>
  </View>;
  const hasTiming = e?.predictedDurationMins != null && e?.bufferMinutes != null;
  return <View style={{ padding: 18, borderRadius: 18, borderWidth: 1, borderColor: isDark ? '#35483B' : '#DCE9E0', backgroundColor: isDark ? '#161F19' : '#FFFFFF' }}>
    <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }} onPress={() => setExpanded(!expanded)} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Ionicons name="analytics-outline" size={22} color="#15803D" />
      <View style={{ flex: 1 }}>
        <Text style={{ color: text, fontWeight: '700', fontSize: 16 }}>Duration estimate</Text>
        <Text style={{ color: muted, fontSize: 13, marginTop: 4 }}>{e ? `${duration(e.predictedDurationMins)} of work${e.bufferMinutes != null ? ` + ${duration(e.bufferMinutes)} buffer` : ''}` : 'Check availability to get an estimate'}</Text>
      </View>
      <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={19} color={muted} />
    </TouchableOpacity>
    {expanded && <View style={{ marginTop: 18, gap: 16 }}>
      {e ? <>
        <View style={{ padding: 14, borderRadius: 12, backgroundColor: isDark ? '#203D2A' : '#F0F8F2', gap: 8 }}>
          <Text style={{ color: text, fontSize: 17, fontWeight: '700' }}>{hasTiming ? `${duration(Number(e.predictedDurationMins) + Number(e.bufferMinutes))} reserved in your schedule` : 'Estimated time'}</Text>
          <Text style={{ color: muted, fontSize: 13, lineHeight: 20 }}>The buffer leaves extra time after the job. Travel between bookings is checked separately.</Text>
          {e.requiredWindowEnd ? <Text style={{ color: text, lineHeight: 21 }}>Expected finish, including buffer: {localDate(e.requiredWindowEnd)} (Sri Lanka time)</Text> : null}
        </View>
        {row('Job', inputs.taskName)}
        {row('Service', [inputs.serviceCategory, inputs.serviceType].filter(Boolean).join(' · ') || 'Not provided')}
        {row('Provider experience', inputs.yearsExperience == null ? 'Not provided — a model default was used' : `${inputs.yearsExperience} ${Number(inputs.yearsExperience) === 1 ? 'year' : 'years'}`)}
        {row('Similar jobs completed on WorkWave in the last 30 days', inputs.taskFrequencyPerMonth == null ? 'Not available — a model default was used' : `${inputs.taskFrequencyPerMonth} ${Number(inputs.taskFrequencyPerMonth) === 1 ? 'job' : 'jobs'}`)}
        <Text style={{ color: muted, fontSize: 12, lineHeight: 19 }}>This count includes WorkWave bookings only. Work completed outside the platform is not counted.</Text>
        {row('People working on this job', inputs.plannedTeamSize == null ? 'Not provided — a model default was used' : `${inputs.plannedTeamSize} ${Number(inputs.plannedTeamSize) === 1 ? 'person' : 'people'}`)}
        <Text style={{ color: muted, fontSize: 13, lineHeight: 20 }}>{ml ? 'Estimated using the duration prediction model. Actual job time may vary.' : 'A reference estimate was used because a model prediction was not available.'}</Text>
        {detail?.unseenCategories?.length > 0 ? <Text style={{ color: isDark ? '#FCD34D' : '#92400E', fontSize: 13, lineHeight: 20 }}>This {detail.unseenCategories.map(key => fieldNames[key] || key).join(', ')} was not in the model’s training examples, so the estimate may be less reliable.</Text> : null}
        {detail?.imputedFields?.length > 0 ? <Text style={{ color: muted, lineHeight: 20, fontSize: 13 }}>Some information was missing. Typical training values were used for: {detail.imputedFields.map(key => fieldNames[key] || key).join(', ')}.</Text> : null}
        {e.capturedAt ? <Text style={{ color: muted, fontSize: 12 }}>Last checked: {localDate(e.capturedAt)} (Sri Lanka time)</Text> : null}
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: technical }} onPress={() => setTechnical(!technical)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ color: muted, fontSize: 13 }}>Technical details</Text>
          <Ionicons name={technical ? 'chevron-up' : 'chevron-down'} size={18} color={muted} />
        </TouchableOpacity>
        {technical ? <View style={{ gap: 10 }}>
          {row('Prediction method', ml ? 'Ridge regression' : 'Reference fallback')}
          {row('Model version', e.modelVersion || 'Not used')}
          {row('Input sources', JSON.stringify(e.inputSources || {}, null, 2))}
          {row('Recorded model inputs', JSON.stringify(inputs, null, 2))}
          {detail?.effectiveInputs ? row('Inputs after model preprocessing', JSON.stringify(detail.effectiveInputs, null, 2)) : null}
          {e.taskHistorySnapshot ? row('Job history snapshot', JSON.stringify(e.taskHistorySnapshot, null, 2)) : null}
        </View> : null}
      </> : <Text style={{ color: muted, fontSize: 13, lineHeight: 20 }}>Check availability to see a fresh duration estimate and finish time.</Text>}
    </View>}
  </View>;
}
