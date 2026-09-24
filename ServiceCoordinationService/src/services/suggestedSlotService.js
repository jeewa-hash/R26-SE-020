import { validateProviderSchedule } from "./scheduleValidationService.js";

const pad = (value) => String(value).padStart(2, "0");

const formatDateToYMD = (date) => {
  const d = new Date(date);

  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate()
  )}`;
};

const formatDateToHHMM = (date) => {
  const d = new Date(date);

  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const addMinutes = (date, minutes) => {
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
};

const buildSlotLabel = (slotStart, originalStart) => {
  const start = new Date(slotStart);
  const original = new Date(originalStart);

  const sameDate =
    start.getFullYear() === original.getFullYear() &&
    start.getMonth() === original.getMonth() &&
    start.getDate() === original.getDate();

  const hour = start.getHours();

  if (sameDate && hour < 12) return "Same day morning";
  if (sameDate && hour < 17) return "Same day afternoon";
  if (sameDate) return "Same day evening";

  if (hour < 12) return "Next available morning";
  if (hour < 17) return "Next available afternoon";

  return "Next available evening";
};

export const generateSuggestedSlots = async ({
  providerId,
  originalStartTime,
  finalSchedulingDurationHours,
  bufferMinutes = 30,
  maxSuggestions = 3,
}) => {
  const originalStart = new Date(originalStartTime);

  if (Number.isNaN(originalStart.getTime())) {
    throw new Error("Invalid originalStartTime");
  }

  const durationMinutes =
    Number(finalSchedulingDurationHours) * 60 + Number(bufferMinutes || 0);

  if (!durationMinutes || durationMinutes <= 0) {
    throw new Error("Invalid finalSchedulingDurationHours");
  }

  const suggestions = [];

  const candidateOffsetsInMinutes = [
    60,
    120,
    180,
    240,
    360,
    1440,
    1500,
    1560,
    2880,
    2940,
    3000,
  ]; // Chaw: tries later same day, next day, and day after

  for (const offset of candidateOffsetsInMinutes) {
    if (suggestions.length >= maxSuggestions) break;

    const slotStart = addMinutes(originalStart, offset);
    const slotEnd = addMinutes(slotStart, durationMinutes);

    const requestedDate = formatDateToYMD(slotStart);
    const requestedStartTime = formatDateToHHMM(slotStart);
    const requestedEndTime = formatDateToHHMM(slotEnd);

    const validation = await validateProviderSchedule({
      providerId,
      requestedDate,
      requestedStartTime,
      requestedEndTime,
    });

    if (validation.isValid) {
      suggestions.push({
        providerId,
        startTime: slotStart,
        endTime: slotEnd,
        label: buildSlotLabel(slotStart, originalStart),
        reason: "Provider is available during this alternative time window.",
        status: "AVAILABLE",
      });
    }
  }

  return suggestions;
};
