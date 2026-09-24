const mapUrgencyToPriority = (urgencyLevel = "") => {
    const urgency = String(urgencyLevel).toLowerCase();
  
    if (
      urgency.includes("critical") ||
      urgency.includes("emergency") ||
      urgency.includes("urgent")
    ) {
      return 3;
    }
  
    if (urgency.includes("today") || urgency.includes("medium")) {
      return 2;
    }
  
    return 1;
  }; // Chaw: converts seeker urgency text into ML taskPriority
  
  export const buildDelayRiskPayload = ({
    requestQuotation,
    providerQuotation,
    scheduleEvaluation,
  }) => {
    const requestedCategory = String(
      requestQuotation.detectedCategory || requestQuotation.serviceCategory || ""
    ).trim().toLowerCase();
    const providerCategory = String(
      providerQuotation.serviceCategory || providerQuotation.category || ""
    ).trim().toLowerCase();
    const expertiseMatch = !requestedCategory || !providerCategory
      ? 1
      : Number(
          requestedCategory.includes(providerCategory) ||
          providerCategory.includes(requestedCategory)
        );

    return {
      expertiseMatch,
      taskPriority: mapUrgencyToPriority(requestQuotation.urgencyLevel),
      taskDuration: Number(
        scheduleEvaluation.finalSchedulingDurationHours ||
          providerQuotation.estimatedDurationHours ||
          1
      ),
      distanceBetweenBookingsKm: Number(scheduleEvaluation.distanceFromPreviousBookingKm || 0),
      estimatedTravelTimeMins: Number(scheduleEvaluation.estimatedTravelTimeMins || 0),
      gapBetweenBookingsMins: scheduleEvaluation.gapFromPreviousBookingMins ?? (scheduleEvaluation.conflictDetected ? 0 : 999),
      providerBookingsToday: Number(scheduleEvaluation.providerBookingsToday || 0),
    };
  };
  
  export const normalizeDelayRiskLevel = (mlResponse) => {
    const rawRisk =
      mlResponse?.riskLevel ||
      mlResponse?.risk_level ||
      mlResponse?.delayRiskLevel ||
      mlResponse?.delay_risk_level ||
      mlResponse?.prediction ||
      mlResponse?.risk ||
      "";
  
    const risk = String(rawRisk).toLowerCase();
  
    if (risk.includes("high")) return "High";
    if (risk.includes("medium")) return "Medium";
    if (risk.includes("low")) return "Low";
  
    return "NOT_CHECKED";
  }; // Chaw: supports different possible FastAPI response field names
