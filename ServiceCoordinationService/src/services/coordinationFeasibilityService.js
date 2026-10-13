/**
 * Deterministic delay-aware coordination assessment.
 * This is intentionally not an ML classifier.
 */
export function evaluateCoordinationFeasibility({
  gapFromPreviousBookingMins = null,
  estimatedTravelTimeMins = 0,
  minimumBufferMins = Number(process.env.MIN_SCHEDULING_BUFFER_MINS || 15),
}) {
  if (gapFromPreviousBookingMins === null || gapFromPreviousBookingMins === undefined) {
    return {
      coordinationStatus: "FEASIBLE",
      travelFeasible: true,
      effectiveBufferMins: null,
      minimumBufferMins,
      reason: "No previous booking constrains this appointment.",
    };
  }

  const gap = Number(gapFromPreviousBookingMins);
  const travel = Number(estimatedTravelTimeMins || 0);
  const effectiveBufferMins = gap - travel;

  if (effectiveBufferMins < 0) {
    return {
      coordinationStatus: "RESCHEDULE_REQUIRED",
      travelFeasible: false,
      effectiveBufferMins,
      minimumBufferMins,
      reason: `Travel requires ${travel} minutes but only ${gap} minutes are available.`,
    };
  }

  if (effectiveBufferMins < minimumBufferMins) {
    return {
      coordinationStatus: "CAUTION",
      travelFeasible: true,
      effectiveBufferMins,
      minimumBufferMins,
      reason: `Only ${effectiveBufferMins} minutes remain after travel; configured safety buffer is ${minimumBufferMins} minutes.`,
    };
  }

  return {
    coordinationStatus: "FEASIBLE",
    travelFeasible: true,
    effectiveBufferMins,
    minimumBufferMins,
    reason: `Schedule leaves ${effectiveBufferMins} minutes after estimated travel.`,
  };
}
