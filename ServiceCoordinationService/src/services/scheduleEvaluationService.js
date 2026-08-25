export const evaluateBidSchedule = ({
    proposedStartTime,
    preferredStartTime,
    preferredEndTime,
    providerEstimatedDurationHours,
    seekerEstimatedDurationHours,
    mlPredictedDurationHours = null,
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
  
    const finalSchedulingDurationHours = Math.max(...validDurations); // Chaw: use safer duration for first version
  
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
      conflictDetected: false, // Chaw: booking conflict check comes in next phase
      conflictReason: "",
      delayRiskLevel: "NOT_CHECKED",
    };
  };