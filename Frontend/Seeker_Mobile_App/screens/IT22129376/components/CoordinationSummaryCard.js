import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import StatusBadge from './StatusBadge';
import DelayRiskBadge from './DelayRiskBadge';
import { COLORS, toneColors } from '../theme';
import { mapCoordinationDecision } from '../utils/coordinationMapper';

export default function CoordinationSummaryCard({ decision, recommendedAction, conflictDetected, delayRiskLevel, isDarkMode }) {
  const mapped = mapCoordinationDecision(decision);
  const C = toneColors[mapped.tone] || toneColors.neutral;

  return (
    <View style={[styles.card, { borderColor: C.icon }, isDarkMode && styles.cardDark]}>
      <View style={styles.row}>
        <View style={[styles.iconCircle, { backgroundColor: C.bg }]}> 
          <MaterialIcons name={mapped.icon} size={30} color={C.icon} />
        </View>
        <View style={styles.textArea}>
          <Text style={[styles.title, isDarkMode && styles.textDark]}>{mapped.label}</Text>
          <Text style={[styles.message, isDarkMode && styles.mutedDark]}>{mapped.message}</Text>
        </View>
      </View>
      <View style={styles.badgeRow}>
        <StatusBadge
          label={conflictDetected ? 'Conflict Detected' : 'No Conflict'}
          tone={conflictDetected ? 'danger' : 'success'}
          icon={conflictDetected ? 'event-busy' : 'event-available'}
        />
        {delayRiskLevel ? <DelayRiskBadge riskLevel={delayRiskLevel} /> : null}
      </View>
      {recommendedAction ? <Text style={[styles.recommendation, isDarkMode && styles.mutedDark]}>{recommendedAction}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 22, padding: 16, borderWidth: 1.5, marginBottom: 14 },
  cardDark: { backgroundColor: COLORS.darkCard },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  iconCircle: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  textArea: { flex: 1 },
  title: { fontSize: 19, fontWeight: '900', color: COLORS.text },
  message: { color: COLORS.muted, fontSize: 13, lineHeight: 19, marginTop: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  recommendation: { marginTop: 12, fontSize: 13, lineHeight: 19, color: COLORS.muted, fontWeight: '600' },
  textDark: { color: COLORS.darkText },
  mutedDark: { color: COLORS.darkMuted },
});
