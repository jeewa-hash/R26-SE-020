import { validateProviderSchedule } from "./scheduleValidationService.js";

const pad = (value) => String(value).padStart(2, "0");

const formatDateToYMD = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const formatDateToHHMM = (date) => {
  const d = new Date(date);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/**
 * Validates the scheduling window using the duration supplied by the ML/fallback
 * duration pipeline. Manual provider/seeker duration estimates are not required.
 */
export const evaluateBidSchedule = async ({
  providerId,
  proposedStartTime,
  preferredStartTime,
  preferredEndTime,
  predictedDurationMins,
  durationPredictionSource = "ML_MODEL",
  durationModelVersion = null,
  bufferMinutes = 30,
}) => {
  const proposedStart = new Date(proposedStartTime);
  if (Number.isNaN(proposedStart.getTime())) throw new Error("Invalid proposedStartTime");

  const preferredStart = preferredStartTime ? new Date(preferredStartTime) : null;
  const preferredEnd = preferredEndTime ? new Date(preferredEndTime) : null;
  if (preferredStart && Number.isNaN(preferredStart.getTime())) throw new Error("Invalid preferredStartTime");
  if (preferredEnd && Number.isNaN(preferredEnd.getTime())) throw new Error("Invalid preferredEndTime");

  const durationMins = Number(predictedDurationMins);
  if (!(durationMins > 0)) {
    throw new Error("predictedDurationMins must be greater than 0");
  }

  const finalSchedulingDurationMins = Math.round(durationMins);
  const finalSchedulingDurationHours = Number((finalSchedulingDurationMins / 60).toFixed(2));
  const totalMinutes = finalSchedulingDurationMins + Number(bufferMinutes || 0);
  const requiredWindowStart = proposedStart;
  const requiredWindowEnd = new Date(proposedStart.getTime() + totalMinutes * 60 * 1000);

  let preferredTimeMatch = "NO_PREFERENCE_PROVIDED";
  if (preferredStart && preferredEnd) {
    preferredTimeMatch =
      proposedStart >= preferredStart && proposedStart <= preferredEnd
        ? "MATCHES_PREFERENCE"
        : "OUTSIDE_PREFERENCE";
  }

  const validation = await validateProviderSchedule({
    providerId,
    requestedDate: formatDateToYMD(requiredWindowStart),
    requestedStartTime: formatDateToHHMM(requiredWindowStart),
    requestedEndTime: formatDateToHHMM(requiredWindowEnd),
  });

  return {
    proposedStartTime: proposedStart,
    preferredStartTime: preferredStart,
    preferredEndTime: preferredEnd,
    preferredTimeMatch,

    // Final research fields
    predictedDurationMins: finalSchedulingDurationMins,
    predictedDurationHours: finalSchedulingDurationHours,
    durationPredictionSource,
    durationModelVersion,

    // Backward-compatible aliases consumed by existing booking/UI code.
    mlPredictedDurationMins: finalSchedulingDurationMins,
    mlPredictedDurationHours: finalSchedulingDurationHours,
    providerEstimatedDurationHours: null,
    providerEstimatedDurationMins: null,
    seekerEstimatedDurationHours: null,

    finalSchedulingDurationMins,
    finalSchedulingDurationHours,
    bufferMinutes: Number(bufferMinutes || 0),
    requiredWindowStart,
    requiredWindowEnd,
    conflictDetected: !validation.isValid,
    conflictReason: validation.isValid ? "" : validation.message,
    availabilityMessage: validation.message,
    providerBookingsToday: validation.providerBookingsToday || 0,
  };
};
