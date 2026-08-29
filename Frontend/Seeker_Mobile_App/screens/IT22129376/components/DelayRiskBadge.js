import React from 'react';
import StatusBadge from './StatusBadge';
import { mapDelayRisk } from '../utils/coordinationMapper';

export default function DelayRiskBadge({ riskLevel }) {
  const mapped = mapDelayRisk(riskLevel);
  return <StatusBadge label={mapped.label} tone={mapped.tone} icon="speed" />;
}
