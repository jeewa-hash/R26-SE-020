import { addHoursToTime } from "../utils/timeUtils.js";
import { validateProviderSchedule } from "./scheduleValidationService.js";

function addDays(dateString, days) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

function calculateSlotScore({ dayOffset, startTime }) {
  let score = 100;

  // Earlier reschedule dates are better
  score -= dayOffset * 10;

  // Morning slots are usually safer
  if (startTime >= "08:00" && startTime <= "11:00") {
    score += 10;
  }

  // Late evening slots are slightly less preferred
  if (startTime >= "16:00") {
    score -= 10;
  }

  return Math.max(0, Math.min(score, 100));
}

export async function suggestRescheduleSlots({
  providerId,
  currentDate,
  estimatedDurationHours,
}) {
  const candidateStartTimes = ["08:00", "09:00", "10:00", "13:00", "14:00", "15:00"];
  const suggestedSlots = [];

  // Search next 7 days for valid slots
  for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
    const candidateDate = addDays(currentDate, dayOffset);

    for (const startTime of candidateStartTimes) {
      const endTime = addHoursToTime(startTime, estimatedDurationHours);

      const validation = await validateProviderSchedule({
        providerId,
        requestedDate: candidateDate,
        requestedStartTime: startTime,
        requestedEndTime: endTime,
      });

      if (validation.isValid) {
        suggestedSlots.push({
          date: candidateDate,
          startTime,
          endTime,
          score: calculateSlotScore({ dayOffset, startTime }),
          riskLevel: "LOW",
          reason: "Provider is available for this slot.",
        });
      }

      if (suggestedSlots.length >= 5) {
        return suggestedSlots;
      }
    }
  }

  return suggestedSlots;
}