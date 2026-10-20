import { toScheduleParts } from '../utils/timeUtils.js';
import { validateRescheduleTime } from './rescheduleValidationService.js';

export async function suggestRescheduleSlots({ providerId, currentDate, estimatedDurationHours, booking = null, originalStartTime = null }) {
  const context = booking || { providerId };
  const proposed = originalStartTime ? new Date(originalStartTime) : new Date(`${currentDate}T08:00:00+05:30`);
  const anchor = new Date(Math.max(Number.isFinite(+proposed) ? +proposed : Date.now(), Date.now()));
  const suggestions = [];
  for (let day = 0; day < 7 && suggestions.length < 3; day++) {
    const date = toScheduleParts(new Date(+anchor + day * 86400000)).date;
    for (const time of ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00']) {
      const start = new Date(`${date}T${time}:00+05:30`);
      if (start <= anchor) continue;
      const validation = await validateRescheduleTime({ booking: context, startTime: start, durationHours: estimatedDurationHours });
      if (!validation.isValid) continue;
      suggestions.push({ date, startTime: time, endTime: toScheduleParts(new Date(+start + estimatedDurationHours * 3600000)).time, score: Math.max(0, 100 - day * 10), riskLevel: validation.warnings?.length ? 'UNKNOWN' : 'LOW', reason: validation.message });
      if (suggestions.length === 3) break;
    }
  }
  return suggestions;
}
