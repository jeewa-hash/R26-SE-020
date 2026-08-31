import { validateProviderSchedule } from "./scheduleValidationService.js";

const pad = (value) => String(value).padStart(2, "0"); // Chaw: format date/time values safely

const formatDateToYMD = (date) => {
  const d = new Date(date);

  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(
    d.getUTCDate()
  )}`;
}; // Chaw: convert proposed Date into YYYY-MM-DD for existing schedule validator

const formatDateToHHMM = (date) => {
  const d = new Date(date);

  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}; // Chaw: convert proposed Date into HH:mm for existing schedule validator

export const evaluateBidSchedule = async ({
  providerId,
  proposedStartTime,
  preferredStartTime,
  preferredEndTime,
  providerEstimatedDurationHours,
  seekerEstimatedDurationHours,
  mlPredictedDurationHours = null,
  delayRiskLevel = "NOT_CHECKED",
  bufferMinutes = 30,
}) => {
  const proposedStart = new Date(proposedStartTime);

  if (Number.isNaN(proposedStart.getTime())) {
    throw new Error("Invalid proposedStartTime");
  }

  const preferredStart = preferredStartTime ? new Date(preferredStartTime) : null;
  const preferredEnd = preferredEndTime ? new Date(preferredEndTime) : null;

  if (preferredStart && Number.isNaN(preferredStart.getTime())) {
    throw new Error("Invalid preferredStartTime");
  }

  if (preferredEnd && Number.isNaN(preferredEnd.getTime())) {
    throw new Error("Invalid preferredEndTime");
  }

  const providerDuration = Number(providerEstimatedDurationHours);

  if (!providerDuration || providerDuration <= 0) {
    throw new Error("providerEstimatedDurationHours must be greater than 0");
  }

  const seekerDuration =
    seekerEstimatedDurationHours === null ||
    seekerEstimatedDurationHours === undefined
      ? null
      : Number(seekerEstimatedDurationHours);

  const mlDuration =
    mlPredictedDurationHours === null || mlPredictedDurationHours === undefined
      ? null
      : Number(mlPredictedDurationHours);

  const validDurations = [providerDuration];

  if (seekerDuration && seekerDuration > 0) {
    validDurations.push(seekerDuration);
  }

  if (mlDuration && mlDuration > 0) {
    validDurations.push(mlDuration);
  }

  const finalSchedulingDurationHours = Math.max(...validDurations); // Chaw: use safer duration for schedule validation

  const totalMinutes =
    finalSchedulingDurationHours * 60 + Number(bufferMinutes || 0);

  const requiredWindowStart = proposedStart;
  const requiredWindowEnd = new Date(
    proposedStart.getTime() + totalMinutes * 60 * 1000
  );

  let preferredTimeMatch = "NO_PREFERENCE_PROVIDED";

  if (preferredStart && preferredEnd) {
    preferredTimeMatch =
      proposedStart >= preferredStart && proposedStart <= preferredEnd
        ? "MATCHES_PREFERENCE"
        : "OUTSIDE_PREFERENCE";
  }

  const requestedDate = formatDateToYMD(requiredWindowStart); // Chaw: date used by existing ProviderAvailability and Booking models
  const requestedStartTime = formatDateToHHMM(requiredWindowStart); // Chaw: start time used by existing validator
  const requestedEndTime = formatDateToHHMM(requiredWindowEnd); // Chaw: end time used by existing validator

  const validation = await validateProviderSchedule({
    providerId,
    requestedDate,
    requestedStartTime,
    requestedEndTime,
  }); // Chaw: validate against ProviderAvailability and existing Bookings

  return {
    proposedStartTime: proposedStart,
    preferredStartTime: preferredStart,
    preferredEndTime: preferredEnd,
    preferredTimeMatch,
    providerEstimatedDurationHours: providerDuration,
    seekerEstimatedDurationHours: seekerDuration,
    mlPredictedDurationHours: mlDuration,
    finalSchedulingDurationHours,
    bufferMinutes: Number(bufferMinutes || 0),
    requiredWindowStart,
    requiredWindowEnd,
    conflictDetected: !validation.isValid, // Chaw: mark conflict if schedule validator fails
    conflictReason: validation.isValid ? "" : validation.message, // Chaw: store readable conflict reason
    availabilityMessage: validation.message,
    delayRiskLevel,
    providerBookingsToday: validation.providerBookingsToday || 0,
  };
};
